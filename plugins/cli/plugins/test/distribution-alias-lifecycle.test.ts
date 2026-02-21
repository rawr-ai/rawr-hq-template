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

async function createWorkspace(root: string): Promise<{ workspaceRoot: string; pluginRoot: string }> {
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

describe("distribution alias lifecycle", () => {
  it("keeps instance-local root by default even with another owner instance configured", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-instance-seam-default-"));
    tempDirs.push(tmp);

    const current = await createWorkspace(path.join(tmp, "current-instance"));
    const owner = await createWorkspace(path.join(tmp, "owner-instance"));
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
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: "current-instance", type: "core", root: current.workspaceRoot }],
      }),
    );

    expect(report.canonicalWorkspaceSource).toBe("workspace-root");
    expect(report.canonicalWorkspaceRoot).toBe(path.resolve(current.workspaceRoot));
  });

  it("switches to owner root only when explicit fallback is requested", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-instance-seam-explicit-"));
    tempDirs.push(tmp);

    const current = await createWorkspace(path.join(tmp, "current-instance"));
    const owner = await createWorkspace(path.join(tmp, "owner-instance"));
    const oclifDataDir = path.join(tmp, ".local", "share", "@rawr", "cli");

    await createPluginManagerManifest(oclifDataDir, [
      { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: owner.pluginRoot },
    ]);

    await mkdirp(path.join(tmp, ".rawr"));
    await fs.writeFile(path.join(tmp, ".rawr", "global-rawr-owner-path"), `${owner.workspaceRoot}\n`, "utf8");

    const report = await withHome(tmp, async () =>
      assessInstallState({
        workspaceRoot: current.workspaceRoot,
        oclifDataDir,
        allowGlobalOwnerFallback: true,
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME, alias: "owner-instance", type: "core", root: current.workspaceRoot }],
      }),
    );

    expect(report.canonicalWorkspaceSource).toBe("global-owner");
    expect(report.canonicalWorkspaceRoot).toBe(path.resolve(owner.workspaceRoot));
  });
});
