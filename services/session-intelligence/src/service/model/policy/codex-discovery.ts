import type {
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionStatus,
} from "../dto";
import type { CodexDiscoveryStore, SessionSourceRuntime } from "../ports";

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

function hasServiceOwnedCodexDiscovery(
  runtime: SessionSourceRuntime
): runtime is SessionSourceRuntime & {
  listCodexSources(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]>;
} {
  return (
    typeof runtime.listCodexSources === "function" &&
    typeof runtime.discoverCodexSessionFiles === "function"
  );
}

function codexDiscoveryMaxAgeMs(
  runtime: SessionSourceRuntime,
  status: SessionStatus
): number | Promise<number> {
  if (typeof runtime.codexDiscoveryMaxAgeMs === "function") {
    return runtime.codexDiscoveryMaxAgeMs({ status });
  }
  return status === "live"
    ? DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS
    : DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS;
}

function shouldRefreshRoot(
  row: { root_mtime_ms?: unknown; scanned_at_ms?: unknown } | null,
  rootMtimeMs: number,
  nowMs: number,
  maxAgeMs: number
): boolean {
  if (!row) return true;
  if (Number(row.root_mtime_ms) !== Number(rootMtimeMs)) return true;
  const scannedAtMs = Number(row.scanned_at_ms);
  if (!Number.isFinite(scannedAtMs)) return true;
  return nowMs - scannedAtMs >= maxAgeMs;
}

async function refreshCodexRootIndex(input: {
  runtime: SessionSourceRuntime & {
    discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]>;
  };
  store: CodexDiscoveryStore;
  source: CodexSessionSource;
  rootMtimeMs: number;
  nowMs: number;
}): Promise<void> {
  await input.store.replaceRoot({
    source: input.source,
    rootMtimeMs: input.rootMtimeMs,
    scannedAtMs: input.nowMs,
    rows: await input.runtime.discoverCodexSessionFiles(input.source),
  });
}

async function validateIndexedCodexRows(
  runtime: SessionSourceRuntime,
  store: CodexDiscoveryStore,
  rows: CodexSessionFile[],
  max: number
): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  for (const row of rows) {
    const stat = await runtime.statFile({ path: row.path });
    if (!stat) {
      await store.deleteFile(row.path);
      continue;
    }
    if (
      Number(stat.modifiedMs) !== Number(row.modifiedMs) ||
      Number(stat.sizeBytes) !== Number(row.sizeBytes)
    ) {
      row.modifiedMs = stat.modifiedMs;
      row.sizeBytes = stat.sizeBytes;
      await store.updateFile(row);
    }
    out.push(row);
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return max > 0 ? out.slice(0, max) : out;
}

async function discoverCodexFromIndex(
  runtime: SessionSourceRuntime,
  store: CodexDiscoveryStore,
  max: number
): Promise<CodexSessionFile[] | null> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return null;

  const sources = await runtime.listCodexSources();
  if (!sources.length) return [];

  await store.initialize();

  const nowMs = Date.now();
  let fullRefreshDone = false;
  for (const source of sources) {
    const rootStat = await runtime.statFile({ path: source.dir });
    if (!rootStat) {
      await store.deleteRoot(source.dir);
      continue;
    }

    if (!max) {
      await refreshCodexRootIndex({
        runtime,
        store,
        source,
        rootMtimeMs: rootStat.modifiedMs,
        nowMs,
      });
      fullRefreshDone = true;
      continue;
    }

    const maxAgeMs = await codexDiscoveryMaxAgeMs(runtime, source.status);
    const rootState = await store.readRootState(source.dir);
    if (shouldRefreshRoot(rootState, rootStat.modifiedMs, nowMs, maxAgeMs)) {
      await refreshCodexRootIndex({
        runtime,
        store,
        source,
        rootMtimeMs: rootStat.modifiedMs,
        nowMs,
      });
    }
  }

  let rows = await store.queryRows(sources, max);
  let validated = await validateIndexedCodexRows(runtime, store, rows, max);
  if (max > 0 && validated.length < max && !fullRefreshDone) {
    for (const source of sources) {
      const rootStat = await runtime.statFile({ path: source.dir });
      if (rootStat) {
        await refreshCodexRootIndex({
          runtime,
          store,
          source,
          rootMtimeMs: rootStat.modifiedMs,
          nowMs: Date.now(),
        });
      }
    }
    rows = await store.queryRows(sources, max);
    validated = await validateIndexedCodexRows(runtime, store, rows, max);
  }
  return validated;
}

function codexFileToDiscovered(file: CodexSessionFile): DiscoveredSessionFile {
  return {
    path: file.path,
    source: "codex",
    status: file.status,
    modifiedMs: file.modifiedMs,
    sizeBytes: file.sizeBytes,
  };
}

/** Attempts indexed Codex discovery, returning null when the host lacks the required primitives. */
export async function discoverCodexSessionsFromIndexOrNull(
  runtime: SessionSourceRuntime,
  store: CodexDiscoveryStore,
  max: number
): Promise<DiscoveredSessionFile[] | null> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return null;
  const indexed = await discoverCodexFromIndex(runtime, store, max);
  return indexed ? indexed.map(codexFileToDiscovered) : [];
}
