import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { filterOperationalPlugins, findWorkspaceRoot, listWorkspacePlugins } from "../../../lib/workspace-plugins";

export default class PluginsWebList extends RawrCommand {
  static description = "List workspace runtime web plugins";

  static flags = {
    ...RawrCommand.baseFlags,
    all: Flags.boolean({
      description: "Include fixture/example plugins (default shows operational only)",
      default: false,
    }),
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

    const plugins = await listWorkspacePlugins(workspaceRoot);
    const visiblePlugins = filterOperationalPlugins(plugins, Boolean(flags.all));
    const result = this.ok({ workspaceRoot, plugins: visiblePlugins, excludedCount: plugins.length - visiblePlugins.length });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (visiblePlugins.length === 0) {
          this.log("no plugins found");
          return;
        }
        for (const plugin of visiblePlugins) this.log(plugin.id);
      },
    });
  }
}
