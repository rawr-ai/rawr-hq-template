import { findWorkspaceRoot, RawrCommand } from "@rawr/core";

import { createHqOpsCallOptions, createHqOpsClient } from "../../../lib/hq-ops-client";

export default class PluginsWebList extends RawrCommand {
  static description = "List workspace runtime web plugins";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsWebList);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const catalog = await createHqOpsClient(workspaceRoot).pluginCatalog.listWorkspacePlugins(
      { workspaceRoot, kind: "web" },
      createHqOpsCallOptions("plugin-plugins.web.list.catalog"),
    );
    const result = this.ok({ workspaceRoot, plugins: catalog.plugins, excludedCount: catalog.excludedCount });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (catalog.plugins.length === 0) {
          this.log("no plugins found");
          return;
        }
        for (const plugin of catalog.plugins) this.log(plugin.id);
      },
    });
  }
}
