import type { SourceContent, SourcePlugin } from "../../../common/entities";
import type { SyncTargetResult } from "../../../common/entities/sync-results";
import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../common/resources";
import {
  getClaimsFromOtherPlugins,
  loadCodexRegistry,
  upsertCodexRegistryAgentClaims,
} from "../../../common/repositories/codex-registry-repository";
import {
  deleteIfExists,
  syncTextWithConflictPolicy,
} from "../../../common/repositories/destination-sync-repository";
import { pushItem } from "../../../common/helpers/sync-results";
import { buildCodexAgentProjection } from "../../../common/source-content/helpers/codex-agent";

type NativeAgentRoleOptions = {
  dryRun: boolean;
  force: boolean;
  gc: boolean;
  includeAgentsInCodex?: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
};

export async function syncCodexNativeAgentRoleHomes(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  codexHomes: string[];
  options: NativeAgentRoleOptions;
}): Promise<SyncTargetResult[]> {
  const pathOps = input.options.resources.path;
  const targets: SyncTargetResult[] = [];
  const includeAgentsInCodex = input.options.includeAgentsInCodex ?? true;

  for (const codexHome of input.codexHomes) {
    const result: SyncTargetResult = { agent: "codex", home: codexHome, items: [], conflicts: [] };
    const agentsDir = pathOps.join(codexHome, "agents");

    if (!input.options.dryRun) {
      await Promise.all([
        input.options.resources.files.ensureDir(agentsDir),
        input.options.resources.files.ensureDir(pathOps.join(codexHome, "plugins")),
      ]);
    }

    const registry = await loadCodexRegistry(codexHome, input.options.resources);
    const claimedOthers = getClaimsFromOtherPlugins(
      input.sourcePlugin.dirName,
      registry.claimedSets.agentsByPlugin,
    );
    const nextAgents = new Set<string>();

    if (includeAgentsInCodex) {
      for (const agent of input.content.agentFiles) {
        const rendered = await buildCodexAgentProjection({
          agent,
          sourcePlugin: input.sourcePlugin,
          resources: input.options.resources,
        });
        nextAgents.add(agent.name);
        await syncTextWithConflictPolicy({
          content: rendered.toml,
          source: agent.absPath,
          dest: pathOps.join(agentsDir, rendered.targetName),
          kind: "agent",
          options: input.options,
          result,
          claimedByOtherPlugin: claimedOthers.has(agent.name),
        });
      }
    }

    if (input.options.gc) {
      for (const oldAgent of registry.claimedSets.agentsByPlugin[input.sourcePlugin.dirName] ?? new Set<string>()) {
        if (nextAgents.has(oldAgent) || claimedOthers.has(oldAgent)) continue;
        await deleteIfExists({
          target: pathOps.join(agentsDir, `${oldAgent}.toml`),
          kind: "agent",
          options: input.options,
          result,
        });
      }
    }

    if (!input.options.dryRun) {
      await input.options.undoCapture?.captureWriteTarget(registry.filePath);
    }
    const codexRegistry = await upsertCodexRegistryAgentClaims({
      codexHome,
      sourcePlugin: input.sourcePlugin,
      agentNames: [...nextAgents],
      dryRun: input.options.dryRun,
      existingData: registry.data,
      resources: input.options.resources,
    });
    if (codexRegistry.changed) {
      pushItem(result, {
        action: input.options.dryRun ? "planned" : "updated",
        kind: "metadata",
        target: codexRegistry.filePath,
        message: "native agent role registry upsert",
      });
    }

    targets.push(result);
  }

  return targets;
}
