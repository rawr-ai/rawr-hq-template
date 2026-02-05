import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";
import {
  findWorkspaceRoot,
  listWorkspacePlugins,
  resolvePluginId,
} from "../../lib/workspace-plugins";
import { Flags } from "@oclif/core";

export default class PluginsEnable extends RawrCommand {
  static description = "Enable a workspace plugin (gated)";

  static args = {
    id: Args.string({ required: true, description: "Plugin id (directory name or package name)" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    risk: Flags.string({
      description: "Risk tolerance: strict | balanced | permissive | off",
      default: "balanced",
      options: ["strict", "balanced", "permissive", "off"],
    }),
    staged: Flags.boolean({ description: "Gate enablement based on staged scan", default: false }),
    force: Flags.boolean({ description: "Override gating failure (recorded later)", default: false }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsEnable);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const inputId = String(args.id);
    const mode: "staged" | "repo" = flags.staged ? "staged" : "repo";
    const riskTolerance = String(flags.risk);
    const force = Boolean(flags.force);

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
    const gateEnable = security.gateEnable;
    if (typeof gateEnable !== "function") {
      const result = this.fail(missingSecurityFn("gateEnable"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const evaluation = await gateEnable({
      pluginId: plugin.id,
      riskTolerance,
      mode,
    });

    if ((evaluation as any)?.allowed === false && !force) {
      const result = this.fail("Plugin enablement blocked by security gate", {
        code: "SECURITY_GATE_BLOCKED",
        details: evaluation,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({
      pluginId: plugin.id,
      evaluation,
      note: "Enablement is not persisted yet (MVP)",
    });

    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`${(evaluation as any)?.allowed === false ? "forced enable" : "enabled"}: ${plugin.id}`);
        this.log("note: enablement is not persisted yet (MVP)");
      },
    });
  }
}
