import os from "node:os";
import path from "node:path";

import type {
  AgentConfigSyncHostResolvedConfig,
  AgentConfigSyncProvider,
} from "./types";

export type TargetHomes = {
  codexHomes: string[];
  claudeHomes: string[];
};

function dedupePaths(paths: string[]): string[] {
  return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

function homeDir(): string {
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

function expandTilde(inputPath: string): string {
  if (inputPath === "~") return homeDir();
  if (inputPath.startsWith("~/")) return path.join(homeDir(), inputPath.slice(2));
  return inputPath;
}

function parseEnvHomes(key: string): string[] {
  const rawValue = process.env[key];
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(expandTilde);
}

export function resolveTargets(
  agent: AgentConfigSyncProvider | "all",
  codexHomesFromFlags: string[],
  claudeHomesFromFlags: string[],
  config?: AgentConfigSyncHostResolvedConfig,
): { agents: AgentConfigSyncProvider[]; homes: TargetHomes } {
  const codexHomesFromEnv = parseEnvHomes("RAWR_AGENT_SYNC_CODEX_HOMES");
  const claudeHomesFromEnv = parseEnvHomes("RAWR_AGENT_SYNC_CLAUDE_HOMES");

  const codeHomePrimary = process.env.CODEX_HOME
    ? expandTilde(process.env.CODEX_HOME)
    : null;
  const codeHomeMirror = process.env.CODEX_MIRROR_HOME
    ? expandTilde(process.env.CODEX_MIRROR_HOME)
    : null;

  const codexHomesFromConfig = (config?.sync?.providers?.codex?.destinations ?? [])
    .filter(
      (destination) =>
        destination.enabled !== false &&
        typeof destination.rootPath === "string" &&
        destination.rootPath.length > 0,
    )
    .map((destination) => expandTilde(destination.rootPath!));

  const claudeHomesFromConfig = (config?.sync?.providers?.claude?.destinations ?? [])
    .filter(
      (destination) =>
        destination.enabled !== false &&
        typeof destination.rootPath === "string" &&
        destination.rootPath.length > 0,
    )
    .map((destination) => expandTilde(destination.rootPath!));

  const codexHomesFromEnvironment =
    codexHomesFromEnv.length > 0
      ? codexHomesFromEnv
      : dedupePaths([codeHomePrimary, codeHomeMirror].filter(Boolean) as string[]);

  const codexFallbackHomes =
    codexHomesFromEnvironment.length > 0
      ? codexHomesFromEnvironment
      : codexHomesFromConfig.length > 0
        ? dedupePaths(codexHomesFromConfig)
        : [path.join(homeDir(), ".codex-rawr"), path.join(homeDir(), ".codex")];

  const claudeHomeFromEnvVar = process.env.CLAUDE_PLUGINS_LOCAL
    ? expandTilde(process.env.CLAUDE_PLUGINS_LOCAL)
    : null;

  const claudeHomesFromEnvironment =
    claudeHomesFromEnv.length > 0
      ? claudeHomesFromEnv
      : claudeHomeFromEnvVar
        ? [claudeHomeFromEnvVar]
        : [];

  const defaultClaudeHomes =
    claudeHomesFromEnvironment.length > 0
      ? claudeHomesFromEnvironment
      : claudeHomesFromConfig.length > 0
        ? dedupePaths(claudeHomesFromConfig)
        : [expandTilde(path.join(homeDir(), ".claude", "plugins", "local"))];

  const codexHomes = dedupePaths(
    (codexHomesFromFlags.length > 0 ? codexHomesFromFlags : codexFallbackHomes).map(expandTilde),
  );
  const claudeHomes = dedupePaths(
    (claudeHomesFromFlags.length > 0 ? claudeHomesFromFlags : defaultClaudeHomes).map(
      expandTilde,
    ),
  );

  const agents: AgentConfigSyncProvider[] =
    agent === "all" ? ["codex", "claude"] : [agent];

  return {
    agents,
    homes: { codexHomes, claudeHomes },
  };
}
