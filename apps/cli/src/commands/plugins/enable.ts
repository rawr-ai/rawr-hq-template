import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";
import {
  findWorkspaceRoot,
  listWorkspacePlugins,
  resolvePluginId,
} from "../../lib/workspace-plugins";

export default class PluginsEnable extends RawrCommand {
  static description = "Enable a workspace plugin (gated)";

  static args = {
    id: Args.string({ required: true, description: "Plugin id (directory name or package name)" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsEnable);
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

    const security = await loadSecurityModule();
    const evaluateEnablement = security.evaluateEnablement;
    if (typeof evaluateEnablement !== "function") {
      const result = this.fail(missingSecurityFn("evaluateEnablement"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const evaluation = await evaluateEnablement(plugin.id, {
      cwd: process.cwd(),
      dryRun: baseFlags.dryRun,
      yes: baseFlags.yes,
    });

    const result = this.ok({
      pluginId: plugin.id,
      evaluation,
      note: "Enablement is not persisted yet (MVP)",
    });

    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`enabled: ${plugin.id}`);
        this.log("note: enablement is not persisted yet (MVP)");
      },
    });
  }
}
