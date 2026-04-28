import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { createClientOptions, invocation } from "./helpers";

describe("hq-ops pluginLifecycle", () => {
  it("resolves plugin targets from observed workspace plugins", async () => {
    const repoRoot = "/tmp/rawr-hq";
    const client = createClient(createClientOptions({ repoRoot }));

    const result = await client.pluginLifecycle.resolveLifecycleTarget(
      {
        workspaceRoot: repoRoot,
        target: "@rawr/plugin-demo",
        type: "cli",
        workspacePlugins: [
          {
            id: "@rawr/plugin-demo",
            name: "@rawr/plugin-demo",
            dirName: "demo",
            absPath: path.join(repoRoot, "plugins", "cli", "demo"),
            kind: "toolkit",
            capability: "demo",
          },
        ],
      },
      invocation("trace-lifecycle-resolve"),
    );

    expect(result.found).toBe(true);
    expect(result.target?.relPath).toBe("plugins/cli/demo");
  });

  it("evaluates lifecycle completeness from observed git/dependent inputs", async () => {
    const repoRoot = "/tmp/rawr-hq";
    const client = createClient(createClientOptions({ repoRoot }));

    const failed = await client.pluginLifecycle.evaluateLifecycleCompleteness(
      {
        workspaceRoot: repoRoot,
        targetInput: "demo",
        targetAbs: path.join(repoRoot, "plugins", "cli", "demo"),
        type: "cli",
        changedFiles: ["plugins/cli/demo/src/index.ts"],
        repoFiles: ["plugins/cli/demo/src/index.ts", "docs/system/DEMO.md"],
        dependentFiles: ["docs/system/DEMO.md"],
        syncVerified: true,
        driftVerified: true,
        driftDetected: false,
      },
      invocation("trace-lifecycle-fail"),
    );

    expect(failed.status).toBe("fail");
    expect(failed.missingTests).toEqual(["no test updates detected for code changes"]);
    expect(failed.missingDocs).toEqual(["no documentation updates detected for changed unit"]);
    expect(failed.missingDependents).toEqual(["docs/system/DEMO.md"]);

    const passed = await client.pluginLifecycle.evaluateLifecycleCompleteness(
      {
        workspaceRoot: repoRoot,
        targetInput: "demo",
        targetAbs: path.join(repoRoot, "plugins", "cli", "demo"),
        type: "cli",
        changedFiles: [
          "plugins/cli/demo/src/index.ts",
          "plugins/cli/demo/test/plugin.test.ts",
          "plugins/cli/demo/README.md",
          "docs/system/DEMO.md",
        ],
        repoFiles: [
          "plugins/cli/demo/src/index.ts",
          "plugins/cli/demo/test/plugin.test.ts",
          "plugins/cli/demo/README.md",
          "docs/system/DEMO.md",
        ],
        dependentFiles: ["docs/system/DEMO.md"],
        syncVerified: true,
        driftVerified: true,
        driftDetected: false,
      },
      invocation("trace-lifecycle-pass"),
    );

    expect(passed.status).toBe("pass");
  });

  it("normalizes scratch policy and merge decisions", async () => {
    const repoRoot = "/tmp/rawr-hq";
    const client = createClient(createClientOptions({ repoRoot }));

    const scratch = await client.pluginLifecycle.checkScratchPolicy(
      {
        mode: "block",
        planScratchPaths: [],
        workingPadPaths: ["/tmp/rawr-hq/docs/projects/x/WORKING_PAD.md"],
      },
      invocation("trace-scratch"),
    );

    expect(scratch.mode).toBe("block");
    expect(scratch.missing).toEqual(["PLAN_SCRATCH.md"]);

    const lifecycle = await client.pluginLifecycle.evaluateLifecycleCompleteness(
      {
        workspaceRoot: repoRoot,
        targetInput: "demo",
        targetAbs: path.join(repoRoot, "plugins", "cli", "demo"),
        type: "cli",
        changedFiles: ["plugins/cli/demo/src/index.ts"],
        repoFiles: ["plugins/cli/demo/src/index.ts"],
        syncVerified: true,
        driftVerified: true,
        driftDetected: false,
      },
      invocation("trace-policy-lifecycle"),
    );

    const decision = await client.pluginLifecycle.decideMergePolicy(
      {
        lifecycle,
        prContext: { branch: "agent-demo", commentsCount: 0 },
        judgeA: { outcome: "auto_merge", confidence: 0.9, reason: "clean" },
        judgeB: { outcome: "auto_merge", confidence: 0.8, reason: "clean" },
        baseBranch: "agent-demo",
        changeUnitId: "cli:demo",
        nowIso: "2026-04-19T12:00:00.000Z",
      },
      invocation("trace-policy-decision"),
    );

    expect(decision.decision).toBe("fix_first");
    expect(decision.fixSlicePlan?.branchName).toBe("agent-demo-fix-cli-demo-20260419120000");
  });

  it("plans sweep candidates from the service-owned plugin catalog", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-lifecycle-sweep-"));
    await fs.mkdir(path.join(repoRoot, "plugins", "cli", "demo"), { recursive: true });
    await fs.writeFile(
      path.join(repoRoot, "plugins", "cli", "demo", "package.json"),
      JSON.stringify({
        name: "@rawr/plugin-demo",
        rawr: { kind: "toolkit", capability: "demo" },
        oclif: { commands: "./dist/commands", typescript: { commands: "./src/commands" } },
      }),
      "utf8",
    );

    const client = createClient(createClientOptions({ repoRoot }));
    const result = await client.pluginLifecycle.planSweepCandidates(
      {
        workspaceRoot: repoRoot,
        limit: 10,
      },
      invocation("trace-lifecycle-sweep"),
    );

    expect(result.queued).toEqual([
      {
        target: path.join(repoRoot, "plugins", "cli", "demo"),
        type: "cli",
        issues: ["missing README.md", "missing test/ directory"],
      },
    ]);
  });
});
