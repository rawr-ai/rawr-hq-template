import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../../lib/hq-ops-client";

type EnableAttempt = {
  pluginId: string;
  allowed: boolean;
  forced: boolean;
  persisted: boolean;
  error?: { message: string; code?: string };
};

/**
 * Enables all HQ-catalog runtime web plugins that expose runtime web entrypoints.
 */
export default class PluginsWebEnableAll extends RawrCommand {
  static description = "Enable all workspace runtime web plugins (gated)";

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
    const { flags } = await this.parseRawr(PluginsWebEnableAll);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const dryRun = Boolean((flags as any)["dry-run"]);
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
        createHqOpsCallOptions("plugin-plugins.web.enable-all.config"),
      );
      const configured = loaded.config?.plugins?.defaultRiskTolerance;
      if (configured) riskTolerance = configured;
    }

    const catalog = await client.pluginCatalog.listWorkspacePlugins(
      { workspaceRoot, kind: "web" },
      createHqOpsCallOptions("plugin-plugins.web.enable-all.catalog"),
    );

    const planned: { pluginId: string; reason?: string }[] = [];
    const skipped: { pluginId: string; reason: string }[] = [];

    for (const plugin of catalog.plugins) {
      if (plugin.runtimeWeb.eligible) {
        planned.push({ pluginId: plugin.id, reason: plugin.runtimeWeb.reason });
        continue;
      }

      skipped.push({ pluginId: plugin.id, reason: plugin.runtimeWeb.reason });
    }

    const attempts: EnableAttempt[] = [];
    let blockedCount = 0;
    let errorCount = 0;

    for (const p of planned) {
      const evaluation = await client.security.gateEnable(
        {
          pluginId: p.pluginId,
          riskTolerance: riskTolerance as "strict" | "balanced" | "permissive" | "off",
          mode,
        },
        createHqOpsCallOptions(`plugin-plugins.web.enable-all.gate.${p.pluginId}`),
      );

      const allowed = (evaluation as any)?.allowed !== false;
      const forced = (evaluation as any)?.allowed === false && force;

      if (!allowed && !force) {
        blockedCount++;
        attempts.push({ pluginId: p.pluginId, allowed: false, forced: false, persisted: false });
        continue;
      }

      if (dryRun) {
        attempts.push({ pluginId: p.pluginId, allowed, forced, persisted: false });
        continue;
      }

      try {
          await client.repoState.enablePlugin(
            { pluginId: p.pluginId },
            createHqOpsCallOptions(`plugin-plugins.web.enable-all.persist.${p.pluginId}`),
          );
        attempts.push({ pluginId: p.pluginId, allowed, forced, persisted: true });
      } catch (e) {
        errorCount++;
        attempts.push({
          pluginId: p.pluginId,
          allowed,
          forced,
          persisted: false,
          error: { message: e instanceof Error ? e.message : String(e), code: "PERSIST_FAILED" },
        });
      }
    }

    const result = this.ok({
      workspaceRoot,
      mode,
      riskTolerance,
      dryRun,
      plannedCount: planned.length,
      skippedCount: skipped.length,
      blockedCount,
      errorCount,
      attempts,
      skipped,
    });

    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`planned: ${planned.length}`);
        if (skipped.length > 0) this.log(`skipped: ${skipped.length}`);
        if (blockedCount > 0) this.log(`blocked: ${blockedCount}`);
        if (errorCount > 0) this.log(`errors: ${errorCount}`);
        if (dryRun) this.log("dry-run: no state persisted");
        else this.log("persisted: .rawr/state/state.json");
      },
    });

    if (blockedCount > 0 || errorCount > 0) this.exit(1);
  }
}
