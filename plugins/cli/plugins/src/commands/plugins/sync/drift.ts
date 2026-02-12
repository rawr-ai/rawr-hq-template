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

type DriftItem = Pick<SyncItemResult, "action" | "kind" | "target" | "message">;

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
      const { workspaceRoot, syncable, skipped } = await planSyncAll(process.cwd());
      const layered = await loadLayeredRawrConfigForCwd(process.cwd());
      const includeOclif = Boolean((flags as any)["include-oclif"]);
      const includeMetadata = Boolean((flags as any)["include-metadata"]);
      const includeItems = Boolean((flags as any)["include-items"]);
      const failOnDrift = Boolean((flags as any)["fail-on-drift"]);
      const scope = String((flags as any).scope) as SyncScope;
      const includeAgentsInCodex = layered.config?.sync?.providers?.codex?.includeAgents ?? false;
      const includeAgentsInClaude = layered.config?.sync?.providers?.claude?.includeAgents ?? true;

      const extraSourcePaths: string[] = [];
      for (const p of layered.config?.sync?.sources?.paths ?? []) extraSourcePaths.push(String(p));

      if (includeOclif) {
        for (const pl of this.config.plugins ?? []) {
          const root = (pl as any).root as string | undefined;
          if (!root) continue;
          extraSourcePaths.push(root.endsWith("package.json") ? path.dirname(root) : root);
        }
      }

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

      const plugins: Array<{
        dirName: string;
        absPath: string;
        conflicts: number;
        materialChanges: number;
        metadataChanges: number;
        driftItems: DriftItem[];
        targets: Array<{
          agent: string;
          home: string;
          conflicts: number;
          materialChanges: number;
          metadataChanges: number;
          driftItems: DriftItem[];
        }>;
      }> = [];

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

        const pluginEntry = {
          dirName: sourcePlugin.dirName,
          absPath: sourcePlugin.absPath,
          conflicts: 0,
          materialChanges: 0,
          metadataChanges: 0,
          driftItems: [] as DriftItem[],
          targets: [] as Array<{
            agent: string;
            home: string;
            conflicts: number;
            materialChanges: number;
            metadataChanges: number;
            driftItems: DriftItem[];
          }>,
        };

        for (const target of run.targets) {
          totalTargets += 1;
          const conflicts = target.conflicts.length;
          const nonSkipped = target.items.filter((item) => item.action !== "skipped");
          const metadataChanges = nonSkipped.filter((item) => item.kind === "metadata").length;
          const materialItems = nonSkipped.filter((item) => item.kind !== "metadata");
          const driftItems = nonSkipped.filter((item) => includeMetadata || item.kind !== "metadata");
          const renderedDriftItems = includeItems
            ? driftItems.map((item) => ({
                action: item.action,
                kind: item.kind,
                target: item.target,
                message: item.message,
              }))
            : [];

          pluginEntry.conflicts += conflicts;
          pluginEntry.materialChanges += materialItems.length;
          pluginEntry.metadataChanges += metadataChanges;
          pluginEntry.driftItems.push(...renderedDriftItems);

          totalConflicts += conflicts;
          totalMaterialChanges += materialItems.length;
          totalMetadataChanges += metadataChanges;
          totalDriftItems += driftItems.length;

          pluginEntry.targets.push({
            agent: target.agent,
            home: target.home,
            conflicts,
            materialChanges: materialItems.length,
            metadataChanges,
            driftItems: renderedDriftItems,
          });
        }

        plugins.push(pluginEntry);
      }

      const inSync = totalConflicts === 0 && totalDriftItems === 0;
      const payload = this.ok({
        workspaceRoot,
        scope,
        includeMetadata,
        includeItems,
        includeOclif,
        skipped: mergedSkipped,
        summary: {
          inSync,
          totalPlugins: plugins.length,
          totalTargets,
          totalConflicts,
          totalMaterialChanges,
          totalMetadataChanges,
          totalDriftItems,
        },
        plugins,
      });

      this.outputResult(payload, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`scope: ${scope}`);
          this.log(`status: ${inSync ? "IN_SYNC" : "DRIFT_DETECTED"}`);
          this.log(
            `summary: plugins=${plugins.length} targets=${totalTargets} materialChanges=${totalMaterialChanges} metadataChanges=${totalMetadataChanges} conflicts=${totalConflicts}`,
          );
          if (!inSync) {
            this.log("drift:");
            for (const plugin of plugins) {
              if (plugin.conflicts === 0 && plugin.driftItems.length === 0) continue;
              this.log(
                `- ${plugin.dirName}: material=${plugin.materialChanges} metadata=${plugin.metadataChanges} conflicts=${plugin.conflicts}`,
              );
              for (const target of plugin.targets) {
                if (target.conflicts === 0 && target.driftItems.length === 0) continue;
                this.log(
                  `  - ${target.agent}@${target.home}: material=${target.materialChanges} metadata=${target.metadataChanges} conflicts=${target.conflicts}`,
                );
              }
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
