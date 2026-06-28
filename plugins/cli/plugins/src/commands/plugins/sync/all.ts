import path from "node:path";

import { Flags } from "@oclif/core";
import {
  beginPluginsSyncUndoCapture,
  buildCleanupBehindCodexCandidates,
  buildCleanupBehindCodexClaimCheckHomes,
  buildProviderWorkflowMirrorWarnings,
  cleanupBehindProviderSync,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  emptyCleanupBehindResult,
  installCodexMarketplacePlugins,
  installAndEnableClaudePlugin,
  packageCodexPlugin,
  packageCoworkPlugin,
  planWorkspaceSync,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveDefaultCodexOutDir,
  resolveDefaultCoworkOutDir,
  resolveProviderContent,
  resolveProviderVersion,
  resolveSourceWorkspaceSelection,
  retireStaleManagedPlugins,
  runSync,
  syncCodexNativeAgentRoles,
  type SyncItemResult,
  type SyncScope,
} from "#lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "#lib/layered-config";
import { reconcileWorkspaceInstallLinks, runtimePluginSnapshot } from "#lib/plugin-install-service";

/**
 * Runs the canonical full plugin sync across all active sources.
 *
 * The command orchestrates across agent-config-sync and HQ Ops without merging
 * the two service domains: destination sync stays standalone, while install
 * reconciliation stays HQ-owned.
 */
export default class PluginsSyncAll extends RawrCommand {
  static description = "Canonical native provider plugin sync across active RAWR plugin sources";

