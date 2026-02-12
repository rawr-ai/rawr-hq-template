import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { assessInstallState, CANONICAL_SYNC_PLUGIN_NAME } from "../src/lib/install-state";

const tempDirs: string[] = [];

async function withHome<T>(homePath: string, fn: () => Promise<T>): Promise<T> {
  const priorHome = process.env.HOME;
  process.env.HOME = homePath;
  try {
    return await fn();
  } finally {
    if (priorHome === undefined) delete process.env.HOME;
    else process.env.HOME = priorHome;
  }
}

async function mkdirp(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function writeJsonFile(p: string, data: unknown): Promise<void> {
  await mkdirp(path.dirname(p));
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function createWorkspace(root: string, input?: { pluginRootOverride?: string }): Promise<{
  workspaceRoot: string;
  pluginRoot: string;
}> {
  const workspaceRoot = path.resolve(root);
  await mkdirp(path.join(workspaceRoot, "plugins", "cli"));
  await writeJsonFile(path.join(workspaceRoot, "package.json"), { name: "rawr-hq-test", private: true });

  const pluginRoot = input?.pluginRootOverride ?? path.join(workspaceRoot, "plugins", "cli", "plugins");
  await mkdirp(pluginRoot);
  await writeJsonFile(path.join(pluginRoot, "package.json"), {
    name: CANONICAL_SYNC_PLUGIN_NAME,
    private: true,
    rawr: {
      templateRole: "operational",
      kind: "toolkit",
      channel: "A",
      publishTier: "blocked",
    },
    oclif: {
      commands: "./src/commands",
      typescript: {
        commands: "./src/commands",
      },
    },
  });

  return { workspaceRoot, pluginRoot };
}

async function createPluginManagerManifest(
  oclifDataDir: string,
  entries: Array<{ name: string; type?: string; root?: string }>,
): Promise<void> {
  await writeJsonFile(path.join(oclifDataDir, "package.json"), {
    name: "@rawr/cli",
    private: true,
    oclif: {
      plugins: entries,
      schema: 1,
    },
  });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("install-state drift engine", () => {
  it("returns IN_SYNC when canonical link is present", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-install-state-sync-"));
    tempDirs.push(tmp);
    const { workspaceRoot, pluginRoot } = await createWorkspace(path.join(tmp, "repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot },
    ]);
    const report = await withHome(tmp, async () => assessInstallState({
      workspaceRoot,
      oclifDataDir,
      runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceRoot }],
    }));

    expect(report.status).toBe("IN_SYNC");
    expect(report.inSync).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("detects stale links and suggests uninstall + relink", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-install-state-stale-"));
    tempDirs.push(tmp);
    const { workspaceRoot, pluginRoot } = await createWorkspace(path.join(tmp, "repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    const staleRoot = path.join(tmp, "old-worktree", "plugins", "cli", "plugins");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: staleRoot },
    ]);

    const report = await withHome(tmp, async () => assessInstallState({
      workspaceRoot,
      oclifDataDir,
      runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceRoot }],
    }));

    expect(report.status).toBe("STALE_LINKS");
    expect(report.inSync).toBe(false);
    expect(report.issues.some((issue) => issue.kind === "stale_link")).toBe(true);
    expect(report.actions.some((action) => action.command === `rawr plugins uninstall ${CANONICAL_SYNC_PLUGIN_NAME}`)).toBe(true);
    expect(report.actions.some((action) => action.command.includes(`rawr plugins link ${JSON.stringify(pluginRoot)} --install`))).toBe(true);
  });

  it("detects legacy overlap when canonical + legacy are both present", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-install-state-legacy-"));
    tempDirs.push(tmp);
    const { workspaceRoot, pluginRoot } = await createWorkspace(path.join(tmp, "repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot },
      { name: "@rawr/plugin-agent-sync", type: "link", root: path.join(tmp, "legacy", "plugins", "cli", "agent-sync") },
    ]);

    const report = await withHome(tmp, async () => assessInstallState({
      workspaceRoot,
      oclifDataDir,
      runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceRoot }],
    }));

    expect(report.status).toBe("LEGACY_OVERLAP");
    expect(report.issues.some((issue) => issue.kind === "legacy_overlap")).toBe(true);
    expect(report.actions.some((action) => action.command === "rawr plugins uninstall @rawr/plugin-agent-sync")).toBe(true);
  });

  it("prefers global owner root when present and valid", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-install-state-owner-"));
    tempDirs.push(tmp);

    const workspaceCurrent = await createWorkspace(path.join(tmp, "current-repo"));
    const workspaceOwner = await createWorkspace(path.join(tmp, "owner-repo"));

    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: workspaceCurrent.pluginRoot },
    ]);

    await mkdirp(path.join(tmp, ".rawr"));
    await fs.writeFile(path.join(tmp, ".rawr", "global-rawr-owner-path"), `${workspaceOwner.workspaceRoot}\n`, "utf8");

    const report = await withHome(tmp, async () => assessInstallState({
      workspaceRoot: workspaceCurrent.workspaceRoot,
      oclifDataDir,
      runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceCurrent.workspaceRoot }],
    }));

    expect(report.canonicalWorkspaceSource).toBe("global-owner");
    expect(report.canonicalWorkspaceRoot).toBe(path.resolve(workspaceOwner.workspaceRoot));
    expect(report.status).toBe("DRIFT_DETECTED");
    expect(report.issues.some((issue) => issue.kind === "path_mismatch")).toBe(true);
  });
});
