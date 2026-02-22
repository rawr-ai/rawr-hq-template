import fs from "node:fs/promises";
import path from "node:path";
import type {
  RepoState,
  RepoStateMutationOptions,
  RepoStateMutationResult,
  RepoStateMutator,
} from "./types.js";

const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_LOCK_RETRY_DELAY_MS = 25;
const DEFAULT_STALE_LOCK_MS = 60_000;

const localMutationQueues = new Map<string, Promise<void>>();

export function defaultRepoState(nowIso = new Date().toISOString()): RepoState {
  return {
    version: 1,
    plugins: { enabled: [], lastUpdatedAt: nowIso },
  };
}

export function statePath(repoRoot: string): string {
  return path.join(repoRoot, ".rawr", "state", "state.json");
}

export function stateLockPath(repoRoot: string): string {
  return path.join(repoRoot, ".rawr", "state", "state.lock");
}

async function resolveRepoStateAuthorityRoot(repoRoot: string): Promise<string> {
  const resolvedRoot = path.resolve(repoRoot);
  try {
    return await fs.realpath(resolvedRoot);
  } catch {
    return resolvedRoot;
  }
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function normalizeRepoState(input: unknown, nowIso = new Date().toISOString()): RepoState {
  const parsed = (input ?? {}) as {
    version?: unknown;
    plugins?: {
      enabled?: unknown;
      disabled?: unknown;
      lastUpdatedAt?: unknown;
    };
  };

  if (parsed.version !== 1) return defaultRepoState(nowIso);

  const enabled = Array.from(new Set(normalizeStringList(parsed.plugins?.enabled))).sort();
  const disabled = Array.from(new Set(normalizeStringList(parsed.plugins?.disabled))).sort();
  const lastUpdatedAt = typeof parsed.plugins?.lastUpdatedAt === "string" && parsed.plugins.lastUpdatedAt.trim() !== ""
    ? parsed.plugins.lastUpdatedAt
    : nowIso;

  return {
    version: 1,
    plugins: {
      enabled,
      ...(disabled.length > 0 ? { disabled } : {}),
      lastUpdatedAt,
    },
  };
}

async function readStateFile(repoRoot: string): Promise<RepoState> {
  try {
    const raw = await fs.readFile(statePath(repoRoot), "utf8");
    return normalizeRepoState(JSON.parse(raw));
  } catch {
    return defaultRepoState();
  }
}

type LockHandle = {
  lockPath: string;
  attempts: number;
  waitedMs: number;
  release: () => Promise<void>;
};

type LockMetadata = {
  pid: number;
  acquiredAt?: string;
};

function parseLockMetadata(raw: string): LockMetadata | null {
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown; acquiredAt?: unknown };
    if (typeof parsed.pid !== "number" || !Number.isInteger(parsed.pid) || parsed.pid <= 0) return null;
    return {
      pid: parsed.pid,
      ...(typeof parsed.acquiredAt === "string" && parsed.acquiredAt.trim() !== ""
        ? { acquiredAt: parsed.acquiredAt }
        : {}),
    };
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ESRCH") return false;
    // EPERM means the process exists but is not signalable by current user.
    if (err.code === "EPERM") return true;
    return true;
  }
}

async function canReclaimStaleLock(lockPath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const metadata = parseLockMetadata(raw);
    if (!metadata) return true;
    return !isProcessAlive(metadata.pid);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return false;
    throw error;
  }
}

