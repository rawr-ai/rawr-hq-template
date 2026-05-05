import { Args, Flags } from "@oclif/core";
import {
  beginPluginsSyncUndoCapture,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncPlanInput,
  findPlannedSyncable,
  planWorkspaceSync,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveSourceWorkspaceSelection,
  runSync,
} from "../../lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "../../lib/layered-config";

/**
 * Projects RAWR plugin material to explicit filesystem destinations.
 *
 * This is the auxiliary projection/export lane. It is useful for migration,
 * repair, fixture generation, and arbitrary mapped destinations. It is not the
 * sanctioned Claude/Codex deployment path; `rawr plugins sync` owns native
 * provider plugin install.
 */
export default class PluginsExport extends RawrCommand {
  static description = "Project one RAWR plugin to explicit filesystem destinations";

  static args = {
    "plugin-ref": Args.string({
      description: "Plugin package name, dir name, or path",
      required: true,
    }),
  };

  static flags = {
    ...RawrCommand.baseFlags,
    agent: Flags.string({
      description: "Projection target shape",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to scan as the source of projection truth",
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
    const { args, flags } = await this.parseRawr(PluginsExport);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    let undoCapture: Awaited<ReturnType<typeof beginPluginsSyncUndoCapture>> | undefined;

    try {
      const pluginRef = String(args["plugin-ref"]);
      const cwd = process.cwd();
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
          agent: selectedAgent,
          codexHomes,
          claudeHomes,
          config: layered.config ?? undefined,
          fullSyncPolicy: {
            agent: selectedAgent,
            scope: "all",
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
        traceId: "plugin-plugins.agent-config-sync.plan-single-export",
      });
      const planned = findPlannedSyncable({ plan, pluginRef, cwd: workspaceRoot });
      if (!planned) {
        const result = this.fail("Unable to resolve projection source plugin", {
          code: "PLUGIN_SOURCE_NOT_FOUND",
          details: { pluginRef, skipped: plan.skipped },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      undoCapture = baseFlags.dryRun
        ? undefined
        : await beginPluginsSyncUndoCapture({
            workspaceRoot,
            commandId: "plugins export",
            argv: process.argv.slice(2),
          });

      const result = await runSync({
        sourcePlugin: planned.sourcePlugin,
        content: planned.content,
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
      });

      const undoCapsule = undoCapture ? await undoCapture.finalize({ status: result.ok ? "ready" : "ready-partial" }) : null;
      const payload = result.ok
        ? this.ok({
            deployment: false,
            projectionMode: "generic_destination_projection",
            ...result,
            undo: undoCapsule
              ? {
                  available: true,
                  provider: PLUGINS_SYNC_UNDO_PROVIDER,
                  capsuleId: undoCapsule.capsuleId,
                  expiresOn: "next unrelated command",
                }
              : { available: false },
          })
        : this.fail("Projection completed with conflicts", {
            code: "PROJECTION_CONFLICTS",
            details: {
              deployment: false,
              projectionMode: "generic_destination_projection",
              targets: result.targets.map((target) => ({
                agent: target.agent,
                home: target.home,
                conflicts: target.conflicts.length,
              })),
            },
          });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`Source plugin: ${result.sourcePlugin.dirName} (${result.sourcePlugin.absPath})`);
          this.log("Deployment: false (generic destination projection)");
          for (const target of result.targets) {
            const changed = target.items.filter((item) => item.action === "copied" || item.action === "updated").length;
            this.log(`- ${target.agent}@${target.home}: changed=${changed}, conflicts=${target.conflicts.length}`);
          }
        },
      });

      if (!result.ok) this.exit(1);
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
