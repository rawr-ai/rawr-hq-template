import fs from "node:fs/promises";
import path from "node:path";
import type { RepoState } from "./types.js";

export function defaultRepoState(nowIso = new Date().toISOString()): RepoState {
  return {
    version: 1,
    plugins: { enabled: [], lastUpdatedAt: nowIso },
  };
}

export function statePath(repoRoot: string): string {
  return path.join(repoRoot, ".rawr", "state", "state.json");
}

export async function getRepoState(repoRoot: string): Promise<RepoState> {
  const p = statePath(repoRoot);
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw) as RepoState;
    if (parsed?.version !== 1) return defaultRepoState();
    if (!parsed.plugins || !Array.isArray(parsed.plugins.enabled)) return defaultRepoState();
    return parsed;
  } catch {
    return defaultRepoState();
  }
}

export async function setRepoState(repoRoot: string, nextState: RepoState): Promise<void> {
  const p = statePath(repoRoot);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(nextState, null, 2), "utf8");
}

export async function enablePlugin(repoRoot: string, pluginId: string): Promise<RepoState> {
  const now = new Date().toISOString();
  const current = await getRepoState(repoRoot);
  const next: RepoState = {
    ...current,
    plugins: {
      ...current.plugins,
      enabled: Array.from(new Set([...current.plugins.enabled, pluginId])).sort(),
      lastUpdatedAt: now,
    },
  };
  await setRepoState(repoRoot, next);
  return next;
}

export async function disablePlugin(repoRoot: string, pluginId: string): Promise<RepoState> {
  const now = new Date().toISOString();
  const current = await getRepoState(repoRoot);
  const nextEnabled = current.plugins.enabled.filter((id) => id !== pluginId);
  const next: RepoState = {
    ...current,
    plugins: {
      ...current.plugins,
      enabled: nextEnabled,
      lastUpdatedAt: now,
    },
  };
  await setRepoState(repoRoot, next);
  return next;
}

