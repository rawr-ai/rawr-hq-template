import { Flags } from "@oclif/core";
import {
  assessWorkspaceSync,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncAssessInput,
  type SyncScope,
} from "../../lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "../../lib/layered-config";
import {
  assessPluginInstallState,
  pluginInstallActionCommandText,
  reconcileWorkspaceInstallLinks,
  runtimePluginSnapshot,
} from "../../lib/plugin-install-service";
import { findWorkspaceRoot } from "@rawr/core";
import type { PluginInstallStateStatus } from "@rawr/hq-ops/types";

type SyncStatus = "IN_SYNC" | "DRIFT_DETECTED" | "CONFLICTS";
type OverallStatus = "HEALTHY" | "NEEDS_CONVERGENCE";

export default class PluginsStatus extends RawrCommand {
  static description = "Unified plugin status (sync drift + install/link drift) with actionable next steps";

  static flags = {
    ...RawrCommand.baseFlags,
    checks: Flags.string({
      description: "Status checks to run",
      options: ["sync", "install", "all"],
      default: "all",
    }),
    repair: Flags.boolean({
      description: "Attempt install/link drift repair (sync drift remains non-mutating)",
      default: false,
    }),
    "no-fail": Flags.boolean({
      description: "Do not return non-zero when drift is detected",
      default: false,
    }),
    "material-only": Flags.boolean({
      description: "Ignore metadata-only sync drift (registry/manifest upserts)",
      default: false,
    }),
    "include-oclif": Flags.boolean({
      description: "Include installed/linked oclif plugins as sync sources where supported",
      default: true,
    }),
    agent: Flags.string({
      description: "Sync/install status target agent",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    scope: Flags.string({
      description: "Source plugin scope for sync status",
      options: ["all", "agents", "cli", "web"],
      default: "all",
    }),
    "codex-home": Flags.string({
      description: "Codex home path (repeatable)",
      multiple: true,
    }),
    "claude-home": Flags.string({
      description: "Claude local home path (repeatable, e.g. ~/.claude/plugins/local)",
      multiple: true,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsStatus);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const checks = String(flags.checks) as "sync" | "install" | "all";
    const includeSync = checks === "sync" || checks === "all";
    const includeInstall = checks === "install" || checks === "all";
    const includeMetadata = !(flags as any)["material-only"];
    const repair = Boolean(flags.repair);
    const noFail = Boolean((flags as any)["no-fail"]);
    const runtimePlugins = runtimePluginSnapshot(this.config.plugins);

    try {
      const workspaceRoot = await findWorkspaceRoot(process.cwd());
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const sync = includeSync
        ? await (async () => {
            const layered = await loadLayeredRawrConfigForCwd(workspaceRoot);
            return assessWorkspaceSync({
              repoRoot: workspaceRoot,
              request: createWorkspaceSyncAssessInput({
                cwd: workspaceRoot,
                sourcePaths: collectWorkspaceSourcePaths({
                  config: layered.config ?? undefined,
                  includeOclif: Boolean((flags as any)["include-oclif"]),
                  configPlugins: this.config.plugins,
                }),
                includeMetadata,
                scope: String((flags as any).scope) as SyncScope,
                agent: String(flags.agent) as "codex" | "claude" | "all",
                codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
                claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
                config: layered.config ?? undefined,
              }),
              traceId: "plugin-plugins.agent-config-sync.assess-status",
            });
          })()
        : null;

      let install = includeInstall
        ? await assessPluginInstallState({
            workspaceRoot,
            oclifDataDir: (this.config as any).dataDir as string | undefined,
            runtimePlugins,
            traceId: "plugin-plugins.plugin-install.status-assess",
          })
        : null;
      const repairAttempt = repair && includeInstall
        ? await reconcileWorkspaceInstallLinks({
            workspaceRoot,
            dryRun: baseFlags.dryRun,
            enabled: true,
            oclifDataDir: (this.config as any).dataDir as string | undefined,
            runtimePlugins,
          })
        : null;
      if (repairAttempt && repairAttempt.action !== "planned") {
        install = await assessPluginInstallState({
          workspaceRoot,
          oclifDataDir: (this.config as any).dataDir as string | undefined,
          runtimePlugins,
          traceId: "plugin-plugins.plugin-install.status-assess-after-repair",
        });
      }

      const syncStatus = sync?.status ?? "IN_SYNC";
      const installStatus = (install?.status ?? "IN_SYNC") as PluginInstallStateStatus;
      const overall: OverallStatus =
        (includeSync && syncStatus !== "IN_SYNC") || (includeInstall && installStatus !== "IN_SYNC")
          ? "NEEDS_CONVERGENCE"
          : "HEALTHY";

      const actions: Array<{ command: string; reason: string }> = [];
      if (sync && sync.status !== "IN_SYNC") {
        actions.push({
          command: "rawr plugins sync all --json",
          reason: "Converge content sync drift and refresh provider-side artifacts",
        });
      }
      if (install) {
        actions.push(...install.actions.map((action) => ({ command: pluginInstallActionCommandText(action), reason: action.reason })));
        if (install.status !== "IN_SYNC") {
          actions.push({
            command: "rawr plugins cli install all --json",
            reason: "Reconcile local command plugin links against workspace sources",
          });
        }
      }

      const dedupedActions = actions.filter(
        (action, index, arr) =>
          arr.findIndex((candidate) => candidate.command === action.command && candidate.reason === action.reason) === index,
      );

      const payload = this.ok({
        workspaceRoot,
        checks,
        repair: {
          requested: repair,
          attempted: Boolean(repairAttempt),
          applied: repairAttempt?.action === "applied",
          action: repairAttempt?.action ?? "skipped",
          note: repair && !includeInstall
            ? "repair is only available when install checks are included"
            : repairAttempt?.action === "planned"
              ? "repair planned (dry-run)"
              : repairAttempt?.action === "failed"
                ? "repair attempt failed; review actions/output"
                : undefined,
          result: repairAttempt ?? undefined,
        },
        statuses: {
          sync: includeSync ? syncStatus : "SKIPPED",
          install: includeInstall ? installStatus : "SKIPPED",
          overall,
        },
        sync,
        install,
        actions: dedupedActions,
      });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`checks: ${checks}`);
          this.log(`sync: ${includeSync ? syncStatus : "SKIPPED"}`);
          this.log(`install: ${includeInstall ? installStatus : "SKIPPED"}`);
          this.log(`overall: ${overall}`);
          if (repair) {
            this.log(`repair: ${repairAttempt?.action ?? (includeInstall ? "skipped" : "unavailable")}`);
          }
          if (dedupedActions.length > 0) {
            this.log("actions:");
            for (const action of dedupedActions) this.log(`- ${action.command} (${action.reason})`);
          }
        },
      });

      if (!noFail && overall !== "HEALTHY") {
        this.exit(1);
        return;
      }
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "PLUGINS_STATUS_FAILED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