  static flags = {
    ...RawrCommand.baseFlags,
    "include-oclif": Flags.boolean({
      description: "Include installed/linked oclif plugins as sync sources",
      default: true,
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to scan as the source of sync truth",
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
    "codex-package": Flags.boolean({
      description: "Build Codex native marketplace packages (default native Codex deployment path)",
      default: true,
      allowNo: true,
    }),
    "codex-out": Flags.string({
      description: "Output directory for Codex marketplace root (default: <workspaceRoot>/dist/codex)",
    }),
    "codex-install": Flags.boolean({
      description: "Register and install generated Codex plugin packages through RAWR Codex",
      default: true,
      allowNo: true,
    }),
    "codex-bin": Flags.string({
      description: "Codex binary for marketplace registration/install (default: RAWR_CODEX_BIN, then ~/.local/bin/codex, then codex)",
    }),
    "install-scope": Flags.string({
      description: "Provider plugin install scope (reserved; currently only user-local installs are supported)",
      options: ["user"],
      default: "user",
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
    "destination-projection": Flags.boolean({
      description: "Also run auxiliary filesystem destination projection; not a sanctioned Codex/Claude deployment path",
      default: false,
      allowNo: true,
    }),
    "cleanup-behind": Flags.boolean({
      description: "Clean RAWR-managed residue superseded by successful native provider sync",
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
    let warnings: string[] = [];

    try {
      const cwd = process.cwd();
      const invocationLayered = await loadLayeredRawrConfigForCwd(cwd);
      const sourceWorkspace = await resolveSourceWorkspaceSelection({
        cwd,
        sourceWorkspaceFlag: (flags as any)["source-workspace"] as string | undefined,
        config: invocationLayered.config ?? undefined,
        configWorkspacePath: invocationLayered.workspacePath,
        configGlobalPath: invocationLayered.globalPath,
      });
      const workspaceRoot = sourceWorkspace.sourceWorkspaceRoot;
      const installWorkspaceRoot = sourceWorkspace.external && sourceWorkspace.invocationWorkspaceRoot
        ? sourceWorkspace.invocationWorkspaceRoot
        : workspaceRoot;
      const layered = sourceWorkspace.external
        ? await loadLayeredRawrConfigForCwd(workspaceRoot)
        : invocationLayered;
      const includeOclif = Boolean((flags as any)["include-oclif"]) && !sourceWorkspace.external;
      const scope = String((flags as any).scope) as SyncScope;
      const coworkEnabled = Boolean((flags as any).cowork);
      const destinationProjectionEnabled = Boolean((flags as any)["destination-projection"]);
      const codexPackageEnabled = Boolean((flags as any)["codex-package"]);
      const codexInstallEnabled = Boolean((flags as any)["codex-install"]);
      const codexBin = (flags as any)["codex-bin"] as string | undefined;
      const installScope = (flags as any)["install-scope"] as "user";
      const claudeInstallEnabled = Boolean((flags as any)["claude-install"]);
      const claudeEnableEnabled = Boolean((flags as any)["claude-enable"]);
      const installReconcileEnabled = Boolean((flags as any)["install-reconcile"]);
      const runtimePlugins = runtimePluginSnapshot(this.config.plugins);
      const retireOrphansEnabled = Boolean((flags as any)["retire-orphans"]);
      const allowPartial = Boolean((flags as any)["allow-partial"]);
      const forceEnabled = Boolean(flags.force);
      const gcEnabled = Boolean(flags.gc);
      const cleanupBehindEnabled = Boolean((flags as any)["cleanup-behind"]);

      const planRequest = createWorkspaceSyncPlanInput({
        cwd: workspaceRoot,
        workspaceRoot,
        sourcePaths: collectWorkspaceSourcePaths({
          config: layered.config ?? undefined,
          includeOclif,
          configPlugins: this.config.plugins,
        }),
        includeMetadata: true,
        scope,
        agent: String(flags.agent) as "codex" | "claude" | "all",
        codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
        claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
        config: layered.config ?? undefined,
        includeCodexDestinationProjection: destinationProjectionEnabled,
        fullSyncPolicy: {
          agent: String(flags.agent) as "codex" | "claude" | "all",
          scope,
          coworkEnabled,
          codexPackageEnabled,
          codexInstallEnabled,
          claudeInstallEnabled,
          claudeEnableEnabled,
          installReconcileEnabled,
          retireOrphansEnabled,
          force: forceEnabled,
          gc: gcEnabled,
          allowPartial,
        },
      });
      const plan = await planWorkspaceSync({
        repoRoot: workspaceRoot,
        request: planRequest,
        traceId: "plugin-plugins.agent-config-sync.plan-workspace-sync-all",
      });
      const { syncable, skipped: mergedSkipped } = plan;
      const partialReasons = plan.fullSyncPolicy.partialReasons;
      const includeAgentsInCodex = plan.includeAgentsInCodex;
      const includeAgentsInClaude = plan.includeAgentsInClaude;
      const targets = {
        agents: plan.agents,
        homes: plan.targetHomes,
      };

      if (!plan.fullSyncPolicy.allowed) {
        const result = this.fail(plan.fullSyncPolicy.failure?.message ?? "Partial sync mode is blocked by default", {
          code: plan.fullSyncPolicy.failure?.code ?? "PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL",
          details: {
            partialReasons,
            canonical: plan.fullSyncPolicy.canonical,
          },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins sync all",
            argv: process.argv.slice(2),
          });

      const coworkOutDirAbs = (() => {
        const raw = (flags as any)["cowork-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCoworkOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();
      const codexOutDirAbs = (() => {
        const raw = (flags as any)["codex-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCodexOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();

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
      const codexPackages: Array<{
        plugin: string;
        outDir: string;
        action: "planned" | "written" | "skipped";
        manifestPath?: string;
        marketplaceName?: string;
        marketplaceRoot?: string;
        marketplacePath?: string;
        marketplaceAction?: "planned" | "written";
        marketplacePluginCount?: number;
        skillCount?: number;
        scriptCount?: number;
        agentCount?: number;
        hookCount?: number;
        hookConfigCount?: number;
        mcpServerCount?: number;
        settingsCount?: number;
        assetCount?: number;
        validationNotes?: string[];
        reason?: string;
      }> = [];
      const codexNativeAgentRoleRuns: Array<{
        plugin: string;
        ok: boolean;
        targets: Array<{ home: string; conflicts: number; actionCounts: Record<string, number> }>;
      }> = [];
      let codexInstall: Record<string, unknown> = {
        ok: true,
        installScope,
        actions: [{ action: "skipped", installScope, reason: "not run" }],
      };
      let cleanupBehind: Awaited<ReturnType<typeof cleanupBehindProviderSync>> = emptyCleanupBehindResult();
      const claudeInstall: Array<Record<string, unknown>> = [];
      let retireOrphans: Awaited<ReturnType<typeof retireStaleManagedPlugins>> = {
        ok: true,
        stalePlugins: [],
        actions: [],
      };
      let installReconcile: Record<string, unknown> = { action: "skipped", reason: "not run" };
      let postStepFailed = false;
      const syncTargetsForWarnings: Array<{
        agent: string;
        items: Array<Pick<SyncItemResult, "action" | "kind" | "target">>;
      }> = [];

      const activePluginNames = new Set(plan.activePluginNames);
      const packageActivePluginNames = scope === "all" ? activePluginNames : undefined;
      const sourcePluginRootsByName = new Map<string, string>();

      for (const { sourcePlugin, content } of syncable) {
        sourcePluginRootsByName.set(sourcePlugin.dirName, sourcePlugin.absPath);
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
          includeCodex: destinationProjectionEnabled && targets.agents.includes("codex"),
          includeClaude: targets.agents.includes("claude"),
        });
        const nativeAgentRun = !destinationProjectionEnabled && targets.agents.includes("codex")
          ? await syncCodexNativeAgentRoles({
              sourcePlugin,
              content,
              options: {
                dryRun: baseFlags.dryRun,
                force: forceEnabled,
                gc: gcEnabled,
                includeAgentsInCodex,
                undoCapture,
              },
              codexHomes: targets.homes.codexHomes,
              includeCodex: true,
            })
          : null;
        if (nativeAgentRun && !nativeAgentRun.ok) postStepFailed = true;
        if (nativeAgentRun) {
          codexNativeAgentRoleRuns.push({
            plugin: sourcePlugin.dirName,
            ok: nativeAgentRun.ok,
            targets: nativeAgentRun.targets.map((target) => ({
              home: target.home,
              conflicts: target.conflicts.length,
              actionCounts: target.items.reduce<Record<string, number>>((acc, item) => {
                acc[item.action] = (acc[item.action] ?? 0) + 1;
                return acc;
              }, {}),
            })),
          });
        }
        const effectiveRun = nativeAgentRun
          ? {
              ...run,
              targets: [...run.targets, ...nativeAgentRun.targets],
              projections: [...run.projections, ...nativeAgentRun.projections],
            }
          : run;
        syncTargetsForWarnings.push(...effectiveRun.targets);

        // Cowork packaging: only for workspace-root plugins (SSOT in this repo).
        if (coworkEnabled) {
          const isWorkspacePlugin = path.resolve(effectiveRun.sourcePlugin.absPath).startsWith(path.resolve(workspaceRoot) + path.sep);
          if (!isWorkspacePlugin) {
            coworkPackages.push({
              plugin: effectiveRun.sourcePlugin.dirName,
              outFile: path.join(coworkOutDirAbs, `${effectiveRun.sourcePlugin.dirName}.zip`),
              action: "skipped",
              reason: "not a workspace plugin (skip cowork packaging)",
            });
          } else {
            try {
              const claudeContent = await resolveProviderContent({
                agent: "claude",
                sourcePlugin: effectiveRun.sourcePlugin,
                base: content,
                repoRoot: workspaceRoot,
              });
              const claudeProviderVersion = await resolveProviderVersion({
                sourcePlugin: effectiveRun.sourcePlugin,
                content: claudeContent,
                repoRoot: workspaceRoot,
              });
              const pkg = await packageCoworkPlugin({
                sourcePlugin: effectiveRun.sourcePlugin,
                content: claudeContent,
                outDirAbs: coworkOutDirAbs,
                dryRun: baseFlags.dryRun,
                providerVersion: claudeProviderVersion.providerVersion,
                includeAgents: includeAgentsInClaude,
                undoCapture,
              });
              coworkPackages.push(pkg);
            } catch (err) {
              postStepFailed = true;
              coworkPackages.push({
                plugin: effectiveRun.sourcePlugin.dirName,
                outFile: path.join(coworkOutDirAbs, `${effectiveRun.sourcePlugin.dirName}.zip`),
                action: "skipped",
                reason: `cowork package failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }
        }

        if (codexPackageEnabled && targets.agents.includes("codex")) {
          const isWorkspacePlugin = path.resolve(effectiveRun.sourcePlugin.absPath).startsWith(path.resolve(workspaceRoot) + path.sep);
          if (!isWorkspacePlugin) {
            codexPackages.push({
              plugin: effectiveRun.sourcePlugin.dirName,
              outDir: path.join(codexOutDirAbs, "plugins", effectiveRun.sourcePlugin.dirName),
              action: "skipped",
              reason: "not a workspace plugin (skip Codex marketplace package)",
            });
          } else {
            try {
              const codexContent = await resolveProviderContent({
                agent: "codex",
                sourcePlugin: effectiveRun.sourcePlugin,
                base: content,
                repoRoot: workspaceRoot,
              });
              const codexProviderVersion = await resolveProviderVersion({
                sourcePlugin: effectiveRun.sourcePlugin,
                content: codexContent,
                repoRoot: workspaceRoot,
              });
              codexPackages.push(await packageCodexPlugin({
                sourcePlugin: effectiveRun.sourcePlugin,
                content: codexContent,
                outDirAbs: codexOutDirAbs,
                dryRun: baseFlags.dryRun,
                providerVersion: codexProviderVersion.providerVersion,
                activePluginNames: packageActivePluginNames,
                undoCapture,
              }));
            } catch (err) {
              postStepFailed = true;
              codexPackages.push({
                plugin: effectiveRun.sourcePlugin.dirName,
                outDir: path.join(codexOutDirAbs, "plugins", effectiveRun.sourcePlugin.dirName),
                action: "skipped",
                reason: `codex package failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }
        }

        // Claude marketplace refresh: per-claude target, only if no sync conflicts for that home.
        if (claudeInstallEnabled) {
          for (const t of effectiveRun.targets.filter((t) => t.agent === "claude")) {
            if (t.conflicts.length > 0 && !baseFlags.dryRun) {
              claudeInstall.push({ action: "skipped", home: t.home, plugin: effectiveRun.sourcePlugin.dirName, installScope, reason: "sync conflicts" });
              continue;
            }
            try {
              const actions = await installAndEnableClaudePlugin({
                claudeLocalHome: t.home,
                pluginName: effectiveRun.sourcePlugin.dirName,
                installScope,
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
                plugin: effectiveRun.sourcePlugin.dirName,
                installScope,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }

        results.push({
          dirName: effectiveRun.sourcePlugin.dirName,
          absPath: effectiveRun.sourcePlugin.absPath,
          ok: effectiveRun.ok,
          conflictCount: effectiveRun.targets.reduce((sum, t) => sum + t.conflicts.length, 0),
          targets: effectiveRun.targets.map((t) => {
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

      const installableCodexPackages = codexPackages.filter((pkg) => pkg.action !== "skipped" && pkg.marketplacePath);
      if (codexPackageEnabled && codexInstallEnabled && installableCodexPackages.length > 0) {
        const first = installableCodexPackages[0]!;
        codexInstall = await installCodexMarketplacePlugins({
          codexBin,
          codexHome: targets.homes.codexHomes[0],
          installScope,
          marketplaceRoot: String(first.marketplaceRoot),
          marketplacePath: String(first.marketplacePath),
          plugins: installableCodexPackages.map((pkg) => pkg.plugin),
          dryRun: baseFlags.dryRun,
        });
        if (!(codexInstall as any).ok) postStepFailed = true;
      } else {
        codexInstall = {
          ok: true,
          installScope,
          actions: [{
            action: "skipped",
            codexBin,
            installScope,
            reason: codexPackageEnabled ? "disabled by flag or no generated packages" : "codex package disabled",
          }],
        };
      }

      const cleanupCandidates = buildCleanupBehindCodexCandidates({
        enabled: cleanupBehindEnabled,
        destinationProjectionEnabled,
        codexPackageEnabled,
        codexInstallEnabled,
        dryRun: baseFlags.dryRun,
        codexInstall,
        codexPackages,
        sourcePluginRootsByName,
        fallbackCodexHome: targets.homes.codexHomes[0],
      });
      if (cleanupCandidates.length > 0) {
        cleanupBehind = await cleanupBehindProviderSync({
          workspaceRoot,
          claimCheckCodexHomes: buildCleanupBehindCodexClaimCheckHomes(targets.homes.codexHomes),
          candidates: cleanupCandidates,
          dryRun: baseFlags.dryRun,
          undoCapture,
        });
        if (!cleanupBehind.ok) postStepFailed = true;
      } else {
        cleanupBehind = emptyCleanupBehindResult(
          cleanupBehindEnabled
            ? "cleanup behind skipped: no verified or planned native provider install candidates"
            : "cleanup behind disabled by flag",
        );
      }

      installReconcile = await reconcileWorkspaceInstallLinks({
        workspaceRoot: installWorkspaceRoot,
        dryRun: baseFlags.dryRun,
        enabled: installReconcileEnabled,
        runtimePlugins,
        oclifDataDir: (this.config as any).dataDir as string | undefined,
      });
      if ((installReconcile as any).action === "failed") postStepFailed = true;

      const ok = results.every((r) => r.ok) && !postStepFailed && retireOrphans.ok;
      warnings = buildProviderWorkflowMirrorWarnings({
        cleanupBehind,
        syncTargets: syncTargetsForWarnings,
      });
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
            installScope,
            partialReasons: allowPartial ? partialReasons : [],
            skipped: mergedSkipped,
            results,
            codexNativeAgentRoles: codexNativeAgentRoleRuns,
            codexPackage: { outDir: codexOutDirAbs, packages: codexPackages },
            codexMarketplace: summarizeCodexMarketplace(codexPackages),
            codexInstall,
            cleanupBehind,
            cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
            claudeInstall,
            retireOrphans,
            installReconcile,
            undo,
          }, undefined, warnings.length > 0 ? warnings : undefined)
        : this.fail(results.some((r) => !r.ok) ? "Sync-all completed with conflicts" : "Sync-all completed but post-sync steps failed", {
            code: results.some((r) => !r.ok) ? "SYNC_CONFLICTS" : "SYNC_POST_STEPS_FAILED",
            details: {
              conflictPlugins: results.filter((r) => !r.ok).map((r) => ({ dirName: r.dirName, conflictCount: r.conflictCount })),
              skippedCount: mergedSkipped.length,
              postStepFailed,
              installScope,
              partialReasons: allowPartial ? partialReasons : [],
              codexPackage: { outDir: codexOutDirAbs, packages: codexPackages },
              codexNativeAgentRoles: codexNativeAgentRoleRuns,
              codexMarketplace: summarizeCodexMarketplace(codexPackages),
              codexInstall,
              cleanupBehind,
              cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
              claudeInstall,
              retireOrphans,
              installReconcile,
              warnings,
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
          if (codexPackageEnabled) {
            this.log(`Codex package out: ${codexOutDirAbs}`);
            const marketplacePath = codexPackages.find((p) => p.marketplacePath)?.marketplacePath;
            if (marketplacePath) this.log(`Codex marketplace: ${marketplacePath}`);
            this.log(`Codex install: ${(codexInstall as any).ok ? "ok" : "failed"}`);
            this.log(`Cleanup behind: ${cleanupBehind.ok ? "ok" : "failed"} (${cleanupBehind.actions.length} actions)`);
            this.log(`Install scope: ${installScope}`);
          }
          for (const warning of warnings) this.log(`warning: ${warning}`);
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

      const result = this.fail(message, { code, details: { undo, warnings } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}

function summarizeCodexMarketplace(packages: Array<{
  marketplaceName?: string;
  marketplaceRoot?: string;
  marketplacePath?: string;
  marketplaceAction?: "planned" | "written";
  marketplacePluginCount?: number;
}>) {
  const marketplacePackages = packages.filter((pkg) => pkg.marketplacePath);
  const marketplacePackage = marketplacePackages[marketplacePackages.length - 1];
  return marketplacePackage
    ? {
        name: marketplacePackage.marketplaceName,
        root: marketplacePackage.marketplaceRoot,
        path: marketplacePackage.marketplacePath,
        action: marketplacePackage.marketplaceAction,
        pluginCount: marketplacePackage.marketplaceAction === "planned"
          ? marketplacePackages.length
          : marketplacePackage.marketplacePluginCount,
      }
    : {
        action: "skipped",
        reason: "no Codex marketplace package generated",
      };
}
