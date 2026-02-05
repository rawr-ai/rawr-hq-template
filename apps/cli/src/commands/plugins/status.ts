import { RawrCommand } from "@rawr/core";
import { getRepoState } from "@rawr/state";
import { findWorkspaceRoot, listWorkspacePlugins } from "../../lib/workspace-plugins";

export default class PluginsStatus extends RawrCommand {
  static description = "Show workspace plugins and whether they are enabled";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsStatus);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const [plugins, state] = await Promise.all([listWorkspacePlugins(workspaceRoot), getRepoState(workspaceRoot)]);
    const enabled = new Set(state.plugins.enabled);

    const enriched = plugins.map((p) => ({
      ...p,
      enabled: enabled.has(p.id),
    }));

    const result = this.ok({ workspaceRoot, state, plugins: enriched });
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
