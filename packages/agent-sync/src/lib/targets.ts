import os from "node:os";
import path from "node:path";

import type { RawrConfig } from "@rawr/control-plane";

import type { SyncAgent } from "./types";

export type TargetHomes = {
  codexHomes: string[];
  claudeHomes: string[];
};

function dedupe(input: string[]): string[] {
  return [...new Set(input.map((p) => path.resolve(p)))];
}

function homeDir(): string {
  // Bun's `os.homedir()` does not reliably reflect runtime changes to `HOME` in all contexts.
  // We intentionally prefer the env var so tests and callers can override deterministically.
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

function expandTilde(p: string): string {
  if (p === "~") return homeDir();
  if (p.startsWith("~/")) return path.join(homeDir(), p.slice(2));
  return p;
}

function parseEnvHomes(key: string): string[] {
  const raw = process.env[key];
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(expandTilde);
}

export function resolveTargets(
  agent: "codex" | "claude" | "all",
  codexHomesFromFlags: string[],
  claudeHomesFromFlags: string[],
  cfg?: RawrConfig | null,
): { agents: SyncAgent[]; homes: TargetHomes } {
  const codexHomesFromEnv = parseEnvHomes("RAWR_AGENT_SYNC_CODEX_HOMES");
  const claudeHomesFromEnv = parseEnvHomes("RAWR_AGENT_SYNC_CLAUDE_HOMES");

  const codeHomePrimary = process.env.CODEX_HOME ? expandTilde(process.env.CODEX_HOME) : null;
  const codeHomeMirror = process.env.CODEX_MIRROR_HOME ? expandTilde(process.env.CODEX_MIRROR_HOME) : null;

  const codexHomesFromConfig = (cfg?.sync?.providers?.codex?.destinations ?? [])
    .filter((d) => d.enabled !== false && typeof d.rootPath === "string" && d.rootPath.length > 0)
    .map((d) => expandTilde(d.rootPath!));

  const claudeHomesFromConfig = (cfg?.sync?.providers?.claude?.destinations ?? [])
    .filter((d) => d.enabled !== false && typeof d.rootPath === "string" && d.rootPath.length > 0)
    .map((d) => expandTilde(d.rootPath!));

  const codexHomesFromEnv2 =
    codexHomesFromEnv.length > 0
      ? codexHomesFromEnv
      : dedupe([codeHomePrimary, codeHomeMirror].filter(Boolean) as string[]);

  const codexFallback =
    codexHomesFromEnv2.length > 0
      ? codexHomesFromEnv2
      : codexHomesFromConfig.length > 0
        ? dedupe(codexHomesFromConfig)
        : [path.join(homeDir(), ".codex-rawr"), path.join(homeDir(), ".codex")];

  const claudeHomeFromEnvVar = process.env.CLAUDE_PLUGINS_LOCAL
    ? expandTilde(process.env.CLAUDE_PLUGINS_LOCAL)
    : null;

  const claudeHomesFromEnv2 =
    claudeHomesFromEnv.length > 0
      ? claudeHomesFromEnv
      : claudeHomeFromEnvVar
        ? [claudeHomeFromEnvVar]
        : [];

  const defaultClaudeHomes =
    claudeHomesFromEnv2.length > 0
      ? claudeHomesFromEnv2
      : claudeHomesFromConfig.length > 0
        ? dedupe(claudeHomesFromConfig)
        : [expandTilde(path.join(homeDir(), ".claude", "plugins", "local"))];

  const codexHomes = dedupe(
    (codexHomesFromFlags.length > 0 ? codexHomesFromFlags : codexFallback).map(expandTilde),
  );
  const claudeHomes = dedupe(
    (claudeHomesFromFlags.length > 0 ? claudeHomesFromFlags : defaultClaudeHomes).map(expandTilde),
  );

  const agents: SyncAgent[] =
    agent === "all" ? ["codex", "claude"] : [agent];

  return {
    agents,
    homes: { codexHomes, claudeHomes },
  };
}
