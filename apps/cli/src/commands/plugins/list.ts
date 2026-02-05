import { RawrCommand } from "@rawr/core";
import { findWorkspaceRoot, listWorkspacePlugins } from "../../lib/workspace-plugins";

export default class PluginsList extends RawrCommand {
  static description = "List workspace plugins";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsList);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const plugins = await listWorkspacePlugins(workspaceRoot);
    const result = this.ok({ workspaceRoot, plugins });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (plugins.length === 0) {
          this.log("no plugins found");
          return;
        }
        for (const plugin of plugins) this.log(plugin.id);
      },
    });
  }
}
