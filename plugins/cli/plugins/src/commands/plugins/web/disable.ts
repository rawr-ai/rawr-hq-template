import { Args } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../lib/hq-ops-client";

/**
 * Disables one catalog-resolved runtime web plugin in persisted repo state.
 */
export default class PluginsWebDisable extends RawrCommand {
  static description = "Disable a workspace runtime web plugin (persisted)";

  static args = {
    id: Args.string({ required: true, description: "Plugin id (directory name or package name)" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsWebDisable);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const inputId = String(args.id);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const client = createHqOpsClient(workspaceRoot);
    const resolved = await client.pluginCatalog.resolveWorkspacePlugin(
      { workspaceRoot, inputId, requiredKind: "web" },
      createHqOpsCallOptions("plugin-plugins.web.disable.resolve"),
    );
    if (resolved.status === "not_found") {
      const result = this.fail(`Unknown plugin: ${inputId}`, {
        code: "PLUGIN_NOT_FOUND",
        meta: { knownPluginIds: resolved.knownPluginIds },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }
    if (resolved.status === "kind_mismatch" || !resolved.plugin) {
      const result = this.fail(`Plugin ${inputId} is rawr.kind=${resolved.actualKind}; rawr plugins web disable requires rawr.kind=web.`, {
        code: "PLUGIN_KIND_MISMATCH",
        details: { inputId, kind: resolved.actualKind },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }
    const plugin = resolved.plugin;

    const nextState = await client.repoState.disablePlugin(
      { pluginId: plugin.id },
      createHqOpsCallOptions("plugin-plugins.web.disable"),
    );
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
