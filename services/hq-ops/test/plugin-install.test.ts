import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { CANONICAL_SYNC_PLUGIN_NAME } from "../src/service/modules/plugin-install/entities";
import { createClientOptions, invocation } from "./helpers";

const tempDirs: string[] = [];

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function createWorkspaceWithCommandPlugin(): Promise<{ workspaceRoot: string; pluginRoot: string }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-plugin-install-"));
  tempDirs.push(tempRoot);
  const workspaceRoot = path.join(tempRoot, "repo");
  const pluginRoot = path.join(workspaceRoot, "plugins", "cli", "plugins");
  await writeJsonFile(path.join(workspaceRoot, "package.json"), { private: true });
  await writeJsonFile(path.join(pluginRoot, "package.json"), {
    name: CANONICAL_SYNC_PLUGIN_NAME,
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

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("hq-ops pluginInstall", () => {
  it("reports IN_SYNC when catalog-derived command plugin links are present", async () => {
    const { workspaceRoot, pluginRoot } = await createWorkspaceWithCommandPlugin();
    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));

    const report = await client.pluginInstall.assessInstallState(
      {
        workspaceRoot,
        pluginManagerManifestPath: "/tmp/oclif/package.json",
        actualLinks: [{ name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot }],
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME }],
      },
      invocation("trace-plugin-install-sync"),
    );

    expect(report.status).toBe("IN_SYNC");
    expect(report.inSync).toBe(true);
    expect(report.expectedLinks).toEqual([{ pluginName: CANONICAL_SYNC_PLUGIN_NAME, root: pluginRoot }]);
    expect(report.issues).toEqual([]);
  });

  it("classifies stale links and returns semantic repair actions without execution", async () => {
    const { workspaceRoot } = await createWorkspaceWithCommandPlugin();
    const staleRoot = "/tmp/old-rawr-hq/plugins/cli/plugins";
    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));

    const report = await client.pluginInstall.assessInstallState(
      {
        workspaceRoot,
        pluginManagerManifestPath: "/tmp/oclif/package.json",
        actualLinks: [
          { name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: staleRoot },
          { name: "@rawr/plugin-agent-sync", type: "link", root: "/tmp/legacy" },
        ],
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME }],
      },
      invocation("trace-plugin-install-drift"),
    );

    expect(report.status).toBe("LEGACY_OVERLAP");
    expect(report.issues.map((issue) => issue.kind)).toEqual(["stale_link", "legacy_overlap"]);

    const plan = await client.pluginInstall.planInstallRepair(
      { report },
      invocation("trace-plugin-install-plan"),
    );

    expect(plan.action).toBe("planned");
    expect(plan.actions).toEqual([
      {
        kind: "uninstall-plugin",
        pluginName: "@rawr/plugin-agent-sync",
        reason: "remove legacy provider @rawr/plugin-agent-sync",
      },
      {
        kind: "uninstall-plugin",
        pluginName: CANONICAL_SYNC_PLUGIN_NAME,
        reason: `remove malformed entry for ${CANONICAL_SYNC_PLUGIN_NAME} before relink`,
      },
      {
        kind: "reconcile-cli-command-plugin-links",
        reason: "reconcile workspace command plugin links",
      },
    ]);
  });
});
