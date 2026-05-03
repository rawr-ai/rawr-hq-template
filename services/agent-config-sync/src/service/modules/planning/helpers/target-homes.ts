import type { SyncAgentSelection, TargetHomeCandidates, TargetHomes } from "../entities";
import type { AgentConfigSyncPathResources } from "../../../shared/resources";

function dedupePaths(paths: string[], pathOps: AgentConfigSyncPathResources): string[] {
  return [...new Set(paths.map((entry) => pathOps.resolve(entry)))];
}

function enabledDestinationRoots(destinations: TargetHomeCandidates["codexHomesFromConfig"]): string[] {
  return destinations
    .filter((destination) => destination.enabled !== false && typeof destination.rootPath === "string")
    .map((destination) => destination.rootPath)
    .filter((rootPath): rootPath is string => Boolean(rootPath));
}

export function resolveTargetHomes(input: {
  agent: SyncAgentSelection;
  candidates: TargetHomeCandidates;
  pathOps: AgentConfigSyncPathResources;
}): { agents: Array<"codex" | "claude">; homes: TargetHomes } {
  const codexConfigHomes = enabledDestinationRoots(input.candidates.codexHomesFromConfig);
  const claudeConfigHomes = enabledDestinationRoots(input.candidates.claudeHomesFromConfig);

  const codexFallbackHomes =
    input.candidates.codexHomesFromEnvironment.length > 0
      ? input.candidates.codexHomesFromEnvironment
      : codexConfigHomes.length > 0
        ? codexConfigHomes
        : input.candidates.codexDefaultHomes;

  const claudeFallbackHomes =
    input.candidates.claudeHomesFromEnvironment.length > 0
      ? input.candidates.claudeHomesFromEnvironment
      : claudeConfigHomes.length > 0
        ? claudeConfigHomes
        : input.candidates.claudeDefaultHomes;

  return {
    agents: input.agent === "all" ? ["codex", "claude"] : [input.agent],
    homes: {
      codexHomes: dedupePaths(
        input.candidates.codexHomesFromFlags.length > 0
          ? input.candidates.codexHomesFromFlags
          : codexFallbackHomes,
        input.pathOps,
      ),
      claudeHomes: dedupePaths(
        input.candidates.claudeHomesFromFlags.length > 0
          ? input.candidates.claudeHomesFromFlags
          : claudeFallbackHomes,
        input.pathOps,
      ),
    },
  };
}
