import { getProcedureMetadata } from "@rawr/hq-sdk";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { contract, createClient } from "../src/client";
import type { ScratchPolicyCheck } from "../src/service/model/dto/scratch-policy.dto";
import { evaluateScratchPolicy } from "../src/service/model/policy/scratch-policy";
import {
  RepoSyncUpstreamInputSchema,
  RepoSyncUpstreamResultSchema,
} from "../src/service/modules/repo/model/dto/repo-operations.dto";
import {
  StackDoctorResultSchema,
  StackDrainResultSchema,
} from "../src/service/modules/stack/model/dto/stack-operations.dto";
import { router } from "../src/service/router";
import { createClientOptions, createFakeResources } from "./helpers";

const cleanStatus = "## agent/devops...origin/agent/devops\n";
const worktrees = [
  "worktree /repo/rawr",
  "HEAD abc",
  "branch refs/heads/main",
  "",
  "worktree /repo/wt-agent-devops-old",
  "HEAD def",
  "branch refs/heads/agent/devops-old",
  "",
  "worktree /repo/other-devops-wt",
  "HEAD ghi",
  "branch refs/heads/agent/other",
].join("\n");

describe("@rawr/dev service shell", () => {
  it("keeps the public service boundary intact", () => {
    expect(typeof createClient).toBe("function");
    expect(createClient(createClientOptions())).toBeDefined();
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["stack", "repo", "worktree", "scratchPolicy"]);
    expect(Object.keys(contract.stack)).toEqual(["doctor", "drain"]);
    expect(Object.keys(contract.repo)).toEqual(["syncUpstream"]);
    expect(Object.keys(contract.worktree)).toEqual(["cleanup"]);
    expect(Object.keys(contract.scratchPolicy)).toEqual(["check"]);
  });

  it("inherits service metadata policy while preserving operation ownership", () => {
    expect(getProcedureMetadata(contract.scratchPolicy.check)).toEqual({
      idempotent: true,
      domain: "dev",
      audience: "internal",
      audit: "basic",
      entity: "scratchPolicy",
    });
    expect(getProcedureMetadata(contract.stack.doctor)).toEqual({
      idempotent: true,
      domain: "dev",
      audience: "internal",
      audit: "basic",
      entity: "stack",
    });
    expect(getProcedureMetadata(contract.stack.drain)).toEqual({
      idempotent: false,
      domain: "dev",
      audience: "internal",
      audit: "full",
      entity: "stack",
    });
    expect(getProcedureMetadata(contract.worktree.cleanup)).toEqual({
      idempotent: false,
      domain: "dev",
      audience: "internal",
      audit: "full",
      entity: "worktree",
    });
    expect(getProcedureMetadata(contract.repo.syncUpstream)).toEqual({
      idempotent: false,
      domain: "dev",
      audience: "internal",
      audit: "full",
      entity: "repo",
    });
  });

  it("keeps retired repo inspection fields outside the public contract", async () => {
    expect(Value.Check(RepoSyncUpstreamInputSchema, {})).toBe(true);
    expect(Value.Check(RepoSyncUpstreamInputSchema, { inspectAfter: true })).toBe(false);

    const { resources, calls } = createFakeResources();
    const client = createClient(createClientOptions({ resources }));
    await expect(
      client.repo.syncUpstream(
        // @ts-expect-error The retired inspection field is absent from the public contract.
        { inspectAfter: true },
        { context: { invocation: { traceId: "test.repo.invalid-input" } } }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(calls).toEqual([]);
  });
});

describe("@rawr/dev service behavior", () => {
  it("evaluates scratch observations without mutating their order", () => {
    const matches: ScratchPolicyCheck["matches"] = {
      planScratchPaths: ["/repo/z/PLAN_SCRATCH.md", "/repo/a/PLAN_SCRATCH.md"],
      workingPadPaths: ["/repo/z/WORKING_PAD.md", "/repo/a/WORKING_PAD.md"],
    };

    const result = evaluateScratchPolicy({ mode: "block", enforce: true }, matches);

    expect(result.matches.planScratchPaths).toEqual([
      "/repo/a/PLAN_SCRATCH.md",
      "/repo/z/PLAN_SCRATCH.md",
    ]);
    expect(result.matches.workingPadPaths).toEqual([
      "/repo/a/WORKING_PAD.md",
      "/repo/z/WORKING_PAD.md",
    ]);
    expect(result.missing).toEqual([]);
    expect(result.blocked).toBe(false);
    expect(matches.planScratchPaths).toEqual([
      "/repo/z/PLAN_SCRATCH.md",
      "/repo/a/PLAN_SCRATCH.md",
    ]);
    expect(matches.workingPadPaths).toEqual(["/repo/z/WORKING_PAD.md", "/repo/a/WORKING_PAD.md"]);
  });

  it("feeds recursive scratch observation into every active policy mode", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const { resources } = createFakeResources({
      dirs: {
        "/repo/rawr/docs/projects": [
          { name: "nested", isDirectory: true },
          { name: "PLAN_SCRATCH.md", isDirectory: false },
        ],
        "/repo/rawr/docs/projects/nested": [
          { name: "PERSONAL_WORKING_PAD.md", isDirectory: false },
        ],
      },
    });
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    for (const mode of ["warn", "block"] as const) {
      const result = await client.scratchPolicy.check(
        { mode, enforce: true },
        { context: { invocation: { traceId: `test.scratch.${mode}` } } }
      );

      expect(result).toEqual({
        mode,
        bypassed: false,
        blocked: false,
        missing: [],
        required: { planScratch: true, workingPad: true },
        matches: {
          planScratchPaths: ["/repo/rawr/docs/projects/PLAN_SCRATCH.md"],
          workingPadPaths: ["/repo/rawr/docs/projects/nested/PERSONAL_WORKING_PAD.md"],
        },
      });
    }

    expect(
      analyticsEntries.map(({ event, payload }) => ({
        event,
        path: payload.path,
        outcome: payload.outcome,
        traceId: payload.analytics_trace_id,
      }))
    ).toEqual([
      {
        event: "orpc.procedure",
        path: "scratchPolicy.check",
        outcome: "success",
        traceId: "test.scratch.warn",
      },
      {
        event: "orpc.procedure",
        path: "scratchPolicy.check",
        outcome: "success",
        traceId: "test.scratch.block",
      },
    ]);
    expect(
      logEntries.map(({ level, event, payload }) => ({
        level,
        event,
        path: payload.path,
        outcome: payload.outcome,
        traceId: payload.invocationTraceId,
        entity: payload.entity,
      }))
    ).toEqual([
      {
        level: "info",
        event: "dev.procedure",
        path: "scratchPolicy.check",
        outcome: "success",
        traceId: "test.scratch.warn",
        entity: "scratchPolicy",
      },
      {
        level: "info",
        event: "dev.procedure",
        path: "scratchPolicy.check",
        outcome: "success",
        traceId: "test.scratch.block",
        entity: "scratchPolicy",
      },
    ]);
  });

  it("does not observe the filesystem when scratch policy is off or bypassed", async () => {
    const { resources } = createFakeResources();
    let reads = 0;
    resources.fs.readDir = async () => {
      reads += 1;
      throw new Error("scratch observation should not run");
    };
    const client = createClient(createClientOptions({ resources }));

    const off = await client.scratchPolicy.check(
      { mode: "off" },
      { context: { invocation: { traceId: "test.scratch.off" } } }
    );
    const bypassed = await client.scratchPolicy.check(
      { bypassed: true },
      { context: { invocation: { traceId: "test.scratch.bypassed" } } }
    );

    expect(off.mode).toBe("off");
    expect(bypassed).toMatchObject({ mode: "off", bypassed: true });
    expect(reads).toBe(0);
  });

  it("reports one error lifecycle without replacing scratch observation failures", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const failure = new Error("scratch observation failed");
    const { resources } = createFakeResources();
    resources.fs.readDir = async () => {
      throw failure;
    };
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    await expect(
      client.scratchPolicy.check({}, { context: { invocation: { traceId: "test.scratch.error" } } })
    ).rejects.toBe(failure);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "scratchPolicy.check",
        outcome: "error",
        analytics_trace_id: "test.scratch.error",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "error",
      event: "dev.procedure",
      payload: {
        path: "scratchPolicy.check",
        outcome: "error",
        invocationTraceId: "test.scratch.error",
        entity: "scratchPolicy",
        errorName: "Error",
        errorMessage: failure.message,
      },
    });
  });

  it("reports one success lifecycle for a healthy stack diagnosis", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
      ],
    });
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    const result = await client.stack.doctor(
      { repo: "rawr-hq-template" },
      { context: { invocation: { traceId: "test.stack.doctor" } } }
    );

    expect(result).toMatchObject({
      repo: "rawr-hq-template",
      report: {
        status: "HEALTHY",
        branch: "agent/devops",
        checks: {
          dirtyWorkingTree: false,
          detachedHead: false,
          graphiteAvailable: true,
          worktreeListReadable: true,
          graphShowsStack: true,
        },
      },
    });
    expect(Value.Check(StackDoctorResultSchema, result)).toBe(true);
    expect(calls).toEqual([
      { command: "git", args: ["status", "--short", "--branch"], cwd: "/repo/rawr" },
      { command: "gt", args: ["ls"], cwd: "/repo/rawr" },
      {
        command: "git",
        args: ["worktree", "list", "--porcelain"],
        cwd: "/repo/rawr",
      },
    ]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "stack.doctor",
        outcome: "success",
        analytics_trace_id: "test.stack.doctor",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "info",
      event: "dev.procedure",
      payload: {
        path: "stack.doctor",
        outcome: "success",
        invocationTraceId: "test.stack.doctor",
        entity: "stack",
      },
    });
  });

  it("plans stack drain by default and does not run mutating Graphite commands", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
      ],
    });
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    const result = await client.stack.drain(
      {},
      { context: { invocation: { traceId: "test.stack.drain" } } }
    );

    expect(result.action).toBe("planned");
    expect(result.preflight.ok).toBe(true);
    expect(result.cycles).toEqual([]);
    expect(
      result.plannedCommands.map(({ command, args, status }) => ({ command, args, status }))
    ).toEqual([
      {
        command: "gt",
        args: ["ss", "--publish", "--stack", "--ai", "--no-interactive"],
        status: "planned",
      },
      { command: "gt", args: ["merge", "--no-interactive"], status: "planned" },
      {
        command: "gt",
        args: ["sync", "--no-restack", "--no-interactive"],
        status: "planned",
      },
      { command: "gt", args: ["ls"], status: "planned" },
    ]);
    expect(Value.Check(StackDrainResultSchema, result)).toBe(true);
    expect(calls).toEqual([
      { command: "git", args: ["status", "--short", "--branch"], cwd: "/repo/rawr" },
      { command: "gt", args: ["ls"], cwd: "/repo/rawr" },
    ]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "stack.drain",
        outcome: "success",
        analytics_trace_id: "test.stack.drain",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "info",
      event: "dev.procedure",
      payload: {
        path: "stack.drain",
        outcome: "success",
        invocationTraceId: "test.stack.drain",
        entity: "stack",
      },
    });
  });

  it("blocks applied stack drain on missing scratch without blocking a dry run", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const planned = await client.stack.drain(
      { scratchPolicy: { mode: "block" } },
      { context: { invocation: { traceId: "test.stack.drain.scratch-plan" } } }
    );
    const blocked = await client.stack.drain(
      { apply: true, scratchPolicy: { mode: "block" } },
      { context: { invocation: { traceId: "test.stack.drain.scratch-block" } } }
    );

    expect(planned.preflight.ok).toBe(true);
    expect(blocked.preflight).toMatchObject({
      ok: false,
      issues: [{ code: "SCRATCH_POLICY_BLOCKED" }],
    });
    expect(calls.map((call) => `${call.command} ${call.args.join(" ")}`)).not.toContain(
      "gt ss --publish --stack --ai --no-interactive"
    );
  });

  it("stops applied stack drain after a failed publish step", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
        {
          command: "gt",
          args: ["ss", "--publish", "--stack", "--ai", "--no-interactive"],
          exitCode: 1,
          stderr: "publish failed",
        },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.stack.drain(
      { apply: true },
      { context: { invocation: { traceId: "test.stack.drain.apply-fail" } } }
    );

    expect(result.action).toBe("applied");
    expect(result.execution.ok).toBe(false);
    expect(result.execution.issues[0]?.code).toBe("STACK_DRAIN_COMMAND_FAILED");
    expect(result.cycles[0]?.publish).toMatchObject({
      status: "failed",
      exitCode: 1,
      stderr: "publish failed",
    });
    const rendered = calls.map((call) => `${call.command} ${call.args.join(" ")}`);
    expect(rendered).not.toContain("gt merge --no-interactive");
    expect(rendered).not.toContain("gt sync --no-restack --no-interactive");
  });

  it("reports thrown process adapter errors as failed command steps", async () => {
    const { resources } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
        {
          command: "gt",
          args: ["ss", "--publish", "--stack", "--ai", "--no-interactive"],
          throws: "spawn gt ENOENT",
        },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.stack.drain(
      { apply: true },
      { context: { invocation: { traceId: "test.stack.drain.adapter-throw" } } }
    );

    expect(result.execution.ok).toBe(false);
    expect(result.cycles[0]?.publish.status).toBe("failed");
    expect(result.cycles[0]?.publish.exitCode).toBeNull();
    expect(result.cycles[0]?.publish.stderr).toContain("spawn gt ENOENT");
    expect(result.execution.issues[0]?.code).toBe("STACK_DRAIN_COMMAND_FAILED");
  });

  it("reports one error lifecycle without replacing stack admission failures", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const failure = new Error("stack scratch observation failed");
    const { resources, calls } = createFakeResources();
    resources.fs.readDir = async () => {
      throw failure;
    };
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    await expect(
      client.stack.drain(
        { apply: true, scratchPolicy: { mode: "block" } },
        { context: { invocation: { traceId: "test.stack.error" } } }
      )
    ).rejects.toBe(failure);
    expect(calls).toEqual([]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "stack.drain",
        outcome: "error",
        analytics_trace_id: "test.stack.error",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "error",
      event: "dev.procedure",
      payload: {
        path: "stack.drain",
        outcome: "error",
        invocationTraceId: "test.stack.error",
        entity: "stack",
        errorName: "Error",
        errorMessage: failure.message,
      },
    });
  });

  it("resolves repo sync to origin/main by default and fails missing refs before mutation", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["config", "--get", "rawr.upstreamRef"], exitCode: 1 },
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        {
          command: "git",
          args: ["rev-parse", "--verify", "origin/main"],
          exitCode: 1,
          stderr: "missing",
        },
        {
          command: "git",
          args: ["show-ref", "--verify", "refs/heads/chore/upstream-sync-20260508123456"],
          exitCode: 1,
        },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.repo.syncUpstream(
      { apply: true },
      { context: { invocation: { traceId: "test.repo.sync" } } }
    );

    expect(result.action).toBe("planned");
    expect(result.upstreamRef).toEqual({ ref: "origin/main", source: "default" });
    expect(result.preflight.ok).toBe(false);
    expect(result.preflight.issues.some((issue) => issue.code === "UPSTREAM_REF_MISSING")).toBe(
      true
    );
    expect(result).not.toHaveProperty("followUpCommands");
    expect(Value.Check(RepoSyncUpstreamResultSchema, result)).toBe(true);
    expect(Value.Check(RepoSyncUpstreamResultSchema, { ...result, followUpCommands: [] })).toBe(
      false
    );
    expect(calls.map((call) => call.args.join(" "))).not.toContain(
      "switch -c chore/upstream-sync-20260508123456"
    );
  });

  it("requires Graphite readability before repo sync mutation", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["config", "--get", "rawr.upstreamRef"], exitCode: 1 },
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "git", args: ["rev-parse", "--verify", "origin/main"], stdout: "abc\n" },
        {
          command: "git",
          args: ["show-ref", "--verify", "refs/heads/chore/upstream-sync-20260508123456"],
          exitCode: 1,
        },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
        { command: "gt", args: ["ls"], exitCode: 1, stderr: "no graphite" },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.repo.syncUpstream(
      { apply: true },
      { context: { invocation: { traceId: "test.repo.graphite-missing" } } }
    );

    expect(result.action).toBe("planned");
    expect(result.preflight.ok).toBe(false);
    expect(result.preflight.issues.some((issue) => issue.code === "GRAPHITE_UNAVAILABLE")).toBe(
      true
    );
    const rendered = calls.map((call) => `${call.command} ${call.args.join(" ")}`);
    expect(rendered).not.toContain("git fetch --all --prune");
    expect(rendered.some((line) => line.startsWith("git switch -c"))).toBe(false);
  });

  it("reports applied repo sync command failures through execution status", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["config", "--get", "rawr.upstreamRef"], exitCode: 1 },
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "git", args: ["rev-parse", "--verify", "origin/main"], stdout: "abc\n" },
        {
          command: "git",
          args: ["show-ref", "--verify", "refs/heads/chore/upstream-sync-20260508123456"],
          exitCode: 1,
        },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
        { command: "git", args: ["fetch", "--all", "--prune"], stdout: "" },
        {
          command: "git",
          args: ["switch", "-c", "chore/upstream-sync-20260508123456"],
          stdout: "",
        },
        {
          command: "git",
          args: ["merge", "--no-ff", "origin/main"],
          exitCode: 1,
          stderr: "merge failed",
        },
      ],
    });
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    const result = await client.repo.syncUpstream(
      { apply: true },
      { context: { invocation: { traceId: "test.repo.apply-fail" } } }
    );

    expect(result.execution.ok).toBe(false);
    expect(result.execution.issues[0]?.code).toBe("REPO_SYNC_COMMAND_FAILED");
    expect(result.steps.map((step) => step.status)).toEqual([
      "succeeded",
      "succeeded",
      "failed",
      "skipped",
      "skipped",
    ]);
    const rendered = calls.map((call) => `${call.command} ${call.args.join(" ")}`);
    const mutationStart = rendered.indexOf("git fetch --all --prune");
    expect(mutationStart).toBeGreaterThanOrEqual(0);
    expect(rendered.slice(mutationStart)).toEqual([
      "git fetch --all --prune",
      "git switch -c chore/upstream-sync-20260508123456",
      "git merge --no-ff origin/main",
    ]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "repo.syncUpstream",
        outcome: "success",
        analytics_trace_id: "test.repo.apply-fail",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "info",
      event: "dev.procedure",
      payload: {
        path: "repo.syncUpstream",
        outcome: "success",
        invocationTraceId: "test.repo.apply-fail",
        entity: "repo",
      },
    });
  });

  it("reports one error lifecycle without replacing repo admission failures", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const failure = new Error("repo admission failed");
    const { resources, calls } = createFakeResources();
    resources.fs.readDir = async () => {
      throw failure;
    };
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    await expect(
      client.repo.syncUpstream(
        { apply: true, upstreamRef: "origin/main" },
        { context: { invocation: { traceId: "test.repo.error" } } }
      )
    ).rejects.toBe(failure);
    expect(calls).toEqual([]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "repo.syncUpstream",
        outcome: "error",
        analytics_trace_id: "test.repo.error",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "error",
      event: "dev.procedure",
      payload: {
        path: "repo.syncUpstream",
        outcome: "error",
        invocationTraceId: "test.repo.error",
        entity: "repo",
        errorName: "Error",
        errorMessage: failure.message,
      },
    });
  });

  it("uses strict basename prefix for worktree cleanup and never plans prune", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "pwd", args: ["-P"], stdout: "/repo/rawr\n" },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
        {
          command: "git",
          args: ["branch", "--merged", "main", "--list", "agent/devops-old"],
          stdout: "agent/devops-old\n",
        },
      ],
    });
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    const result = await client.worktree.cleanup(
      { prefix: "wt-agent", apply: false },
      { context: { invocation: { traceId: "test.worktree.cleanup" } } }
    );

    expect(result.action).toBe("planned");
    expect(result.candidates.map((candidate) => candidate.path)).toEqual([
      "/repo/wt-agent-devops-old",
    ]);
    expect(result.removed).toEqual([]);
    expect(result.followUpCommands.map((command) => command.args.join(" "))).not.toContain(
      "worktree prune"
    );
    expect(calls.map((call) => `${call.command} ${call.args.join(" ")}`)).not.toContain(
      "git worktree remove /repo/wt-agent-devops-old"
    );
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "worktree.cleanup",
        outcome: "success",
        analytics_trace_id: "test.worktree.cleanup",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "info",
      event: "dev.procedure",
      payload: {
        path: "worktree.cleanup",
        outcome: "success",
        invocationTraceId: "test.worktree.cleanup",
        entity: "worktree",
      },
    });
  });

  it("reports failed worktree removals through execution status", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "pwd", args: ["-P"], stdout: "/repo/rawr\n" },
        { command: "git", args: ["worktree", "list", "--porcelain"], stdout: worktrees },
        {
          command: "git",
          args: ["branch", "--merged", "main", "--list", "agent/devops-old"],
          stdout: "agent/devops-old\n",
        },
        {
          command: "git",
          args: ["worktree", "remove", "/repo/wt-agent-devops-old"],
          exitCode: 1,
          stderr: "remove failed",
        },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.worktree.cleanup(
      { prefix: "wt-agent", apply: true },
      { context: { invocation: { traceId: "test.worktree.apply-fail" } } }
    );

    expect(result.execution.ok).toBe(false);
    expect(result.execution.issues[0]?.code).toBe("WORKTREE_REMOVE_FAILED");
    expect(result.removed).toEqual([
      {
        command: "git",
        args: ["worktree", "remove", "/repo/wt-agent-devops-old"],
        status: "failed",
        exitCode: 1,
        stdout: "",
        stderr: "remove failed",
      },
    ]);
    expect(
      calls.filter(
        ({ command, args }) =>
          command === "git" && args.join(" ") === "worktree remove /repo/wt-agent-devops-old"
      )
    ).toHaveLength(1);
  });

  it("reports one error lifecycle without replacing worktree admission failures", async () => {
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const failure = new Error("worktree admission failed");
    const { resources, calls } = createFakeResources();
    resources.fs.readDir = async () => {
      throw failure;
    };
    const client = createClient(
      createClientOptions({
        resources,
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: analyticsEntries }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: logEntries }),
      })
    );

    await expect(
      client.worktree.cleanup(
        { prefix: "wt-agent", apply: true },
        { context: { invocation: { traceId: "test.worktree.error" } } }
      )
    ).rejects.toBe(failure);
    expect(calls).toEqual([]);
    expect(analyticsEntries).toHaveLength(1);
    expect(analyticsEntries[0]).toMatchObject({
      event: "orpc.procedure",
      payload: {
        path: "worktree.cleanup",
        outcome: "error",
        analytics_trace_id: "test.worktree.error",
      },
    });
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]).toMatchObject({
      level: "error",
      event: "dev.procedure",
      payload: {
        path: "worktree.cleanup",
        outcome: "error",
        invocationTraceId: "test.worktree.error",
        entity: "worktree",
        errorName: "Error",
        errorMessage: failure.message,
      },
    });
  });
});
