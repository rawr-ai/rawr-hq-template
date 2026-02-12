import path from "node:path";

import { Args, Flags } from "@oclif/core";
import {
  PLUGINS_SYNC_UNDO_PROVIDER,
  beginPluginsSyncUndoCapture,
  effectiveContentForProvider,
  findWorkspaceRoot,
  installAndEnableClaudePlugin,
  loadLayeredRawrConfigForCwd,
  packageCoworkPlugin,
  resolveDefaultCoworkOutDir,
  resolveSourcePlugin,
  resolveTargets,
  runSync,
  scanSourcePlugin,
} from "@rawr/agent-sync";
import { RawrCommand } from "@rawr/core";
import { reconcileWorkspaceInstallLinks } from "../../lib/install-reconcile";

export default class PluginsSync extends RawrCommand {
  static description = "Sync plugin skills/workflows/scripts from RAWR HQ to Codex and Claude targets";

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
    "codex-home": Flags.string({
      description: "Codex home path (repeatable)",
      multiple: true,
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

    try {
      const pluginRef = String(args["plugin-ref"]);
      const cwd = process.cwd();

      const workspaceRoot = await findWorkspaceRoot(cwd);
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const sourcePlugin = await resolveSourcePlugin(pluginRef, cwd);
      const content = await scanSourcePlugin(sourcePlugin);
      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins sync",
            argv: process.argv.slice(2),
          });

      const layered = await loadLayeredRawrConfigForCwd(cwd);
      const includeAgentsInCodex = layered.config?.sync?.providers?.codex?.includeAgents ?? false;
      const includeAgentsInClaude = layered.config?.sync?.providers?.claude?.includeAgents ?? true;

      const targets = resolveTargets(
        String(flags.agent) as "codex" | "claude" | "all",
        (flags["codex-home"] as string[] | undefined) ?? [],
        (flags["claude-home"] as string[] | undefined) ?? [],
        layered.config,
      );

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
        includeCodex: targets.agents.includes("codex"),
        includeClaude: targets.agents.includes("claude"),
      });

      const coworkEnabled = Boolean((flags as any).cowork);
      const claudeInstallEnabled = Boolean((flags as any)["claude-install"]);
      const claudeEnableEnabled = Boolean((flags as any)["claude-enable"]);
      const installReconcileEnabled = Boolean((flags as any)["install-reconcile"]);
      const runtimePluginValues = this.config.plugins instanceof Map
        ? [...this.config.plugins.values()]
        : Array.isArray(this.config.plugins)
          ? this.config.plugins
          : [];

      const coworkOutDirAbs = (() => {
        const raw = (flags as any)["cowork-out"] as string | undefined;
        if (!raw || raw.trim().length === 0) return resolveDefaultCoworkOutDir(workspaceRoot);
        const candidate = raw.trim();
        return path.isAbsolute(candidate) ? candidate : path.resolve(workspaceRoot, candidate);
      })();

      const coworkPackages: Array<{ plugin: string; outFile: string; action: "planned" | "written" | "skipped"; reason?: string }> = [];
      const claudeInstall: Array<Record<string, unknown>> = [];
      let installReconcile: Record<string, unknown> = { action: "skipped", reason: "not run" };
      let postStepFailed = false;

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
            const claudeContent = await effectiveContentForProvider({ agent: "claude", sourcePlugin, base: content });
            const pkg = await packageCoworkPlugin({
              sourcePlugin,
              content: claudeContent,
              outDirAbs: coworkOutDirAbs,
              dryRun: baseFlags.dryRun,
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

      const claudeTargets = syncResult.targets.filter((t) => t.agent === "claude");
      if (claudeInstallEnabled && claudeTargets.length > 0) {
        for (const t of claudeTargets) {
          if (t.conflicts.length > 0 && !baseFlags.dryRun) {
            claudeInstall.push({ action: "skipped", home: t.home, plugin: sourcePlugin.dirName, reason: "sync conflicts" });
            continue;
          }
          try {
            const actions = await installAndEnableClaudePlugin({
              claudeLocalHome: t.home,
              pluginName: sourcePlugin.dirName,
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
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } else if (claudeTargets.length > 0) {
        for (const t of claudeTargets) {
          claudeInstall.push({ action: "skipped", home: t.home, plugin: sourcePlugin.dirName, reason: "disabled by flag" });
        }
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

      const enriched = {
        ...syncResult,
        cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
        claudeInstall,
        installReconcile,
      };

      const conflictCount = syncResult.targets.reduce((sum, t) => sum + t.conflicts.length, 0);
      const ok = syncResult.ok && !postStepFailed;
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
          })
        : this.fail(conflictCount > 0 ? "Sync completed with conflicts" : "Sync completed but post-sync steps failed", {
            code: conflictCount > 0 ? "SYNC_CONFLICTS" : "SYNC_POST_STEPS_FAILED",
            details: {
              conflictCount,
              postStepFailed,
              cowork: { outDir: coworkOutDirAbs, packages: coworkPackages },
              claudeInstall,
              installReconcile,
              undo,
              targets: syncResult.targets.map((t) => ({ agent: t.agent, home: t.home, conflicts: t.conflicts.length })),
            },
          });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`Source plugin: ${syncResult.sourcePlugin.dirName} (${syncResult.sourcePlugin.absPath})`);
          this.log(
            `Scanned: workflows=${syncResult.scanned.workflows.length}, skills=${syncResult.scanned.skills.length}, scripts=${syncResult.scanned.scripts.length}, agents=${syncResult.scanned.agents.length}`,
          );
          for (const target of syncResult.targets) {
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
          const cowork = coworkPackages.find((p) => p.plugin === syncResult.sourcePlugin.dirName);
          if (cowork) this.log(`Cowork: ${cowork.action} -> ${cowork.outFile}${cowork.reason ? ` (${cowork.reason})` : ""}`);
          this.log(`Install reconcile: ${(installReconcile as any).action}`);
          if (undo.available) this.log(`Undo: rawr undo (capsule=${undo.capsuleId})`);
        },
      });

      if (!ok) this.exit(1);
    } catch (error) {
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

      const result = this.fail(message, { code: "SYNC_ERROR", details: { undo } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
