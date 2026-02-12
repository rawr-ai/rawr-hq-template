import path from "node:path";

import { Flags } from "@oclif/core";
import {
  loadLayeredRawrConfigForCwd,
  planSyncAll,
  resolveSourcePlugin,
  resolveSourceScopeForPath,
  resolveTargets,
  runSync,
  scanSourcePlugin,
  scopeAllows,
  type SyncItemResult,
  type SyncScope,
} from "@rawr/agent-sync";
import { RawrCommand } from "@rawr/core";

import { reconcileWorkspaceInstallLinks } from "../../lib/install-reconcile";
import { assessInstallState, type InstallStateStatus } from "../../lib/install-state";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type DriftItem = Pick<SyncItemResult, "action" | "kind" | "target" | "message">;
type SyncStatus = "IN_SYNC" | "DRIFT_DETECTED" | "CONFLICTS";
type OverallStatus = "HEALTHY" | "NEEDS_CONVERGENCE";

type SyncAssessment = {
  status: SyncStatus;
  includeMetadata: boolean;
  scope: string;
  summary: {
    totalPlugins: number;
    totalTargets: number;
    totalConflicts: number;
    totalMaterialChanges: number;
    totalMetadataChanges: number;
    totalDriftItems: number;
  };
  skipped: Array<{ dirName: string; absPath: string; reason: string }>;
  plugins: Array<{
    dirName: string;
    absPath: string;
    conflicts: number;
    materialChanges: number;
    metadataChanges: number;
    driftItems: DriftItem[];
  }>;
};

