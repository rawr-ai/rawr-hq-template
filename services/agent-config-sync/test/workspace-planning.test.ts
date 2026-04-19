import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { createClientOptions, createNodeTestResources } from "./helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeWorkspace() {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-workspace-plan-"));
  const pluginRoot = path.join(workspaceRoot, "plugins", "cli", "plugin-demo");
  tempDirs.push(workspaceRoot);
  await fs.writeFile(path.join(workspaceRoot, "package.json"), JSON.stringify({ name: "workspace" }), "utf8");
  await fs.mkdir(path.join(pluginRoot, "workflows"), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, "package.json"),
    JSON.stringify({
      name: "@rawr/plugin-demo",
      version: "1.0.0",
      rawr: { kind: "toolkit", capability: "demo" },
    }),
    "utf8",
  );
  await fs.writeFile(path.join(pluginRoot, "workflows", "hello.md"), "# hello\n", "utf8");
  return { workspaceRoot, pluginRoot };
}

function targetHomeCandidates(codexHome: string) {
  return {
    codexHomesFromFlags: [],
    claudeHomesFromFlags: [],
    codexHomesFromEnvironment: [],
    claudeHomesFromEnvironment: [],
    codexHomesFromConfig: [{ rootPath: codexHome, enabled: true }],
    claudeHomesFromConfig: [],
    codexDefaultHomes: [],
    claudeDefaultHomes: [],
  };
}

describe("agent-config-sync workspace planning", () => {
  it("discovers workspace sources and assesses drift through service planning", async () => {
    const { workspaceRoot, pluginRoot } = await makeWorkspace();
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-plan-codex-"));
    tempDirs.push(codexHome);

    const client = createClient(createClientOptions({
      repoRoot: workspaceRoot,
      resources: createNodeTestResources(),
    }));

    const plan = await client.planning.planWorkspaceSync({
      cwd: workspaceRoot,
      sourcePaths: [],
      includeMetadata: true,
      scope: "toolkit",
      agent: "codex",
      targetHomeCandidates: targetHomeCandidates(codexHome),
      includeAgentsInCodex: false,
      includeAgentsInClaude: true,
      fullSyncPolicy: {
        agent: "codex",
        scope: "toolkit",
        coworkEnabled: true,
        claudeInstallEnabled: true,
        claudeEnableEnabled: true,
        installReconcileEnabled: true,
        retireOrphansEnabled: true,
        force: true,
        gc: true,
        allowPartial: true,
      },
    }, { context: { invocation: { traceId: "test-workspace-plan" } } });

    expect(plan.workspaceRoot).toBe(workspaceRoot);
    expect(plan.syncable).toHaveLength(1);
    expect(plan.syncable[0]?.sourcePlugin).toMatchObject({
      dirName: "plugin-demo",
      absPath: pluginRoot,
      rawrKind: "toolkit",
    });
    expect(plan.targetHomes.codexHomes).toEqual([codexHome]);
    expect(plan.assessment.status).toBe("DRIFT_DETECTED");
    expect(plan.assessment.summary.totalPlugins).toBe(1);
    expect(plan.fullSyncPolicy.allowed).toBe(true);
    expect(plan.fullSyncPolicy.partialReasons).toContain("agent=codex");
  });

  it("reports blocked full sync policy without duplicating CLI checks", async () => {
    const client = createClient(createClientOptions({ resources: createNodeTestResources() }));

    const policy = await client.planning.evaluateFullSyncPolicy({
      agent: "all",
      scope: "all",
      coworkEnabled: false,
      claudeInstallEnabled: true,
      claudeEnableEnabled: true,
      installReconcileEnabled: true,
      retireOrphansEnabled: true,
      force: true,
      gc: true,
      allowPartial: false,
    }, { context: { invocation: { traceId: "test-full-sync-policy" } } });

    expect(policy.allowed).toBe(false);
    expect(policy.partialReasons).toEqual(["cowork disabled"]);
    expect(policy.failure?.code).toBe("PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL");
  });
});
