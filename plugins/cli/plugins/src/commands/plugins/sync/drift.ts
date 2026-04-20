import { Flags } from "@oclif/core";
import {
  assessWorkspaceSync,
  collectWorkspaceSourcePaths,
  createWorkspaceSyncAssessInput,
  type SyncScope,
} from "../../../lib/agent-config-sync";
import { RawrCommand } from "@rawr/core";
import { loadLayeredRawrConfigForCwd } from "../../../lib/layered-config";
import { findWorkspaceRoot } from "@rawr/core";

/**
 * Reports destination drift by asking agent-config-sync to assess source plugins
 * against configured Codex/Claude homes.
 */
export default class PluginsSyncDrift extends RawrCommand {
  static description =
    "Check whether plugin targets are out of sync (includes metadata drift by default)";

  static flags = {
    ...RawrCommand.baseFlags,
    "include-oclif": Flags.boolean({
      description: "Include installed/linked oclif plugins as sync sources",
      default: true,
    }),
    "include-metadata": Flags.boolean({
      description: "Count metadata upserts (registry/manifest updates) as drift",
      default: true,
      allowNo: true,
    }),
    "include-items": Flags.boolean({
      description: "Include per-file drift items in JSON output",
      default: false,
    }),
    "fail-on-drift": Flags.boolean({
      description: "Exit non-zero when drift is detected",
      default: true,
      allowNo: true,
    }),
    agent: Flags.string({
      description: "Drift-check target agent",
      options: ["codex", "claude", "all"],
      default: "all",
    }),
    scope: Flags.string({
      description: "Source plugin scope",
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
    const { flags } = await this.parseRawr(PluginsSyncDrift);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    try {
      const cwd = process.cwd();
      const layered = await loadLayeredRawrConfigForCwd(process.cwd());
      const includeOclif = Boolean((flags as any)["include-oclif"]);
      const includeMetadata = Boolean((flags as any)["include-metadata"]);
      const includeItems = Boolean((flags as any)["include-items"]);
      const failOnDrift = Boolean((flags as any)["fail-on-drift"]);
      const scope = String((flags as any).scope) as SyncScope;
      const workspaceRoot = await findWorkspaceRoot(cwd);
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }
      const assessment = await assessWorkspaceSync({
        repoRoot: workspaceRoot,
        request: createWorkspaceSyncAssessInput({
          cwd,
          sourcePaths: collectWorkspaceSourcePaths({
            config: layered.config ?? undefined,
            includeOclif,
            configPlugins: this.config.plugins,
          }),
          includeMetadata,
          scope,
          agent: String(flags.agent) as "codex" | "claude" | "all",
          codexHomes: (flags["codex-home"] as string[] | undefined) ?? [],
          claudeHomes: (flags["claude-home"] as string[] | undefined) ?? [],
          config: layered.config ?? undefined,
        }),
        traceId: "plugin-plugins.agent-config-sync.assess-workspace-drift",
      });
      const plugins = includeItems
        ? assessment.plugins
        : assessment.plugins.map((plugin) => ({ ...plugin, driftItems: [] }));
      const inSync = assessment.status === "IN_SYNC";
      const payload = this.ok({
        workspaceRoot,
        scope,
        includeMetadata,
        includeItems,
        includeOclif,
        skipped: assessment.skipped,
        summary: { inSync, ...assessment.summary },
        plugins,
      });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`scope: ${scope}`);
          this.log(`status: ${assessment.status}`);
          this.log(
            `summary: plugins=${plugins.length} targets=${assessment.summary.totalTargets} materialChanges=${assessment.summary.totalMaterialChanges} metadataChanges=${assessment.summary.totalMetadataChanges} conflicts=${assessment.summary.totalConflicts}`,
          );
          if (!inSync) {
            this.log("drift:");
            for (const plugin of plugins) {
              if (plugin.conflicts === 0 && plugin.driftItems.length === 0) continue;
              this.log(
                `- ${plugin.dirName}: material=${plugin.materialChanges} metadata=${plugin.metadataChanges} conflicts=${plugin.conflicts}`,
              );
            }
          }
        },
      });

      if (!inSync && failOnDrift) {
        this.exit(1);
        return;
      }
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "SYNC_DRIFT_CHECK_FAILED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
