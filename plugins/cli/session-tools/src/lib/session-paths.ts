import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SessionStatus } from "@rawr/session-intelligence/schemas";

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export function expandHomePath(value: string): string {
  return value.startsWith("~/") ? path.join(os.homedir(), value.slice(2)) : value;
}

export function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function getCodexHomeDirs(): string[] {
  const homes: string[] = [];
  const envHome = process.env.CODEX_HOME;
  if (envHome && envHome.trim()) homes.push(envHome.trim());
  homes.push(path.join(os.homedir(), ".codex"));
  homes.push(path.join(os.homedir(), ".codex-rawr"));
  return [...new Set(homes)];
}

export function defaultSessionIndexPathSync(): string {
  const override = process.env.RAWR_SESSION_INDEX_PATH;
  if (override && override.trim()) return override.trim();
  return path.join(os.homedir(), ".cache", "rawr-session-index.sqlite");
}

function parsePositiveNumberEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function codexDiscoveryMaxAgeMs(status: SessionStatus): number {
  const shared = parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_MAX_AGE_MS");
  if (shared != null) return shared;
  if (status === "live") {
    return parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS") ?? DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
  }
  return parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS") ?? DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS;
}
