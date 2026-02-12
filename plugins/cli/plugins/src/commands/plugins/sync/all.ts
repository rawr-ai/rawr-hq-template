import path from "node:path";

import { Flags } from "@oclif/core";
import {
  beginPluginsSyncUndoCapture,
  effectiveContentForProvider,
  installAndEnableClaudePlugin,
  loadLayeredRawrConfigForCwd,
  packageCoworkPlugin,
  planSyncAll,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveDefaultCoworkOutDir,
  resolveSourcePlugin,
  resolveSourceScopeForPath,
  resolveTargets,
  retireStaleManagedPlugins,
  runSync,
  scanSourcePlugin,
  scopeAllows,
  type SyncItemResult,
  type SyncScope,
} from "@rawr/agent-sync";
import { RawrCommand } from "@rawr/core";

import { reconcileWorkspaceInstallLinks } from "../../../lib/install-reconcile";

export default class PluginsSyncAll extends RawrCommand {
  static description = "Canonical full sync: source plugins -> Codex + Claude + Cowork + stale-plugin retirement";

  static flags = {
    ...RawrCommand.baseFlags,
    "include-oclif": Flags.boolean({
      description: "Include installed/linked oclif plugins as sync sources",
      default: true,
    }),
    agent: Flags.string({
      description: "Sync target agent",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    scope: Flags.string({
      description: "Source plugin scope",
      options: ["all", "agents", "cli", "web"],
      default: "all",
    }),
    cowork: Flags.boolean({
      description: "Build Cowork drag-and-drop .zip artifacts for synced workspace plugins",
      default: true,
      allowNo: true,
    }),
    "cowork-out": Flags.string({
      description: "Output directory for Cowork .zip artifacts (default: <workspaceRoot>/dist/cowork/plugins)",
    }),
    "claude-install": Flags.boolean({
      description: "Install/refresh synced plugins in Claude Code via marketplace",
      default: true,
      allowNo: true,
    }),
    "claude-enable": Flags.boolean({
      description: "Enable plugins in Claude Code after install/refresh",
      default: true,
      allowNo: true,
    }),
    "install-reconcile": Flags.boolean({
      description: "Reconcile local CLI plugin-manager links after sync",
      default: true,
      allowNo: true,
    }),
    "retire-orphans": Flags.boolean({
      description: "Retire stale managed plugins caused by plugin rename/delete",
      default: true,
      allowNo: true,
    }),
    "allow-partial": Flags.boolean({
      description: "Allow intentionally partial sync mode (advanced; can create drift if misused)",
      default: false,
    }),
    "codex-home": Flags.string({
      description: "Codex home path (repeatable)",
      multiple: true,
    }),
    "claude-home": Flags.string({
      description: "Claude local home path (repeatable, e.g. ~/.claude/plugins/local)",
      multiple: true,
    }),
    force: Flags.boolean({
      description: "Overwrite conflicting files (default true for deterministic full sync)",
      default: true,
      allowNo: true,
    }),
    gc: Flags.boolean({
      description: "Remove managed orphaned files within each synced plugin",
      default: true,
      allowNo: true,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsSyncAll);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    let undoCapture: Awaited<ReturnType<typeof beginPluginsSyncUndoCapture>> | undefined;

    try {
      const { workspaceRoot, syncable, skipped } = await planSyncAll(process.cwd());

      const layered = await loadLayeredRawrConfigForCwd(process.cwd());
      const includeOclif = Boolean((flags as any)["include-oclif"]);
      const includeAgentsInCodex = layered.config?.sync?.providers?.codex?.includeAgents ?? false;
      const includeAgentsInClaude = layered.config?.sync?.providers?.claude?.includeAgents ?? true;
      const scope = String((flags as any).scope) as SyncScope;
      const coworkEnabled = Boolean((flags as any).cowork);
      const claudeInstallEnabled = Boolean((flags as any)["claude-install"]);
      const claudeEnableEnabled = Boolean((flags as any)["claude-enable"]);
      const installReconcileEnabled = Boolean((flags as any)["install-reconcile"]);
      const runtimePluginValues = this.config.plugins instanceof Map
        ? [...this.config.plugins.values()]
        : Array.isArray(this.config.plugins)
          ? this.config.plugins
          : [];
      const retireOrphansEnabled = Boolean((flags as any)["retire-orphans"]);
      const allowPartial = Boolean((flags as any)["allow-partial"]);
      const forceEnabled = Boolean(flags.force);
      const gcEnabled = Boolean(flags.gc);
      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins sync all",
            argv: process.argv.slice(2),
          });

      const partialReasons: string[] = [];
      if (String(flags.agent) !== "all") partialReasons.push(`agent=${String(flags.agent)}`);
      if (scope !== "all") partialReasons.push(`scope=${scope}`);
      if (!coworkEnabled) partialReasons.push("cowork disabled");
      if (!claudeInstallEnabled) partialReasons.push("claude install disabled");
      if (claudeInstallEnabled && !claudeEnableEnabled) partialReasons.push("claude enable disabled");
      if (!installReconcileEnabled) partialReasons.push("install reconcile disabled");
      if (!retireOrphansEnabled) partialReasons.push("stale managed plugin retirement disabled");
      if (!forceEnabled) partialReasons.push("force disabled");
      if (!gcEnabled) partialReasons.push("gc disabled");

      if (partialReasons.length > 0 && !allowPartial) {
        const result = this.fail("Partial sync mode is blocked by default; re-run with --allow-partial for advanced exceptions", {
          code: "PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL",
          details: {
            partialReasons,
            canonical: "rawr plugins sync all",
          },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const coworkOutDirAbs = (() => {
        const raw = (flags as any)["cowork-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCoworkOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();

      const extraSourcePaths: string[] = [];

      // Explicit registry (global config).
      for (const p of layered.config?.sync?.sources?.paths ?? []) extraSourcePaths.push(String(p));

      // Oclif plugin manager registry.
      if (includeOclif) {
        for (const pl of this.config.plugins ?? []) {
          const root = (pl as any).root as string | undefined;
          if (!root) continue;
          extraSourcePaths.push(root.endsWith("package.json") ? path.dirname(root) : root);
        }
      }

      // De-dupe and exclude workspace plugins already planned.
      const plannedWorkspaceDirs = new Set(syncable.map((s) => path.resolve(s.sourcePlugin.absPath)));
      const seen = new Set<string>();

      const additionalSyncable: typeof syncable = [];
      const additionalSkipped: typeof skipped = [];

      for (const candidate of extraSourcePaths) {
        const abs = path.resolve(process.cwd(), candidate);
        const absResolved = path.resolve(abs);
        if (plannedWorkspaceDirs.has(absResolved)) continue;
        if (seen.has(absResolved)) continue;
        seen.add(absResolved);

        try {
          const sourcePlugin = await resolveSourcePlugin(absResolved, process.cwd());
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
        scopeAllows(scope, resolveSourceScopeForPath(sourcePlugin.absPath, workspaceRoot)),
      );
      for (const filtered of mergedSyncableAll) {
        if (mergedSyncable.includes(filtered)) continue;
        mergedSkipped.push({
          dirName: filtered.sourcePlugin.dirName,
          absPath: filtered.sourcePlugin.absPath,
          reason: `out of scope (${scope})`,
        });
      }

      const targets = resolveTargets(
        String(flags.agent) as "codex" | "claude" | "all",
        (flags["codex-home"] as string[] | undefined) ?? [],
        (flags["claude-home"] as string[] | undefined) ?? [],
        layered.config,
      );

      const results: Array<{
        dirName: string;
        absPath: string;
        ok: boolean;
        conflictCount: number;
        targets: Array<{
          agent: string;
          home: string;
          conflicts: number;
          actionCounts: Record<string, number>;
          conflictItems: Array<Pick<SyncItemResult, "kind" | "target" | "message">>;
          changedItems: Array<Pick<SyncItemResult, "action" | "kind" | "target" | "message">>;
        }>;
      }> = [];
      const coworkPackages: Array<{ plugin: string; outFile: string; action: "planned" | "written" | "skipped"; reason?: string }> = [];
      const claudeInstall: Array<Record<string, unknown>> = [];
      let retireOrphans: Awaited<ReturnType<typeof retireStaleManagedPlugins>> = {
        ok: true,
        stalePlugins: [],
        actions: [],
      };
      let installReconcile: Record<string, unknown> = { action: "skipped", reason: "not run" };
      let postStepFailed = false;

      const activePluginNames = new Set<string>();

      for (const { sourcePlugin, content } of mergedSyncable) {
        activePluginNames.add(sourcePlugin.dirName);

        const run = await runSync({
          sourcePlugin,
          content,
          options: {
            dryRun: baseFlags.dryRun,
            force: forceEnabled,
            gc: gcEnabled,
            includeAgentsInCodex,
            includeAgentsInClaude,
            undoCapture,
          },
          codexHomes: targets.homes.codexHomes,
          claudeHomes: targets.homes.claudeHomes,
          includeCodex: targets.agents.includes("codex"),
          includeClaude: targets.agents.includes("claude"),
        });

        // Cowork packaging: only for workspace-root plugins (SSOT in this repo).
        if (coworkEnabled) {
          const isWorkspacePlugin = path.resolve(run.sourcePlugin.absPath).startsWith(path.resolve(workspaceRoot) + path.sep);
          if (!isWorkspacePlugin) {
            coworkPackages.push({
              plugin: run.sourcePlugin.dirName,
              outFile: path.join(coworkOutDirAbs, `${run.sourcePlugin.dirName}.zip`),
              action: "skipped",
              reason: "not a workspace plugin (skip cowork packaging)",
            });
          } else {
            try {
              const claudeContent = await effectiveContentForProvider({ agent: "claude", sourcePlugin: run.sourcePlugin, base: content });
              const pkg = await packageCoworkPlugin({
                sourcePlugin: run.sourcePlugin,
                content: claudeContent,
                outDirAbs: coworkOutDirAbs,
                dryRun: baseFlags.dryRun,
                includeAgents: includeAgentsInClaude,
                undoCapture,
              });
              coworkPackages.push(pkg);
            } catch (err) {
              postStepFailed = true;
              coworkPackages.push({
                plugin: run.sourcePlugin.dirName,
                outFile: path.join(coworkOutDirAbs, `${run.sourcePlugin.dirName}.zip`),
                action: "skipped",
                reason: `cowork package failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }
        }

        // Claude marketplace refresh: per-claude target, only if no sync conflicts for that home.
        if (claudeInstallEnabled) {
          for (const t of run.targets.filter((t) => t.agent === "claude")) {
            if (t.conflicts.length > 0 && !baseFlags.dryRun) {
              claudeInstall.push({ action: "skipped", home: t.home, plugin: run.sourcePlugin.dirName, reason: "sync conflicts" });
              continue;
            }
            try {
              const actions = await installAndEnableClaudePlugin({
                claudeLocalHome: t.home,
                pluginName: run.sourcePlugin.dirName,
                dryRun: baseFlags.dryRun,
                enable: claudeEnableEnabled,
              });
              claudeInstall.push(...actions);
              if (actions.some((a) => (a as any).action === "failed")) postStepFailed = true;
            } catch (err) {
              postStepFailed = true;
              claudeInstall.push({
                action: "failed",
                home: t.home,
                plugin: run.sourcePlugin.dirName,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }

        results.push({
          dirName: run.sourcePlugin.dirName,
          absPath: run.sourcePlugin.absPath,
          ok: run.ok,
          conflictCount: run.targets.reduce((sum, t) => sum + t.conflicts.length, 0),
          targets: run.targets.map((t) => {
            const actionCounts = t.items.reduce<Record<string, number>>((acc, item) => {
              acc[item.action] = (acc[item.action] ?? 0) + 1;
              return acc;
            }, {});

            return {
              agent: t.agent,
              home: t.home,
              conflicts: t.conflicts.length,
              actionCounts,
              conflictItems: t.conflicts.map((item) => ({
                kind: item.kind,
                target: item.target,
                message: item.message,
              })),
              changedItems: t.items
                .filter((item) => item.action !== "skipped")
                .map((item) => ({
                  action: item.action,
                  kind: item.kind,
                  target: item.target,
                  message: item.message,
                })),
            };
          }),
        });
      }

      if (retireOrphansEnabled && scope === "all") {
        retireOrphans = await retireStaleManagedPlugins({
          workspaceRoot,
          scope,
          codexHomes: targets.agents.includes("codex") ? targets.homes.codexHomes : [],
          claudeHomes: targets.agents.includes("claude") ? targets.homes.claudeHomes : [],
          activePluginNames,
          dryRun: baseFlags.dryRun,
          undoCapture,
        });
        if (!retireOrphans.ok) postStepFailed = true;
      }

      installReconcile = await reconcileWorkspaceInstallLinks({
        workspaceRoot,
        dryRun: baseFlags.dryRun,
        enabled: installReconcileEnabled,
        runtimePlugins: runtimePluginValues.map((plugin: any) => ({
          name: String(plugin.name ?? plugin.alias ?? ""),
          alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
          type: typeof plugin.type === "string" ? plugin.type : undefined,
          root: typeof plugin.root === "string" ? plugin.root : null,
        })),
        oclifDataDir: (this.config as any).dataDir as string | undefined,
      });
      if ((installReconcile as any).action === "failed") postStepFailed = true;

      const ok = results.every((r) => r.ok) && !postStepFailed && retireOrphans.ok;
      const undoCapsule = undoCapture ? await undoCapture.finalize({ status: ok ? "ready" : "ready-partial" }) : null;
      const undo =
        undoCapsule
          ? {
              available: true,
              provider: PLUGINS_SYNC_UNDO_PROVIDER,
              capsuleId: undoCapsule.capsuleId,
              expiresOn: "next unrelated command",
            }
          : {
              available: false,
            };
      const payload = ok
        ? this.ok({
            workspaceRoot,
            scope,
            partialReasons: allowPartial ? partialReasons : [],
            skipped: mergedSkipped,
            results,
            cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
            claudeInstall,
            retireOrphans,
            installReconcile,
            undo,
          })
        : this.fail(results.some((r) => !r.ok) ? "Sync-all completed with conflicts" : "Sync-all completed but post-sync steps failed", {
            code: results.some((r) => !r.ok) ? "SYNC_CONFLICTS" : "SYNC_POST_STEPS_FAILED",
            details: {
              conflictPlugins: results.filter((r) => !r.ok).map((r) => ({ dirName: r.dirName, conflictCount: r.conflictCount })),
              skippedCount: mergedSkipped.length,
              postStepFailed,
              partialReasons: allowPartial ? partialReasons : [],
              cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
              claudeInstall,
              retireOrphans,
              installReconcile,
              undo,
            },
          });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`scope: ${scope}`);
          this.log(`synced: ${results.length}`);
          if (allowPartial && partialReasons.length > 0) this.log(`partial mode: ${partialReasons.join(", ")}`);
          if (mergedSkipped.length > 0) this.log(`skipped: ${mergedSkipped.length}`);
          for (const r of results) {
            this.log(`- ${r.dirName} (conflicts=${r.conflictCount})`);
            for (const t of r.targets) {
              this.log(
                `  - ${t.agent}@${t.home} copied=${t.actionCounts.copied ?? 0} updated=${t.actionCounts.updated ?? 0} deleted=${t.actionCounts.deleted ?? 0} planned=${t.actionCounts.planned ?? 0} conflicts=${t.conflicts}`,
              );
              for (const conflict of t.conflictItems) {
                this.log(`    conflict: [${conflict.kind}] ${conflict.target} (${conflict.message ?? ""})`);
              }
              for (const changed of t.changedItems) {
                if (changed.action !== "updated" && changed.action !== "deleted") continue;
                this.log(`    ${changed.action}: [${changed.kind}] ${changed.target} (${changed.message ?? ""})`);
              }
            }
          }
          if (retireOrphans.actions.length > 0) {
            this.log(`Retired stale managed plugins: ${retireOrphans.stalePlugins.length}`);
            for (const action of retireOrphans.actions) {
              this.log(
                `  ${action.action}: ${action.agent}@${action.home} plugin=${action.plugin} target=${action.target}${action.message ? ` (${action.message})` : ""}`,
              );
            }
          }
          this.log(`Install reconcile: ${(installReconcile as any).action}`);
          if (coworkEnabled) this.log(`Cowork out: ${coworkOutDirAbs}`);
          if (undo.available) this.log(`Undo: rawr undo (capsule=${undo.capsuleId})`);
        },
      });

      if (!ok) {
        this.exit(1);
        return;
      }
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const code = message.includes("Unable to locate workspace root") ? "WORKSPACE_ROOT_MISSING" : "SYNC_ERROR";
      let undo: { available: boolean; provider?: string; capsuleId?: string; expiresOn?: string } = { available: false };
      if (!baseFlags.dryRun && undoCapture) {
        const capsule = await undoCapture.finalize({ status: "ready-partial" });
        if (capsule) {
          undo = {
            available: true,
            provider: PLUGINS_SYNC_UNDO_PROVIDER,
            capsuleId: capsule.capsuleId,
            expiresOn: "next unrelated command",
          };
        }
      }

      const result = this.fail(message, { code, details: { undo } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
