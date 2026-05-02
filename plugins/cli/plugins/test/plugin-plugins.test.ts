import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import {
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  resolveSourceWorkspaceSelection,
} from "../src/lib/agent-config-sync";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("@rawr/plugin-plugins", () => {
  it("keeps sweep candidate classification out of the projection command", async () => {
    const commandSource = await fs.readFile(
      path.join(testDir, "..", "src", "commands", "plugins", "sweep.ts"),
      "utf8",
    );

    expect(commandSource).toContain("planSweepCandidates");
    expect(commandSource).not.toContain("inferTypeFromPath");
  });

  it("selects an external source workspace without treating sync.sources.paths as workspace authority", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-source-workspace-"));
    tempDirs.push(root);
    const invocationRoot = path.join(root, "template");
    const sourceRoot = path.join(root, "personal");
    await Promise.all([
      fs.mkdir(path.join(invocationRoot, "plugins"), { recursive: true }),
      fs.mkdir(path.join(sourceRoot, "plugins"), { recursive: true }),
    ]);
    await fs.writeFile(path.join(invocationRoot, "package.json"), JSON.stringify({ name: "template" }), "utf8");
    await fs.writeFile(path.join(sourceRoot, "package.json"), JSON.stringify({ name: "personal" }), "utf8");

    const selected = await resolveSourceWorkspaceSelection({
      cwd: invocationRoot,
      sourceWorkspaceFlag: sourceRoot,
      config: {
        sync: {
          sources: { paths: ["plugins/agents/extra"] },
        },
      },
      configWorkspacePath: path.join(invocationRoot, ".rawr", "config.json"),
    });

    expect(selected).toMatchObject({
      invocationWorkspaceRoot: invocationRoot,
      sourceWorkspaceRoot: sourceRoot,
      external: true,
      selectedBy: "flag",
    });
    expect(collectWorkspaceSourcePaths({
      config: {
        sync: {
          sources: { paths: ["plugins/agents/extra"] },
        },
      },
      includeOclif: false,
      configPlugins: new Map(),
    })).toEqual(["plugins/agents/extra"]);

    const request = createWorkspaceSyncPlanInput({
      cwd: sourceRoot,
      workspaceRoot: sourceRoot,
      sourcePaths: ["plugins/agents/extra"],
      includeMetadata: true,
      scope: "all",
      agent: "all",
      codexHomes: [],
      claudeHomes: [],
      fullSyncPolicy: {
        agent: "all",
        scope: "all",
        coworkEnabled: true,
        claudeInstallEnabled: true,
        claudeEnableEnabled: true,
        installReconcileEnabled: true,
        retireOrphansEnabled: true,
        force: true,
        gc: true,
        allowPartial: false,
      },
    });
    expect(request.workspaceRoot).toBe(sourceRoot);
    expect(request.sourcePaths).toEqual(["plugins/agents/extra"]);
  });

  it("resolves config source workspace relative to the config file and lets flags win", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-source-config-"));
    tempDirs.push(root);
    const invocationRoot = path.join(root, "template");
    const globalConfigDir = path.join(root, "config");
    const configSourceRoot = path.join(root, "personal-from-config");
    const flagSourceRoot = path.join(root, "personal-from-flag");
    await Promise.all([
      fs.mkdir(path.join(invocationRoot, "plugins"), { recursive: true }),
      fs.mkdir(path.join(globalConfigDir), { recursive: true }),
      fs.mkdir(path.join(configSourceRoot, "plugins"), { recursive: true }),
      fs.mkdir(path.join(flagSourceRoot, "plugins"), { recursive: true }),
    ]);
    await fs.writeFile(path.join(invocationRoot, "package.json"), JSON.stringify({ name: "template" }), "utf8");
    await fs.writeFile(path.join(configSourceRoot, "package.json"), JSON.stringify({ name: "config-source" }), "utf8");
    await fs.writeFile(path.join(flagSourceRoot, "package.json"), JSON.stringify({ name: "flag-source" }), "utf8");

    const fromConfig = await resolveSourceWorkspaceSelection({
      cwd: invocationRoot,
      config: {
        sync: {
          sourceWorkspace: { rootPath: "../personal-from-config" },
        },
      },
      configGlobalPath: path.join(globalConfigDir, "config.json"),
    });
    expect(fromConfig).toMatchObject({
      invocationWorkspaceRoot: invocationRoot,
      sourceWorkspaceRoot: configSourceRoot,
      external: true,
      selectedBy: "config",
    });

    const fromFlag = await resolveSourceWorkspaceSelection({
      cwd: invocationRoot,
      sourceWorkspaceFlag: flagSourceRoot,
      config: {
        sync: {
          sourceWorkspace: { rootPath: "../personal-from-config" },
        },
      },
      configGlobalPath: path.join(globalConfigDir, "config.json"),
    });
    expect(fromFlag).toMatchObject({
      sourceWorkspaceRoot: flagSourceRoot,
      selectedBy: "flag",
    });
  });
});
