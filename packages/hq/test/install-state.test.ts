import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { assessInstallState, CANONICAL_SYNC_PLUGIN_NAME } from "../src/install";

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

async function createWorkspace(root: string): Promise<{
  workspaceRoot: string;
  pluginRoot: string;
}> {
  const workspaceRoot = path.resolve(root);
  await mkdirp(path.join(workspaceRoot, "plugins", "cli"));
  await writeJsonFile(path.join(workspaceRoot, "package.json"), { name: "rawr-hq-test", private: true });

  const pluginRoot = path.join(workspaceRoot, "plugins", "cli", "plugins");
  await mkdirp(pluginRoot);
  await writeJsonFile(path.join(pluginRoot, "package.json"), {
    name: CANONICAL_SYNC_PLUGIN_NAME,
    private: true,
    rawr: {
      kind: "toolkit",
      capability: "plugins",
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

describe("@rawr/hq install state", () => {
  it("returns IN_SYNC when canonical link is present", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-install-state-sync-"));
    tempDirs.push(tmp);
    const { workspaceRoot, pluginRoot } = await createWorkspace(path.join(tmp, "repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot },
    ]);

    const report = await withHome(tmp, async () =>
      assessInstallState({
        workspaceRoot,
        oclifDataDir,
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceRoot }],
      }));

    expect(report.status).toBe("IN_SYNC");
    expect(report.inSync).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("flags legacy overlap when canonical and legacy providers coexist", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-install-state-legacy-"));
    tempDirs.push(tmp);
    const { workspaceRoot, pluginRoot } = await createWorkspace(path.join(tmp, "repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot },
      { name: "@rawr/plugin-agent-sync", type: "link", root: path.join(tmp, "legacy", "plugins", "cli", "agent-sync") },
    ]);

    const report = await withHome(tmp, async () =>
      assessInstallState({
        workspaceRoot,
        oclifDataDir,
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: workspaceRoot }],
      }));

    expect(report.status).toBe("LEGACY_OVERLAP");
    expect(report.issues.some((issue) => issue.kind === "legacy_overlap")).toBe(true);
  });

  it("defaults canonical root to the instance-local workspace even when owner file exists", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-install-state-owner-local-"));
    tempDirs.push(tmp);
    const current = await createWorkspace(path.join(tmp, "current-repo"));
    const owner = await createWorkspace(path.join(tmp, "owner-repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: current.pluginRoot },
    ]);
    await mkdirp(path.join(tmp, ".rawr"));
    await fs.writeFile(path.join(tmp, ".rawr", "global-rawr-owner-path"), `${owner.workspaceRoot}\n`, "utf8");

    const report = await withHome(tmp, async () =>
      assessInstallState({
        workspaceRoot: current.workspaceRoot,
        oclifDataDir,
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: current.workspaceRoot }],
      }));

    expect(report.canonicalWorkspaceSource).toBe("workspace-root");
    expect(report.canonicalWorkspaceRoot).toBe(path.resolve(current.workspaceRoot));
  });

  it("uses global-owner root only when explicitly enabled", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-install-state-owner-explicit-"));
    tempDirs.push(tmp);
    const current = await createWorkspace(path.join(tmp, "current-repo"));
    const owner = await createWorkspace(path.join(tmp, "owner-repo"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");
    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: current.pluginRoot },
    ]);
    await mkdirp(path.join(tmp, ".rawr"));
    await fs.writeFile(path.join(tmp, ".rawr", "global-rawr-owner-path"), `${owner.workspaceRoot}\n`, "utf8");

    const report = await withHome(tmp, async () =>
      assessInstallState({
        workspaceRoot: current.workspaceRoot,
        oclifDataDir,
        allowGlobalOwnerFallback: true,
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: CANONICAL_SYNC_PLUGIN_NAME, type: "core", root: current.workspaceRoot }],
      }));

    expect(report.canonicalWorkspaceSource).toBe("global-owner");
    expect(report.canonicalWorkspaceRoot).toBe(path.resolve(owner.workspaceRoot));
  });
});
