import { Flags } from "@oclif/core";
import {
  assessWorkspaceSync,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncAssessInput,
  resolveSourceWorkspaceSelection,
  type SyncScope,
} from "../../lib/agent-config-sync";
import { loadLayeredRawrConfigForCwd } from "../../lib/layered-config";
import { RawrCommand } from "@rawr/core";

type OverallStatus = "HEALTHY" | "NEEDS_CONVERGENCE";

/** Read-only status for provider/content sync. External CLI state is separate. */
export default class PluginsStatus extends RawrCommand {
  static description = "Report provider content sync drift without mutating external CLI state";

  static flags = {
    ...RawrCommand.baseFlags,
    "no-fail": Flags.boolean({
      description: "Do not return non-zero when drift is detected",
      default: false,
    }),
    "material-only": Flags.boolean({
      description: "Ignore metadata-only sync drift (registry/manifest upserts)",
      default: false,
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to scan as the source of sync truth",
    }),
    "destination-projection": Flags.boolean({
      description: "Include explicit filesystem destination projection in sync status",
      default: false,
      allowNo: true,
    }),
    agent: Flags.string({
      description: "Sync status target agent",
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
    const includeMetadata = !(flags as any)["material-only"];
    const noFail = Boolean((flags as any)["no-fail"]);

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
      const sync = await assessWorkspaceSync({
        repoRoot: workspaceRoot,
        request: createWorkspaceSyncAssessInput({
          cwd: workspaceRoot,
          workspaceRoot,
          sourcePaths: collectWorkspaceSourcePaths({
            config: layered.config ?? undefined,
            includeOclif: false,
            configPlugins: [],
          }),
          includeMetadata,
          scope: String((flags as any).scope) as SyncScope,
          agent: String(flags.agent) as "codex" | "claude" | "all",
          codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
          claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
          config: layered.config ?? undefined,
          includeCodexDestinationProjection: Boolean((flags as any)["destination-projection"]),
        }),
        traceId: "plugin-plugins.agent-config-sync.assess-status",
      });

      const overall: OverallStatus = sync.status === "IN_SYNC" ? "HEALTHY" : "NEEDS_CONVERGENCE";
      const sourceWorkspaceArg = sourceWorkspace.selectedBy === "flag"
        ? ` --source-workspace ${sourceWorkspace.sourceWorkspaceRoot}`
        : "";
      const actions: Array<{ command: string; reason: string }> = [];
      if (sync.status !== "IN_SYNC") {
        actions.push({
          command: `rawr plugins sync all --json${sourceWorkspaceArg}`,
          reason: "Converge content sync drift and refresh provider-side artifacts",
        });
      }
      if (sync.summary.totalSemanticSupportResiduals > 0) {
        actions.push({
          command: `rawr plugins sync drift --include-items --json${sourceWorkspaceArg}`,
          reason: "Inspect semantic support residuals before claiming provider runtime parity",
        });
      }

      const payload = this.ok({
        workspaceRoot,
        statuses: { sync: sync.status, overall },
        sync,
        actions,
      });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`sync: ${sync.status}`);
          this.log(`overall: ${overall}`);
          this.log(`material projection residuals: ${sync.summary.totalMaterialProjectionResiduals}`);
          this.log(`semantic support residuals: ${sync.summary.totalSemanticSupportResiduals}`);
          if (actions.length > 0) {
            this.log("actions:");
            for (const action of actions) this.log(`- ${action.command} (${action.reason})`);
          }
        },
      });

      if (!noFail && overall !== "HEALTHY") this.exit(1);
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "PLUGINS_STATUS_FAILED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
