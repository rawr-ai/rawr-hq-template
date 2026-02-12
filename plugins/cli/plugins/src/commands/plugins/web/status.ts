import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { getRepoState } from "@rawr/state";

import { filterOperationalPlugins, findWorkspaceRoot, listWorkspacePlugins } from "../../../lib/workspace-plugins";

export default class PluginsWebStatus extends RawrCommand {
  static description = "Show workspace runtime web plugins and whether they are enabled";

  static flags = {
    ...RawrCommand.baseFlags,
    all: Flags.boolean({
      description: "Include fixture/example plugins (default shows operational only)",
      default: false,
    }),
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

    const [plugins, state] = await Promise.all([listWorkspacePlugins(workspaceRoot), getRepoState(workspaceRoot)]);
    const visiblePlugins = filterOperationalPlugins(plugins, Boolean(flags.all));
    const enabled = new Set(state.plugins.enabled);

    const enriched = visiblePlugins.map((p) => ({
      ...p,
      enabled: enabled.has(p.id),
    }));

    const result = this.ok({
      workspaceRoot,
      state,
      plugins: enriched,
      excludedCount: plugins.length - visiblePlugins.length,
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
