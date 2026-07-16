import { Args, Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../lib/hq-ops-client";

/**
 * Enables one catalog-resolved runtime web plugin after HQ security gating.
 */
export default class PluginsWebEnable extends RawrCommand {
  static description = "Enable a workspace runtime web plugin (gated)";

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

  /**
   * Detects whether config should supply the risk default.
   */
  private hasExplicitRiskFlag(argv: string[]): boolean {
    return argv.some((a) => a === "--risk" || a.startsWith("--risk="));
  }

  async run() {
    const { args, flags } = await this.parseRawr(PluginsWebEnable);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const inputId = String(args.id);
    const mode: "staged" | "repo" = flags.staged ? "staged" : "repo";
    let riskTolerance = String(flags.risk);
    const force = Boolean(flags.force);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const client = createHqOpsClient(workspaceRoot);

    // If user didn't explicitly choose --risk, prefer config default (if present).
    if (!this.hasExplicitRiskFlag(process.argv.slice(2))) {
      const loaded = await client.config.getWorkspaceConfig(
        {},
        createHqOpsCallOptions("plugin-plugins.web.enable.config"),
      );
      const configured = loaded.config?.plugins?.defaultRiskTolerance;
      if (configured) riskTolerance = configured;
    }

    const resolved = await client.pluginCatalog.resolveWorkspacePlugin(
      { workspaceRoot, inputId, requiredKind: "web" },
      createHqOpsCallOptions("plugin-plugins.web.enable.resolve"),
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
      const result = this.fail(
        `Plugin ${inputId} is rawr.kind=${resolved.actualKind}; rawr plugins web enable requires rawr.kind=web.`,
        {
          code: "PLUGIN_KIND_MISMATCH",
          details: {
            inputId,
            kind: resolved.actualKind,
          },
        },
      );
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }
    const plugin = resolved.plugin;

    const evaluation = await client.security.gateEnable(
      {
        pluginId: plugin.id,
        riskTolerance: riskTolerance as "strict" | "balanced" | "permissive" | "off",
        mode,
      },
      createHqOpsCallOptions("plugin-plugins.web.enable.gate"),
    );

    if ((evaluation as any)?.allowed === false && !force) {
      const result = this.fail("Plugin enablement blocked by security gate", {
        code: "SECURITY_GATE_BLOCKED",
        details: evaluation,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const nextState = await client.repoState.enablePlugin(
      { pluginId: plugin.id },
      createHqOpsCallOptions("plugin-plugins.web.enable.persist"),
    );

    const result = this.ok({
      pluginId: plugin.id,
      evaluation,
      state: nextState,
    });

    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`${(evaluation as any)?.allowed === false ? "forced enable" : "enabled"}: ${plugin.id}`);
        this.log("persisted: .rawr/state/state.json");
      },
    });
  }
}
