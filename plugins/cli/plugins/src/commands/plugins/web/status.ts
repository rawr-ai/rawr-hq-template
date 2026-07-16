import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../lib/hq-ops-client";

/**
 * Shows web-plugin catalog entries enriched with persisted repo-state enablement.
 */
export default class PluginsWebStatus extends RawrCommand {
  static description = "Show workspace runtime web plugins and whether they are enabled";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsWebStatus);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const client = createHqOpsClient(workspaceRoot);
    const [catalog, stateResult] = await Promise.all([
      client.pluginCatalog.listWorkspacePlugins(
        { workspaceRoot, kind: "web" },
        createHqOpsCallOptions("plugin-plugins.web.status.catalog"),
      ),
      client.repoState.getState(
        {},
        createHqOpsCallOptions("plugin-plugins.web.status"),
      ),
    ]);
    const state = stateResult.state;
    const enabled = new Set(state.plugins.enabled);

    const enriched = catalog.plugins.map((p) => ({
      ...p,
      enabled: enabled.has(p.id),
    }));

    const result = this.ok({
      workspaceRoot,
      state,
      plugins: enriched,
    });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (enriched.length === 0) {
          this.log("no plugins found");
          return;
        }
        for (const plugin of enriched) this.log(`${plugin.enabled ? "enabled" : "disabled"}: ${plugin.id}`);
      },
    });
  }
}
