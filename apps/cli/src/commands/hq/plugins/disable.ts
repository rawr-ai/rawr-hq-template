import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { disablePlugin as persistDisablePlugin } from "@rawr/state";
import { findWorkspaceRoot, listWorkspacePlugins, resolvePluginId } from "../../../lib/workspace-plugins";

export default class HqPluginsDisable extends RawrCommand {
  static description = "Disable a RAWR HQ workspace runtime plugin (persisted)";

  static args = {
    id: Args.string({ required: true, description: "Plugin id (directory name or package name)" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(HqPluginsDisable);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const inputId = String(args.id);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const plugins = await listWorkspacePlugins(workspaceRoot);
    const plugin = resolvePluginId(plugins, inputId);
    if (!plugin) {
      const result = this.fail(`Unknown plugin: ${inputId}`, {
        code: "PLUGIN_NOT_FOUND",
        meta: { knownPluginIds: plugins.map((p) => p.id) },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const nextState = await persistDisablePlugin(workspaceRoot, plugin.id);
    const result = this.ok({ pluginId: plugin.id, state: nextState });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`disabled: ${plugin.id}`);
        this.log("persisted: .rawr/state/state.json");
      },
    });
  }
}

