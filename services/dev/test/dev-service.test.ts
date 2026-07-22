import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { contract } from "../src/service/contract";
import { router } from "../src/router";
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
});

describe("@rawr/dev service behavior", () => {
  it("plans stack drain by default and does not run mutating Graphite commands", async () => {
    const { resources, calls } = createFakeResources({
      commands: [
        { command: "git", args: ["status", "--short", "--branch"], stdout: cleanStatus },
        { command: "gt", args: ["ls"], stdout: "◉ agent/devops\n" },
      ],
    });
    const client = createClient(createClientOptions({ resources }));

    const result = await client.stack.drain(
      {},
      { context: { invocation: { traceId: "test.stack.drain" } } }
    );

    expect(result.action).toBe("planned");
    expect(result.preflight.ok).toBe(true);
    expect(calls.map((call) => [call.command, call.args.join(" ")])).not.toContainEqual([
      "gt",
      "ss --publish --stack --ai --no-interactive",
    ]);
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
    const { resources } = createFakeResources({
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
    const client = createClient(createClientOptions({ resources }));

    const result = await client.repo.syncUpstream(
      { apply: true },
      { context: { invocation: { traceId: "test.repo.apply-fail" } } }
    );

    expect(result.execution.ok).toBe(false);
    expect(result.execution.issues[0]?.code).toBe("REPO_SYNC_COMMAND_FAILED");
  });

  it("uses strict basename prefix for worktree cleanup and never plans prune", async () => {
    const { resources } = createFakeResources({
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
    const client = createClient(createClientOptions({ resources }));

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
  });

  it("reports failed worktree removals through execution status", async () => {
    const { resources } = createFakeResources({
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
  });
});
