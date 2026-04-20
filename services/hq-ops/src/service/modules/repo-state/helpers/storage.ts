import type { HqOpsResources } from "../../../shared/ports/resources";
import type {
  RepoState,
  RepoStateMutationOptions,
  RepoStateMutationResult,
  RepoStateMutator,
} from "../entities";

export type RepoStateSnapshot = {
  state: RepoState;
  authorityRepoRoot: string;
};

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

export function statePath(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(repoRoot, ".rawr", "state", "state.json");
}

export function stateLockPath(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(repoRoot, ".rawr", "state", "state.lock");
}

async function resolveRepoStateAuthorityRoot(resources: HqOpsResources, repoRoot: string): Promise<string> {
  const resolvedRoot = resources.path.resolve(repoRoot);
  return (await resources.path.realpath(resolvedRoot)) ?? resolvedRoot;
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
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

async function readStateFile(resources: HqOpsResources, repoRoot: string): Promise<RepoState> {
  const raw = await resources.fs.readText(statePath(resources, repoRoot));
  if (raw === null) return defaultRepoState();
  try {
    return normalizeRepoState(JSON.parse(raw));
  } catch {
    return defaultRepoState();
  }
}

type LockHandle = {
  ok: true;
  attempts: number;
  waitedMs: number;
  release: () => Promise<void>;
};

type LockFailure = {
  ok: false;
  code: "REPO_STATE_LOCK_TIMEOUT";
  lockPath: string;
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

async function canReclaimStaleLock(resources: HqOpsResources, lockPath: string): Promise<boolean> {
  const raw = await resources.fs.readText(lockPath);
  if (raw === null) return false;
  const metadata = parseLockMetadata(raw);
  if (!metadata) return true;
  return !resources.process.isAlive(metadata.pid);
}

async function cleanupStaleLock(resources: HqOpsResources, lockPath: string, staleLockMs: number): Promise<void> {
  const stat = await resources.fs.stat(lockPath);
  if (!stat) return;
  if (Date.now() - stat.mtimeMs < staleLockMs) return;
  if (!(await canReclaimStaleLock(resources, lockPath))) return;
  await resources.fs.rm(lockPath);
}

async function acquireRepoStateLock(
  resources: HqOpsResources,
  lockPath: string,
  options?: RepoStateMutationOptions,
): Promise<LockHandle | LockFailure> {
  const lockTimeoutMs = toPositiveInteger(options?.lockTimeoutMs, DEFAULT_LOCK_TIMEOUT_MS);
  const retryDelayMs = toPositiveInteger(options?.retryDelayMs, DEFAULT_LOCK_RETRY_DELAY_MS);
  const staleLockMs = toPositiveInteger(options?.staleLockMs, DEFAULT_STALE_LOCK_MS);
  const startedAt = Date.now();
  let attempts = 0;

  while (true) {
    attempts += 1;
    try {
      const handle = await resources.fs.openExclusive(lockPath);
      await handle.writeText(`${JSON.stringify({ pid: resources.process.pid(), acquiredAt: new Date().toISOString() })}\n`);

      return {
        ok: true,
        attempts,
        waitedMs: Date.now() - startedAt,
        release: async () => {
          try {
            await handle.close();
          } finally {
            await resources.fs.rm(lockPath);
          }
        },
      };
    } catch (error) {
      const err = error as { code?: string };
      if (err.code !== "EEXIST") throw error;
      await cleanupStaleLock(resources, lockPath, staleLockMs);
      const waitedMs = Date.now() - startedAt;
      if (waitedMs >= lockTimeoutMs) {
        return { ok: false, code: "REPO_STATE_LOCK_TIMEOUT", lockPath };
      }
      await resources.process.sleep(Math.min(retryDelayMs, Math.max(1, lockTimeoutMs - waitedMs)));
    }
  }
}

let atomicWriteCounter = 0;

async function writeRepoStateAtomically(resources: HqOpsResources, repoRoot: string, nextState: RepoState): Promise<void> {
  const filePath = statePath(resources, repoRoot);
  const dirPath = resources.path.dirname(filePath);
  const tempPath = resources.path.join(
    dirPath,
    `state.${resources.process.pid()}.${Date.now()}.${atomicWriteCounter++}.tmp`,
  );
  const payload = `${JSON.stringify(nextState, null, 2)}\n`;

  await resources.fs.mkdir(dirPath);

  try {
    await resources.fs.writeText(tempPath, payload);
    await resources.fs.rename(tempPath, filePath);
  } catch (error) {
    await resources.fs.rm(tempPath);
    throw error;
  }
}

async function withLocalMutationQueue<T>(
  resources: HqOpsResources,
  repoRoot: string,
  task: () => Promise<T>,
): Promise<T> {
  const key = resources.path.resolve(repoRoot);
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

export async function mutateRepoStateAtomically(
  resources: HqOpsResources,
  repoRoot: string,
  mutator: RepoStateMutator,
  options?: RepoStateMutationOptions,
): Promise<RepoStateMutationResult> {
  const authorityRoot = await resolveRepoStateAuthorityRoot(resources, repoRoot);
  const lockPath = stateLockPath(resources, authorityRoot);
  const resolvedStatePath = statePath(resources, authorityRoot);

  await resources.fs.mkdir(resources.path.dirname(resolvedStatePath));

  return withLocalMutationQueue(resources, authorityRoot, async () => {
    const lock = await acquireRepoStateLock(resources, lockPath, options);
    if (!lock.ok) return lock;
    try {
      const current = await readStateFile(resources, authorityRoot);
      const mutated = await mutator(current);
      const nextState = normalizeRepoState(mutated);
      await writeRepoStateAtomically(resources, authorityRoot, nextState);
      return {
        ok: true,
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

export async function getRepoStateWithAuthority(
  resources: HqOpsResources,
  repoRoot: string,
): Promise<RepoStateSnapshot> {
  const authorityRepoRoot = await resolveRepoStateAuthorityRoot(resources, repoRoot);
  return {
    state: await readStateFile(resources, authorityRepoRoot),
    authorityRepoRoot,
  };
}
