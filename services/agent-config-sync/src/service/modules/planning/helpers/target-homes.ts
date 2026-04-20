import path from "node:path";

import type { SyncAgentSelection, TargetHomeCandidates, TargetHomes } from "../contract";

function dedupePaths(paths: string[]): string[] {
  return [...new Set(paths.map((entry) => path.resolve(entry)))];
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
      ),
      claudeHomes: dedupePaths(
        input.candidates.claudeHomesFromFlags.length > 0
          ? input.candidates.claudeHomesFromFlags
          : claudeFallbackHomes,
      ),
    },
  };
}