async function assessSyncStatus(input: {
  cwd: string;
  includeOclif: boolean;
  oclifSourceRoots: string[];
  includeMetadata: boolean;
  scope: SyncScope;
  agent: "codex" | "claude" | "all";
  codexHomes: string[];
  claudeHomes: string[];
}): Promise<SyncAssessment> {
  const { workspaceRoot, syncable, skipped } = await planSyncAll(input.cwd);
  const layered = await loadLayeredRawrConfigForCwd(input.cwd);
  const includeAgentsInCodex = layered.config?.sync?.providers?.codex?.includeAgents ?? false;
  const includeAgentsInClaude = layered.config?.sync?.providers?.claude?.includeAgents ?? true;

  const extraSourcePaths: string[] = [];
  for (const p of layered.config?.sync?.sources?.paths ?? []) extraSourcePaths.push(String(p));

  if (input.includeOclif) {
    extraSourcePaths.push(
      ...input.oclifSourceRoots.map((root) => (root.endsWith("package.json") ? path.dirname(root) : root)),
    );
  }

  const plannedWorkspaceDirs = new Set(syncable.map((s) => path.resolve(s.sourcePlugin.absPath)));
  const seen = new Set<string>();
  const additionalSyncable: typeof syncable = [];
  const additionalSkipped: typeof skipped = [];

  // Additional sources from explicit config only. Oclif sources are handled by top-level command via config.plugins.
  for (const candidate of extraSourcePaths) {
    const abs = path.resolve(input.cwd, candidate);
    const absResolved = path.resolve(abs);
    if (plannedWorkspaceDirs.has(absResolved)) continue;
    if (seen.has(absResolved)) continue;
    seen.add(absResolved);

    try {
      const sourcePlugin = await resolveSourcePlugin(absResolved, input.cwd);
      const content = await scanSourcePlugin(sourcePlugin);
      const hasAny =
        content.workflowFiles.length > 0 ||
        content.skills.length > 0 ||
        content.scripts.length > 0 ||
        content.agentFiles.length > 0;
      if (!hasAny) {
        additionalSkipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      additionalSyncable.push({ sourcePlugin, content });
    } catch (err) {
      additionalSkipped.push({ dirName: path.basename(absResolved), absPath: absResolved, reason: `unresolvable: ${String(err)}` });
    }
  }

  const mergedSyncableAll = [...syncable, ...additionalSyncable];
  const mergedSkipped = [...skipped, ...additionalSkipped];
  const mergedSyncable = mergedSyncableAll.filter(({ sourcePlugin }) =>
    scopeAllows(input.scope, resolveSourceScopeForPath(sourcePlugin.absPath, workspaceRoot)),
  );

  for (const filtered of mergedSyncableAll) {
    if (mergedSyncable.includes(filtered)) continue;
    mergedSkipped.push({
      dirName: filtered.sourcePlugin.dirName,
      absPath: filtered.sourcePlugin.absPath,
      reason: `out of scope (${input.scope})`,
    });
  }

  const targets = resolveTargets(
    input.agent,
    input.codexHomes,
    input.claudeHomes,
    layered.config,
  );

  const plugins: SyncAssessment["plugins"] = [];
  let totalTargets = 0;
  let totalConflicts = 0;
  let totalMaterialChanges = 0;
  let totalMetadataChanges = 0;
  let totalDriftItems = 0;

  for (const { sourcePlugin, content } of mergedSyncable) {
    const run = await runSync({
      sourcePlugin,
      content,
      options: {
        dryRun: true,
        force: true,
        gc: true,
        includeAgentsInCodex,
        includeAgentsInClaude,
      },
      codexHomes: targets.homes.codexHomes,
      claudeHomes: targets.homes.claudeHomes,
      includeCodex: targets.agents.includes("codex"),
      includeClaude: targets.agents.includes("claude"),
    });

    let conflicts = 0;
    let materialChanges = 0;
    let metadataChanges = 0;
    const driftItems: DriftItem[] = [];

    for (const target of run.targets) {
      totalTargets += 1;
      conflicts += target.conflicts.length;
      totalConflicts += target.conflicts.length;

      const nonSkipped = target.items.filter((item) => item.action !== "skipped");
      const metadata = nonSkipped.filter((item) => item.kind === "metadata");
      const material = nonSkipped.filter((item) => item.kind !== "metadata");
      const drift = nonSkipped.filter((item) => input.includeMetadata || item.kind !== "metadata");

      metadataChanges += metadata.length;
      materialChanges += material.length;
      totalMetadataChanges += metadata.length;
      totalMaterialChanges += material.length;
      totalDriftItems += drift.length;

      driftItems.push(
        ...drift.map((item) => ({
          action: item.action,
          kind: item.kind,
          target: item.target,
          message: item.message,
        })),
      );
    }

    plugins.push({
      dirName: sourcePlugin.dirName,
      absPath: sourcePlugin.absPath,
      conflicts,
      materialChanges,
      metadataChanges,
      driftItems,
    });
  }

  const status: SyncStatus = totalConflicts > 0 ? "CONFLICTS" : totalDriftItems > 0 ? "DRIFT_DETECTED" : "IN_SYNC";
  return {
    status,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    summary: {
      totalPlugins: plugins.length,
      totalTargets,
      totalConflicts,
      totalMaterialChanges,
      totalMetadataChanges,
      totalDriftItems,
    },
    skipped: mergedSkipped,
    plugins,
  };
}

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
    const includeMetadata = !Boolean((flags as any)["material-only"]);
    const repair = Boolean(flags.repair);
    const noFail = Boolean((flags as any)["no-fail"]);
    const runtimePluginValues = this.config.plugins instanceof Map
      ? [...this.config.plugins.values()]
      : Array.isArray(this.config.plugins)
        ? this.config.plugins
        : [];

    try {
      const workspaceRoot = await findWorkspaceRoot(process.cwd());
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const sync = includeSync
        ? await assessSyncStatus({
            cwd: workspaceRoot,
            includeOclif: Boolean((flags as any)["include-oclif"]),
            oclifSourceRoots: runtimePluginValues
              .map((plugin: any) => (typeof plugin.root === "string" ? plugin.root : ""))
              .filter((root: string) => root.length > 0),
            includeMetadata,
            scope: String((flags as any).scope) as SyncScope,
            agent: String(flags.agent) as "codex" | "claude" | "all",
            codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
            claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
          })
        : null;

      let install = includeInstall
        ? await assessInstallState({
            workspaceRoot,
            oclifDataDir: (this.config as any).dataDir as string | undefined,
            runtimePlugins: runtimePluginValues.map((plugin: any) => ({
              name: String(plugin.name ?? plugin.alias ?? ""),
              alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
              type: typeof plugin.type === "string" ? plugin.type : undefined,
              root: typeof plugin.root === "string" ? plugin.root : null,
            })),
          })
        : null;
      const repairAttempt = repair && includeInstall
        ? await reconcileWorkspaceInstallLinks({
            workspaceRoot,
            dryRun: baseFlags.dryRun,
            enabled: true,
            oclifDataDir: (this.config as any).dataDir as string | undefined,
            runtimePlugins: runtimePluginValues.map((plugin: any) => ({
              name: String(plugin.name ?? plugin.alias ?? ""),
              alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
              type: typeof plugin.type === "string" ? plugin.type : undefined,
              root: typeof plugin.root === "string" ? plugin.root : null,
            })),
          })
        : null;
      if (repairAttempt && repairAttempt.action !== "planned") {
        install = await assessInstallState({
          workspaceRoot,
          oclifDataDir: (this.config as any).dataDir as string | undefined,
          runtimePlugins: runtimePluginValues.map((plugin: any) => ({
            name: String(plugin.name ?? plugin.alias ?? ""),
            alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
            type: typeof plugin.type === "string" ? plugin.type : undefined,
            root: typeof plugin.root === "string" ? plugin.root : null,
          })),
        });
      }

      const syncStatus = sync?.status ?? "IN_SYNC";
      const installStatus = (install?.status ?? "IN_SYNC") as InstallStateStatus;
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
        actions.push(...install.actions);
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
