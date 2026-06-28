import path from "node:path";

import { Args, Flags } from "@oclif/core";
import {
  beginPluginsSyncUndoCapture,
  buildCleanupBehindCodexCandidates,
  buildCleanupBehindCodexClaimCheckHomes,
  buildProviderWorkflowMirrorWarnings,
  cleanupBehindProviderSync,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  emptyCleanupBehindResult,
  findPlannedSyncable,
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
  runSync,
  syncCodexNativeAgentRoles,
} from "#lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "#lib/layered-config";

import { reconcileWorkspaceInstallLinks, runtimePluginSnapshot } from "#lib/plugin-install-service";

/**
 * Syncs one source plugin into selected agent destinations.
 *
 * Planning and destination sync semantics come from agent-config-sync; this
 * command handles user flags, Cowork archive creation, Claude CLI install, and
 * optional local command-plugin link reconciliation.
 */
export default class PluginsSync extends RawrCommand {
  static description = "Deploy one RAWR plugin through native provider plugin paths";

  static args = {
    "plugin-ref": Args.string({
      description: "Plugin package name, dir name, or path",
      required: true,
    }),
  };

  static flags = {
    ...RawrCommand.baseFlags,
    agent: Flags.string({
      description: "Sync target agent",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    cowork: Flags.boolean({
      description: "Build Cowork drag-and-drop .zip artifact for this plugin",
      default: true,
      allowNo: true,
    }),
    "cowork-out": Flags.string({
      description: "Output directory for Cowork .zip artifacts (default: <workspaceRoot>/dist/cowork/plugins)",
    }),
    "codex-package": Flags.boolean({
      description: "Build Codex native marketplace package for this plugin (default native Codex deployment path)",
      default: true,
      allowNo: true,
    }),
    "codex-out": Flags.string({
      description: "Output directory for Codex marketplace root (default: <workspaceRoot>/dist/codex)",
    }),
    "codex-install": Flags.boolean({
      description: "Register and install generated Codex plugin package through RAWR Codex",
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
      description: "Install/refresh the synced plugin in Claude Code via marketplace",
      default: true,
      allowNo: true,
    }),
    "claude-enable": Flags.boolean({
      description: "Enable the plugin in Claude Code after install/refresh",
      default: true,
      allowNo: true,
    }),
    "install-reconcile": Flags.boolean({
      description: "Reconcile local CLI plugin-manager links after sync",
      default: true,
      allowNo: true,
    }),
    "destination-projection": Flags.boolean({
      description:
        "Also write modeled content to explicit filesystem destination paths; not a Codex/Claude harness sync fallback",
      default: false,
      allowNo: true,
    }),
    "cleanup-behind": Flags.boolean({
      description: "Clean RAWR-managed residue superseded by successful native provider sync",
      default: true,
      allowNo: true,
    }),
    "codex-home": Flags.string({
      description: "Codex home path (repeatable)",
      multiple: true,
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to scan as the source of sync truth",
    }),
    "claude-home": Flags.string({
      description: "Claude local home path (repeatable, e.g. ~/.claude/plugins/local)",
      multiple: true,
    }),
    force: Flags.boolean({
      description: "Overwrite conflicting files",
      default: false,
    }),
    gc: Flags.boolean({
      description: "Remove managed orphaned files",
      default: true,
      allowNo: true,
    }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsSync);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    let undoCapture: Awaited<ReturnType<typeof beginPluginsSyncUndoCapture>> | undefined;
    let warnings: string[] = [];

    try {
      const pluginRef = String(args["plugin-ref"]);
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
      const layered = sourceWorkspace.external
        ? await loadLayeredRawrConfigForCwd(workspaceRoot)
        : invocationLayered;
      const coworkEnabled = Boolean((flags as any).cowork);
      const destinationProjectionEnabled = Boolean((flags as any)["destination-projection"]);
      const cleanupBehindEnabled = Boolean((flags as any)["cleanup-behind"]);
      const codexPackageEnabled = Boolean((flags as any)["codex-package"]);
      const codexInstallEnabled = Boolean((flags as any)["codex-install"]);
      const claudeInstallEnabled = Boolean((flags as any)["claude-install"]);
      const claudeEnableEnabled = Boolean((flags as any)["claude-enable"]);
      const installReconcileEnabled = Boolean((flags as any)["install-reconcile"]);
      const plan = await planWorkspaceSync({
        repoRoot: workspaceRoot,
        request: createWorkspaceSyncPlanInput({
          cwd: workspaceRoot,
          workspaceRoot,
          sourcePaths: collectWorkspaceSourcePaths({
            config: layered.config ?? undefined,
            includeOclif: false,
            configPlugins: this.config.plugins,
            extraSourcePaths: [pluginRef],
          }),
          includeMetadata: true,
          scope: "all",
          agent: String(flags.agent) as "codex" | "claude" | "all",
          codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
          claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
          config: layered.config ?? undefined,
          includeCodexDestinationProjection: destinationProjectionEnabled,
          fullSyncPolicy: {
            agent: String(flags.agent) as "codex" | "claude" | "all",
            scope: "all",
            coworkEnabled,
            codexPackageEnabled,
            codexInstallEnabled,
            claudeInstallEnabled,
            claudeEnableEnabled,
            installReconcileEnabled,
            retireOrphansEnabled: true,
            force: Boolean(flags.force),
            gc: Boolean(flags.gc),
            allowPartial: true,
          },
        }),
        traceId: "plugin-plugins.agent-config-sync.plan-single-sync",
      });
      const planned = findPlannedSyncable({ plan, pluginRef, cwd: workspaceRoot });
      if (!planned) {
        const result = this.fail("Unable to resolve sync source plugin", {
          code: "PLUGIN_SOURCE_NOT_FOUND",
          details: { pluginRef, skipped: plan.skipped },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }
      const { sourcePlugin, content } = planned;
      const includeAgentsInCodex = plan.includeAgentsInCodex;
      const includeAgentsInClaude = plan.includeAgentsInClaude;
      const targets = {
        agents: plan.agents,
        homes: plan.targetHomes,
      };
      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins sync",
            argv: process.argv.slice(2),
          });

      const syncResult = await runSync({
        sourcePlugin,
        content,
        options: {
          dryRun: baseFlags.dryRun,
          force: Boolean(flags.force),
          gc: Boolean(flags.gc),
          includeAgentsInCodex,
          includeAgentsInClaude,
          undoCapture,
        },
        codexHomes: targets.homes.codexHomes,
        claudeHomes: targets.homes.claudeHomes,
        includeCodex: destinationProjectionEnabled && targets.agents.includes("codex"),
        includeClaude: targets.agents.includes("claude"),
      });

      const runtimePlugins = runtimePluginSnapshot(this.config.plugins);

      const codexBin = (flags as any)["codex-bin"] as string | undefined;
      const installScope = (flags as any)["install-scope"] as "user";
      const codexOutDirAbs = (() => {
        const raw = (flags as any)["codex-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCodexOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();
      const coworkOutDirAbs = (() => {
        const raw = (flags as any)["cowork-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCoworkOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();

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
        validationNotes?: string[];
        mcpServerCount?: number;
        settingsCount?: number;
        assetCount?: number;
        reason?: string;
      }> = [];
      const coworkPackages: Array<{ plugin: string; outFile: string; action: "planned" | "written" | "skipped"; reason?: string }> = [];
      let codexInstall: Record<string, unknown> = {
        ok: true,
        installScope,
        actions: [{ action: "skipped", installScope, reason: "not run" }],
      };
      let cleanupBehind: Awaited<ReturnType<typeof cleanupBehindProviderSync>> = emptyCleanupBehindResult();
      const claudeInstall: Array<Record<string, unknown>> = [];
      let installReconcile: Record<string, unknown> = { action: "skipped", reason: "not run" };
      let postStepFailed = false;
      const codexNativeAgentRoles = !destinationProjectionEnabled && targets.agents.includes("codex")
        ? await syncCodexNativeAgentRoles({
            sourcePlugin,
            content,
            options: {
              dryRun: baseFlags.dryRun,
              force: Boolean(flags.force),
              gc: Boolean(flags.gc),
              includeAgentsInCodex,
              undoCapture,
            },
            codexHomes: targets.homes.codexHomes,
            includeCodex: true,
          })
        : null;
      if (codexNativeAgentRoles && !codexNativeAgentRoles.ok) postStepFailed = true;
      const effectiveSyncResult = codexNativeAgentRoles
        ? {
            ...syncResult,
            targets: [...syncResult.targets, ...codexNativeAgentRoles.targets],
            projections: [...syncResult.projections, ...codexNativeAgentRoles.projections],
          }
        : syncResult;

      if (coworkEnabled) {
        try {
          const isWorkspacePlugin = path
            .resolve(sourcePlugin.absPath)
            .startsWith(path.resolve(workspaceRoot) + path.sep);
          if (!isWorkspacePlugin) {
            coworkPackages.push({
              plugin: sourcePlugin.dirName,
              outFile: path.join(coworkOutDirAbs, `${sourcePlugin.dirName}.zip`),
              action: "skipped",
              reason: "not a workspace plugin (skip cowork packaging)",
            });
          } else {
            const claudeContent = await resolveProviderContent({
              agent: "claude",
              sourcePlugin,
              base: content,
              repoRoot: workspaceRoot,
            });
            const claudeProviderVersion = await resolveProviderVersion({
              sourcePlugin,
              content: claudeContent,
              repoRoot: workspaceRoot,
            });
            const pkg = await packageCoworkPlugin({
              sourcePlugin,
              content: claudeContent,
              outDirAbs: coworkOutDirAbs,
              dryRun: baseFlags.dryRun,
              providerVersion: claudeProviderVersion.providerVersion,
              includeAgents: includeAgentsInClaude,
              undoCapture,
            });
            coworkPackages.push(pkg);
          }
        } catch (err) {
          postStepFailed = true;
          coworkPackages.push({
            plugin: sourcePlugin.dirName,
            outFile: path.join(coworkOutDirAbs, `${sourcePlugin.dirName}.zip`),
            action: "skipped",
            reason: `cowork package failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else {
        coworkPackages.push({
          plugin: sourcePlugin.dirName,
          outFile: path.join(coworkOutDirAbs, `${sourcePlugin.dirName}.zip`),
          action: "skipped",
          reason: "disabled by flag",
        });
      }

      if (codexPackageEnabled && targets.agents.includes("codex")) {
        try {
          const isWorkspacePlugin = path
            .resolve(sourcePlugin.absPath)
            .startsWith(path.resolve(workspaceRoot) + path.sep);
          if (!isWorkspacePlugin) {
            codexPackages.push({
              plugin: sourcePlugin.dirName,
              outDir: path.join(codexOutDirAbs, "plugins", sourcePlugin.dirName),
              action: "skipped",
              reason: "not a workspace plugin (skip Codex marketplace package)",
            });
          } else {
            const codexContent = await resolveProviderContent({
              agent: "codex",
              sourcePlugin,
              base: content,
              repoRoot: workspaceRoot,
            });
            const codexProviderVersion = await resolveProviderVersion({
              sourcePlugin,
              content: codexContent,
              repoRoot: workspaceRoot,
            });
            codexPackages.push(await packageCodexPlugin({
              sourcePlugin,
              content: codexContent,
              outDirAbs: codexOutDirAbs,
              dryRun: baseFlags.dryRun,
              providerVersion: codexProviderVersion.providerVersion,
              undoCapture,
            }));
          }
        } catch (err) {
          postStepFailed = true;
          codexPackages.push({
            plugin: sourcePlugin.dirName,
            outDir: path.join(codexOutDirAbs, "plugins", sourcePlugin.dirName),
            action: "skipped",
            reason: `codex package failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else {
        codexPackages.push({
          plugin: sourcePlugin.dirName,
          outDir: path.join(codexOutDirAbs, "plugins", sourcePlugin.dirName),
          action: "skipped",
          reason: codexPackageEnabled ? "no Codex target selected" : "disabled by flag",
        });
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
        sourcePluginRootsByName: new Map([[sourcePlugin.dirName, sourcePlugin.absPath]]),
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

      const claudeTargets = syncResult.targets.filter((t) => t.agent === "claude");
      if (claudeInstallEnabled && claudeTargets.length > 0) {
        for (const t of claudeTargets) {
          if (t.conflicts.length > 0 && !baseFlags.dryRun) {
            claudeInstall.push({ action: "skipped", home: t.home, plugin: sourcePlugin.dirName, installScope, reason: "sync conflicts" });
            continue;
          }
          try {
            const actions = await installAndEnableClaudePlugin({
              claudeLocalHome: t.home,
              pluginName: sourcePlugin.dirName,
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
              plugin: sourcePlugin.dirName,
              installScope,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } else if (claudeTargets.length > 0) {
        for (const t of claudeTargets) {
          claudeInstall.push({ action: "skipped", home: t.home, plugin: sourcePlugin.dirName, installScope, reason: "disabled by flag" });
        }
      }

      installReconcile = await reconcileWorkspaceInstallLinks({
        workspaceRoot,
        dryRun: baseFlags.dryRun,
        enabled: installReconcileEnabled,
        runtimePlugins,
        oclifDataDir: (this.config as any).dataDir as string | undefined,
      });
      if ((installReconcile as any).action === "failed") postStepFailed = true;

      const enriched = {
        ...effectiveSyncResult,
        installScope,
        codexNativeAgentRoles,
        codexPackage: { outDir: codexOutDirAbs, packages: codexPackages },
        codexMarketplace: summarizeCodexMarketplace(codexPackages),
        codexInstall,
        cleanupBehind,
        cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
        claudeInstall,
        installReconcile,
      };
      warnings = buildProviderWorkflowMirrorWarnings({
        cleanupBehind,
        syncTargets: effectiveSyncResult.targets,
      });

      const conflictCount = effectiveSyncResult.targets.reduce((sum, t) => sum + t.conflicts.length, 0);
      const ok = effectiveSyncResult.ok && !postStepFailed;
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
            ...enriched,
            undo,
          }, undefined, warnings.length > 0 ? warnings : undefined)
        : this.fail(conflictCount > 0 ? "Sync completed with conflicts" : "Sync completed but post-sync steps failed", {
            code: conflictCount > 0 ? "SYNC_CONFLICTS" : "SYNC_POST_STEPS_FAILED",
            details: {
              conflictCount,
              postStepFailed,
              installScope,
              codexPackage: { outDir: codexOutDirAbs, packages: codexPackages },
              codexMarketplace: summarizeCodexMarketplace(codexPackages),
              codexInstall,
              cleanupBehind,
              cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
              claudeInstall,
              installReconcile,
              warnings,
              undo,
              targets: effectiveSyncResult.targets.map((t) => ({ agent: t.agent, home: t.home, conflicts: t.conflicts.length })),
            },
          });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`Source plugin: ${effectiveSyncResult.sourcePlugin.dirName} (${effectiveSyncResult.sourcePlugin.absPath})`);
          this.log(
            `Scanned: workflows=${effectiveSyncResult.scanned.workflows.length}, skills=${effectiveSyncResult.scanned.skills.length}, scripts=${effectiveSyncResult.scanned.scripts.length}, agents=${effectiveSyncResult.scanned.agents.length}`,
          );
          for (const target of effectiveSyncResult.targets) {
            const copied = target.items.filter((i) => i.action === "copied" || i.action === "updated").length;
            const skipped = target.items.filter((i) => i.action === "skipped").length;
            const deleted = target.items.filter((i) => i.action === "deleted").length;
            const planned = target.items.filter((i) => i.action === "planned").length;
            this.log(`- ${target.agent}@${target.home}`);
            this.log(
              `  copied/updated=${copied}, skipped=${skipped}, deleted=${deleted}, planned=${planned}, conflicts=${target.conflicts.length}`,
            );
            for (const conflict of target.conflicts) {
              this.log(`  conflict: [${conflict.kind}] ${conflict.target} (${conflict.message ?? ""})`);
            }
          }
          const cowork = coworkPackages.find((p) => p.plugin === effectiveSyncResult.sourcePlugin.dirName);
          const codexPackage = codexPackages.find((p) => p.plugin === effectiveSyncResult.sourcePlugin.dirName);
          if (codexPackage) this.log(`Codex package: ${codexPackage.action} -> ${codexPackage.outDir}${codexPackage.reason ? ` (${codexPackage.reason})` : ""}`);
          if (codexPackage?.marketplacePath) this.log(`Codex marketplace: ${codexPackage.marketplaceAction} -> ${codexPackage.marketplacePath}`);
          this.log(`Codex install: ${(codexInstall as any).ok ? "ok" : "failed"}`);
          this.log(`Cleanup behind: ${cleanupBehind.ok ? "ok" : "failed"} (${cleanupBehind.actions.length} actions)`);
          for (const warning of warnings) this.log(`warning: ${warning}`);
          this.log(`Install scope: ${installScope}`);
          if (cowork) this.log(`Cowork: ${cowork.action} -> ${cowork.outFile}${cowork.reason ? ` (${cowork.reason})` : ""}`);
          this.log(`Install reconcile: ${(installReconcile as any).action}`);
          if (undo.available) this.log(`Undo: rawr undo (capsule=${undo.capsuleId})`);
        },
      });

      if (!ok) this.exit(1);
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
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

      const result = this.fail(message, { code: "SYNC_ERROR", details: { undo, warnings } });
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
