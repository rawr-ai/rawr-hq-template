import { loadLayeredRawrConfigForCwd } from "./layered-config";
import { resolveSourcePlugin } from "./resolve-source-plugin";
import { scanSourcePlugin } from "./scan-source-plugin";
import { runSync } from "./sync-engine";
import { resolveTargets } from "./targets";
import type { SyncRunResult } from "./types";

export async function runSyncFromCli(input: {
  pluginRef: string;
  cwd: string;
  agent: "codex" | "claude" | "all";
  codexHomesFromFlags: string[];
  claudeHomesFromFlags: string[];
  options: { dryRun: boolean; force: boolean; gc: boolean };
}): Promise<SyncRunResult> {
  const sourcePlugin = await resolveSourcePlugin(input.pluginRef, input.cwd);
  const content = await scanSourcePlugin(sourcePlugin);

  const layered = await loadLayeredRawrConfigForCwd(input.cwd);
  const includeAgentsInCodex = layered.config?.sync?.providers?.codex?.includeAgents ?? false;
  const includeAgentsInClaude = layered.config?.sync?.providers?.claude?.includeAgents ?? true;

  const targets = resolveTargets(
    input.agent,
    input.codexHomesFromFlags ?? [],
    input.claudeHomesFromFlags ?? [],
    layered.config,
  );

  return runSync({
    sourcePlugin,
    content,
    options: {
      dryRun: input.options.dryRun,
      force: input.options.force,
      gc: input.options.gc,
      includeAgentsInCodex,
      includeAgentsInClaude,
    },
    codexHomes: targets.homes.codexHomes,
    claudeHomes: targets.homes.claudeHomes,
    includeCodex: targets.agents.includes("codex"),
    includeClaude: targets.agents.includes("claude"),
  });
}
