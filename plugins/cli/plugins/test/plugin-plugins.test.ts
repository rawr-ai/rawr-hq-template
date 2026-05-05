import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import {
  buildCleanupBehindCodexCandidates,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  resolveSourceWorkspaceSelection,
} from "../src/lib/agent-config-sync";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const tempDirs: string[] = [];
const codexEnvKeys = ["CODEX_HOME", "RAWR_AGENT_SYNC_CODEX_HOMES"] as const;

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function withCodexHomeEnv<T>(
  env: Partial<Record<typeof codexEnvKeys[number], string | undefined>>,
  run: () => Promise<T> | T,
): Promise<T> {
  const previous = Object.fromEntries(codexEnvKeys.map((key) => [key, process.env[key]])) as Record<
    typeof codexEnvKeys[number],
    string | undefined
  >;
  for (const key of codexEnvKeys) {
    const value = env[key];
    if (typeof value === "string") process.env[key] = value;
    else delete process.env[key];
  }
  try {
    return await run();
  } finally {
    for (const key of codexEnvKeys) {
      const value = previous[key];
      if (typeof value === "string") process.env[key] = value;
      else delete process.env[key];
    }
  }
}

describe("@rawr/plugin-plugins", () => {
  it("keeps sweep candidate classification out of the projection command", async () => {
    const commandSource = await fs.readFile(
      path.join(testDir, "..", "src", "commands", "plugins", "sweep.ts"),
      "utf8",
    );

    expect(commandSource).toContain("planSweepCandidates");
    expect(commandSource).not.toContain("inferTypeFromPath");
  });

  it("keeps provider install scope explicit and user-only in sync commands", async () => {
    const commandSources = await Promise.all([
      fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "sync.ts"), "utf8"),
      fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "sync", "all.ts"), "utf8"),
    ]);

    for (const commandSource of commandSources) {
      expect(commandSource).toContain("\"install-scope\": Flags.string");
      expect(commandSource).toContain("options: [\"user\"]");
      expect(commandSource).toContain("default: \"user\"");
      expect(commandSource).toContain("const installScope = (flags as any)[\"install-scope\"] as \"user\"");
      expect(commandSource).toContain("installScope,");
    }
  });

  it("keeps native Codex deployment defaulted and destination projection explicit", async () => {
    const syncSource = await fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "sync.ts"), "utf8");
    const syncAllSource = await fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "sync", "all.ts"), "utf8");
    const exportSource = await fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "export.ts"), "utf8");
    const exportAllSource = await fs.readFile(path.join(testDir, "..", "src", "commands", "plugins", "export", "all.ts"), "utf8");

    for (const source of [syncSource, syncAllSource]) {
      expect(source).toContain("\"codex-package\": Flags.boolean");
      expect(source).toContain("\"cleanup-behind\": Flags.boolean");
      expect(source).toContain("default: true");
      expect(source).toContain("includeCodex: destinationProjectionEnabled && targets.agents.includes(\"codex\")");
      expect(source).toContain("cleanupBehind");
    }
    expect(syncAllSource).toContain("codexPackageEnabled,");
    expect(syncAllSource).toContain("codexInstallEnabled,");
    for (const source of [exportSource, exportAllSource]) {
      expect(source).toContain("Generic projection requires explicit destination homes");
      expect(source).toContain("PROJECTION_DESTINATION_REQUIRED");
      expect(source).toContain("projectionMode: \"generic_destination_projection\"");
    }
  });

  it("requires plugin-scoped Codex skill visibility before cleanup-behind verifies skills", () => {
    const sourcePluginRootsByName = new Map([["plugin-demo", "/tmp/source/plugins/plugin-demo"]]);

    const candidates = buildCleanupBehindCodexCandidates({
      enabled: true,
      destinationProjectionEnabled: false,
      codexPackageEnabled: true,
      codexInstallEnabled: true,
      dryRun: false,
      sourcePluginRootsByName,
      fallbackCodexHome: "/tmp/codex-home",
      codexPackages: [],
      codexInstall: {
        ok: true,
        actions: [{
          action: "verified",
          plugin: "plugin-demo",
          codexHome: "/tmp/codex-home",
          installed: true,
          enabled: true,
          skillCount: 1,
          visibleSkillCount: 10,
          visiblePluginSkillCount: 0,
          providerHookCount: 0,
          mcpServerCount: 0,
        }],
      },
    });

    expect(candidates).toEqual([expect.objectContaining({
      plugin: "plugin-demo",
      verifiedCapabilities: {
        skills: false,
        hooks: false,
        mcp: false,
      },
    })]);
  });

  it("suppresses cleanup-behind when Codex install reports failure", () => {
    const candidates = buildCleanupBehindCodexCandidates({
      enabled: true,
      destinationProjectionEnabled: false,
      codexPackageEnabled: true,
      codexInstallEnabled: true,
      dryRun: false,
      sourcePluginRootsByName: new Map([["plugin-demo", "/tmp/source/plugins/plugin-demo"]]),
      fallbackCodexHome: "/tmp/codex-home",
      codexPackages: [],
      codexInstall: {
        ok: false,
        actions: [{
          action: "verified",
          plugin: "plugin-demo",
          codexHome: "/tmp/codex-home",
          installed: true,
          enabled: true,
          skillCount: 1,
          visiblePluginSkillCount: 1,
          providerHookCount: 0,
          mcpServerCount: 0,
        }],
      },
    });

    expect(candidates).toEqual([]);
  });

  it("checks install state from the invocation workspace during external source sync status", async () => {
    const commandSource = await fs.readFile(
      path.join(testDir, "..", "src", "commands", "plugins", "status.ts"),
      "utf8",
    );

    expect(commandSource).toContain("const installWorkspaceRoot = sourceWorkspace.external && sourceWorkspace.invocationWorkspaceRoot");
    expect(commandSource).toContain("workspaceRoot: installWorkspaceRoot");
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

  it("defaults Codex sync to CODEX_HOME when explicit multi-home env is absent", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-codex-home-default-"));
    tempDirs.push(root);
    const primary = path.join(root, "codex-rawr");

    await withCodexHomeEnv({
      CODEX_HOME: primary,
      RAWR_AGENT_SYNC_CODEX_HOMES: undefined,
    }, () => {
      const request = createWorkspaceSyncPlanInput({
        cwd: root,
        sourcePaths: [],
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

      expect(request.targetHomeCandidates.codexHomesFromEnvironment).toEqual([primary]);
      expect(request.targetHomeCandidates.codexDefaultHomes).toEqual([
        path.join(process.env.HOME ? String(process.env.HOME) : os.homedir(), ".codex-rawr"),
      ]);
    });
  });

  it("lets explicit multi-home Codex sync env override CODEX_HOME", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-codex-home-multi-"));
    tempDirs.push(root);
    const codeHome = path.join(root, "codex-home");
    const primary = path.join(root, "codex-primary");
    const secondary = path.join(root, "codex-secondary");

    await withCodexHomeEnv({
      CODEX_HOME: codeHome,
      RAWR_AGENT_SYNC_CODEX_HOMES: `${primary},${secondary}`,
    }, () => {
      const request = createWorkspaceSyncPlanInput({
        cwd: root,
        sourcePaths: [],
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

      expect(request.targetHomeCandidates.codexHomesFromEnvironment).toEqual([primary, secondary]);
    });
  });

  it("falls back to the RAWR Codex home when CODEX_HOME is unset", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-codex-default-home-"));
    tempDirs.push(root);

    await withCodexHomeEnv({
      CODEX_HOME: undefined,
      RAWR_AGENT_SYNC_CODEX_HOMES: undefined,
    }, () => {
      const request = createWorkspaceSyncPlanInput({
        cwd: root,
        sourcePaths: [],
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

      expect(request.targetHomeCandidates.codexHomesFromEnvironment).toEqual([]);
      expect(request.targetHomeCandidates.codexDefaultHomes).toEqual([
        path.join(process.env.HOME ? String(process.env.HOME) : os.homedir(), ".codex-rawr"),
      ]);
    });
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
