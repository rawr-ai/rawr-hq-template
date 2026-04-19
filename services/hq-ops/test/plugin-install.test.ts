import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { CANONICAL_SYNC_PLUGIN_NAME } from "../src/service/modules/plugin-install/model";
import { createClientOptions, invocation } from "./helpers";

describe("hq-ops pluginInstall", () => {
  it("reports IN_SYNC when expected command plugin links are present", async () => {
    const workspaceRoot = "/tmp/rawr-hq";
    const pluginRoot = "/tmp/rawr-hq/plugins/cli/plugins";
    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));

    const report = await client.pluginInstall.assessInstallState(
      {
        workspaceRoot,
        pluginManagerManifestPath: "/tmp/oclif/package.json",
        expectedLinks: [{ pluginName: CANONICAL_SYNC_PLUGIN_NAME, root: pluginRoot }],
        actualLinks: [{ name: CANONICAL_SYNC_PLUGIN_NAME, type: "link", root: pluginRoot }],
        runtimePlugins: [{ name: CANONICAL_SYNC_PLUGIN_NAME }],
      },
      invocation("trace-plugin-install-sync"),
    );

    expect(report.status).toBe("IN_SYNC");
    expect(report.inSync).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("classifies stale links and returns a structured repair plan without execution", async () => {
    const workspaceRoot = "/tmp/rawr-hq";
    const pluginRoot = "/tmp/rawr-hq/plugins/cli/plugins";
    const staleRoot = "/tmp/old-rawr-hq/plugins/cli/plugins";
    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));

    const report = await client.pluginInstall.assessInstallState(
      {
        workspaceRoot,
        pluginManagerManifestPath: "/tmp/oclif/package.json",
        expectedLinks: [{ pluginName: CANONICAL_SYNC_PLUGIN_NAME, root: pluginRoot }],
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
    expect(plan.commands).toEqual([
      {
        args: ["plugins", "uninstall", "@rawr/plugin-agent-sync"],
        reason: "remove legacy provider @rawr/plugin-agent-sync",
      },
      {
        args: ["plugins", "uninstall", CANONICAL_SYNC_PLUGIN_NAME],
        reason: `remove malformed entry for ${CANONICAL_SYNC_PLUGIN_NAME} before relink`,
      },
      {
        args: ["plugins", "cli", "install", "all", "--json"],
        reason: "reconcile workspace command plugin links",
      },
    ]);
  });
});
