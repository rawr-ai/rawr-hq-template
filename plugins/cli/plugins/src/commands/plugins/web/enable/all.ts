import fs from "node:fs/promises";
import path from "node:path";

import { Flags } from "@oclif/core";
import { loadRawrConfig } from "@rawr/control-plane";
import { RawrCommand } from "@rawr/core";
import { enablePlugin as persistEnablePlugin } from "@rawr/state";

import { loadSecurityModule, missingSecurityFn } from "../../../../lib/security";
import { filterOperationalPlugins, findWorkspaceRoot, listWorkspacePlugins } from "../../../../lib/workspace-plugins";

type EnableAttempt = {
  pluginId: string;
  allowed: boolean;
  forced: boolean;
  persisted: boolean;
  error?: { message: string; code?: string };
};

async function readJsonFile(p: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function hasRuntimeExports(pkgJson: unknown): boolean {
  if (!pkgJson || typeof pkgJson !== "object") return false;
  const exportsField = (pkgJson as any).exports;
  if (!exportsField || typeof exportsField !== "object") return false;
  return Boolean((exportsField as any)["./server"] || (exportsField as any)["./web"]);
}

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
    "allow-non-operational": Flags.boolean({
      description: "Include fixture/example plugins (default: true)",
      default: true,
    }),
  } as const;

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
    const allowNonOperational = Boolean((flags as any)["allow-non-operational"]);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    // If user didn't explicitly choose --risk, prefer config default (if present).
    if (!this.hasExplicitRiskFlag(process.argv.slice(2))) {
      const loaded = await loadRawrConfig(workspaceRoot);
      const configured = loaded.config?.plugins?.defaultRiskTolerance;
      if (configured) riskTolerance = configured;
    }

    const all = await listWorkspacePlugins(workspaceRoot);
    const visible = filterOperationalPlugins(all, allowNonOperational);

    const security = await loadSecurityModule();
    const gateEnable = security.gateEnable;
    if (typeof gateEnable !== "function") {
      const result = this.fail(missingSecurityFn("gateEnable"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const planned: { pluginId: string; reason?: string }[] = [];
    const skipped: { pluginId: string; reason: string }[] = [];

    for (const plugin of visible) {
      const channelHasB = plugin.channel === "B" || plugin.channel === "both";
      if (channelHasB) {
        planned.push({ pluginId: plugin.id });
        continue;
      }

      const pkgJson = await readJsonFile(path.join(plugin.absPath, "package.json"));
      if (hasRuntimeExports(pkgJson)) {
        planned.push({ pluginId: plugin.id, reason: "has runtime exports" });
        continue;
      }

      skipped.push({ pluginId: plugin.id, reason: "not a Channel B runtime plugin" });
    }

    const attempts: EnableAttempt[] = [];
    let blockedCount = 0;
    let errorCount = 0;

    for (const p of planned) {
      const evaluation = await gateEnable({
        pluginId: p.pluginId,
        riskTolerance,
        mode,
      });

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
        await persistEnablePlugin(workspaceRoot, p.pluginId);
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
