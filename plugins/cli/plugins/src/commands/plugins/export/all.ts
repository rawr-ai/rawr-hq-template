import { Flags } from "@oclif/core";
import {
  beginPluginsSyncUndoCapture,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  planWorkspaceSync,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveSourceWorkspaceSelection,
  runSync,
  type SyncScope,
} from "#lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "#lib/layered-config";

/**
 * Projects all selected RAWR plugin material to explicit filesystem
 * destinations. This command intentionally avoids native provider install.
 */
export default class PluginsExportAll extends RawrCommand {
  static description = "Project all selected RAWR plugins to explicit filesystem destinations";

  static flags = {
    ...RawrCommand.baseFlags,
    "include-oclif": Flags.boolean({
      description: "Include installed/linked oclif plugins as projection sources",
      default: true,
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to scan as the source of projection truth",
    }),
    agent: Flags.string({
      description: "Projection target shape",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    scope: Flags.string({
      description: "Source plugin scope",
      options: ["all", "agents", "cli", "web"],
      default: "all",
    }),
    "codex-home": Flags.string({
      description: "Codex-shaped projection destination (repeatable)",
      multiple: true,
    }),
    "claude-home": Flags.string({
      description: "Claude-shaped projection destination (repeatable)",
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
    const { flags } = await this.parseRawr(PluginsExportAll);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    let undoCapture: Awaited<ReturnType<typeof beginPluginsSyncUndoCapture>> | undefined;

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
      const layered = sourceWorkspace.external
        ? await loadLayeredRawrConfigForCwd(workspaceRoot)
        : invocationLayered;
      const includeOclif = Boolean((flags as any)["include-oclif"]) && !sourceWorkspace.external;
      const scope = String((flags as any).scope) as SyncScope;
      const selectedAgent = String(flags.agent) as "codex" | "claude" | "all";
      const codexHomes = (flags["codex-home"] as string[] | undefined) ?? [];
      const claudeHomes = (flags["claude-home"] as string[] | undefined) ?? [];
      const missingProjectionDestinations = requiredProjectionDestinationMessages({
        agent: selectedAgent,
        codexHomes,
        claudeHomes,
      });
      if (missingProjectionDestinations.length > 0) {
        const result = this.fail("Generic projection requires explicit destination homes", {
          code: "PROJECTION_DESTINATION_REQUIRED",
          details: {
            missing: missingProjectionDestinations,
          },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const plan = await planWorkspaceSync({
        repoRoot: workspaceRoot,
        request: createWorkspaceSyncPlanInput({
          cwd: workspaceRoot,
          workspaceRoot,
          sourcePaths: collectWorkspaceSourcePaths({
            config: layered.config ?? undefined,
            includeOclif,
            configPlugins: this.config.plugins,
          }),
          includeMetadata: true,
          scope,
          agent: selectedAgent,
          codexHomes,
          claudeHomes,
          config: layered.config ?? undefined,
          fullSyncPolicy: {
            agent: selectedAgent,
            scope,
            coworkEnabled: false,
            claudeInstallEnabled: false,
            claudeEnableEnabled: false,
            installReconcileEnabled: false,
            retireOrphansEnabled: false,
            force: Boolean(flags.force),
            gc: Boolean(flags.gc),
            allowPartial: true,
          },
        }),
        traceId: "plugin-plugins.agent-config-sync.plan-export-all",
      });

      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins export all",
            argv: process.argv.slice(2),
          });

      const results: Array<Awaited<ReturnType<typeof runSync>>> = [];
      for (const item of plan.syncable) {
        results.push(await runSync({
          sourcePlugin: item.sourcePlugin,
          content: item.content,
          options: {
            dryRun: baseFlags.dryRun,
            force: Boolean(flags.force),
            gc: Boolean(flags.gc),
            includeAgentsInCodex: plan.includeAgentsInCodex,
            includeAgentsInClaude: plan.includeAgentsInClaude,
            undoCapture,
          },
          codexHomes: plan.targetHomes.codexHomes,
          claudeHomes: plan.targetHomes.claudeHomes,
          includeCodex: plan.agents.includes("codex"),
          includeClaude: plan.agents.includes("claude"),
        }));
      }

      const ok = results.every((result) => result.ok);
      const undoCapsule = undoCapture ? await undoCapture.finalize({ status: ok ? "ready" : "ready-partial" }) : null;
      const payload = ok
        ? this.ok({
            deployment: false,
            projectionMode: "generic_destination_projection",
            workspaceRoot,
            scope,
            skipped: plan.skipped,
            results,
            undo: undoCapsule
              ? {
                  available: true,
                  provider: PLUGINS_SYNC_UNDO_PROVIDER,
                  capsuleId: undoCapsule.capsuleId,
                  expiresOn: "next unrelated command",
                }
              : { available: false },
          })
        : this.fail("Projection-all completed with conflicts", {
            code: "PROJECTION_CONFLICTS",
            details: {
              deployment: false,
              projectionMode: "generic_destination_projection",
              conflictPlugins: results
                .filter((result) => !result.ok)
                .map((result) => ({
                  dirName: result.sourcePlugin.dirName,
                  conflicts: result.targets.reduce((sum, target) => sum + target.conflicts.length, 0),
                })),
            },
          });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log("Deployment: false (generic destination projection)");
          this.log(`projected: ${results.length}`);
          for (const result of results) {
            const conflicts = result.targets.reduce((sum, target) => sum + target.conflicts.length, 0);
            this.log(`- ${result.sourcePlugin.dirName}: conflicts=${conflicts}`);
          }
        },
      });

      if (!ok) this.exit(1);
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "PROJECTION_ERROR" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}

function requiredProjectionDestinationMessages(input: {
  agent: "codex" | "claude" | "all";
  codexHomes: string[];
  claudeHomes: string[];
}): string[] {
  const messages: string[] = [];
  if ((input.agent === "codex" || input.agent === "all") && input.codexHomes.length === 0) {
    messages.push("pass --codex-home for Codex-shaped projection, or use --agent claude");
  }
  if ((input.agent === "claude" || input.agent === "all") && input.claudeHomes.length === 0) {
    messages.push("pass --claude-home for Claude-shaped projection, or use --agent codex");
  }
  return messages;
}
