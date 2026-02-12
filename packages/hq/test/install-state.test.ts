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
});