async function cleanupStaleLock(lockPath: string, staleLockMs: number): Promise<void> {
  try {
    const stat = await fs.stat(lockPath);
    if (Date.now() - stat.mtimeMs < staleLockMs) return;
    if (!(await canReclaimStaleLock(lockPath))) return;
    await fs.rm(lockPath, { force: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }
}

async function acquireRepoStateLock(lockPath: string, options?: RepoStateMutationOptions): Promise<LockHandle> {
  const lockTimeoutMs = toPositiveInteger(options?.lockTimeoutMs, DEFAULT_LOCK_TIMEOUT_MS);
  const retryDelayMs = toPositiveInteger(options?.retryDelayMs, DEFAULT_LOCK_RETRY_DELAY_MS);
  const staleLockMs = toPositiveInteger(options?.staleLockMs, DEFAULT_STALE_LOCK_MS);
  const startedAt = Date.now();
  let attempts = 0;

  while (true) {
    attempts += 1;

    try {
      const handle = await fs.open(lockPath, "wx");
      const metadata = {
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
      };
      await handle.writeFile(`${JSON.stringify(metadata)}\n`, "utf8");

      return {
        lockPath,
        attempts,
        waitedMs: Date.now() - startedAt,
        release: async () => {
          try {
            await handle.close();
          } finally {
            try {
              await fs.rm(lockPath, { force: true });
            } catch (error) {
              const err = error as NodeJS.ErrnoException;
              if (err.code !== "ENOENT") throw error;
            }
          }
        },
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") throw error;

      await cleanupStaleLock(lockPath, staleLockMs);
      const waitedMs = Date.now() - startedAt;
      if (waitedMs >= lockTimeoutMs) {
        throw new Error(`Timed out waiting for repo state lock: ${lockPath}`);
      }
      await sleep(Math.min(retryDelayMs, Math.max(1, lockTimeoutMs - waitedMs)));
    }
  }
}

let atomicWriteCounter = 0;

async function writeRepoStateAtomically(repoRoot: string, nextState: RepoState): Promise<void> {
  const filePath = statePath(repoRoot);
  const dirPath = path.dirname(filePath);
  const tempPath = path.join(dirPath, `state.${process.pid}.${Date.now()}.${atomicWriteCounter++}.tmp`);
  const payload = `${JSON.stringify(nextState, null, 2)}\n`;

  await fs.mkdir(dirPath, { recursive: true });

  try {
    await fs.writeFile(tempPath, payload, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

async function withLocalMutationQueue<T>(repoRoot: string, task: () => Promise<T>): Promise<T> {
  const key = path.resolve(repoRoot);
  const previous = localMutationQueues.get(key) ?? Promise.resolve();

  let releaseQueue = () => {};
  const current = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  const queueTail = previous.then(() => current);
  localMutationQueues.set(key, queueTail);

  await previous;
  try {
    return await task();
  } finally {
    releaseQueue();
    if (localMutationQueues.get(key) === queueTail) {
      localMutationQueues.delete(key);
    }
  }
}

export async function getRepoState(repoRoot: string): Promise<RepoState> {
  const authorityRoot = await resolveRepoStateAuthorityRoot(repoRoot);
  return readStateFile(authorityRoot);
}

export async function mutateRepoStateAtomically(
  repoRoot: string,
  mutator: RepoStateMutator,
  options?: RepoStateMutationOptions,
): Promise<RepoStateMutationResult> {
  const authorityRoot = await resolveRepoStateAuthorityRoot(repoRoot);
  const lockPath = stateLockPath(authorityRoot);
  const resolvedStatePath = statePath(authorityRoot);

  await fs.mkdir(path.dirname(resolvedStatePath), { recursive: true });

  return withLocalMutationQueue(authorityRoot, async () => {
    const lock = await acquireRepoStateLock(lockPath, options);
    try {
      const current = await readStateFile(authorityRoot);
      const mutated = await mutator(current);
      const nextState = normalizeRepoState(mutated);
      await writeRepoStateAtomically(authorityRoot, nextState);
      return {
        state: nextState,
        statePath: resolvedStatePath,
        lockPath,
        attempts: lock.attempts,
        waitedMs: lock.waitedMs,
      };
    } finally {
      await lock.release();
    }
  });
}

export async function setRepoState(repoRoot: string, nextState: RepoState): Promise<void> {
  await mutateRepoStateAtomically(repoRoot, async () => nextState);
}

export async function enablePlugin(repoRoot: string, pluginId: string): Promise<RepoState> {
  const result = await mutateRepoStateAtomically(repoRoot, async (current) => ({
    ...current,
    plugins: {
      ...current.plugins,
      enabled: Array.from(new Set([...current.plugins.enabled, pluginId])).sort(),
      lastUpdatedAt: new Date().toISOString(),
    },
  }));

  return result.state;
}

export async function disablePlugin(repoRoot: string, pluginId: string): Promise<RepoState> {
  const result = await mutateRepoStateAtomically(repoRoot, async (current) => ({
    ...current,
    plugins: {
      ...current.plugins,
      enabled: current.plugins.enabled.filter((id) => id !== pluginId),
      lastUpdatedAt: new Date().toISOString(),
    },
  }));

  return result.state;
}
