import type { SessionIndexRuntime } from "../../../shared/ports/session-index-runtime";
import type { DiscoverSessionsInput, SessionSourceRuntime } from "../../../shared/ports/session-source-runtime";
import type { CodexSessionFile, CodexSessionSource, DiscoveredSessionFile, SessionStatus } from "../../../shared/entities";
import {
  deleteCodexFileIndexEntry,
  deleteCodexRootIndex,
  initializeDiscoveryIndex,
  queryIndexedCodexRows,
  readCodexRootState,
  replaceCodexRootIndex,
  updateCodexFileIndexEntry,
} from "../repositories/discovery-index-repository";

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

function hasServiceOwnedCodexDiscovery(runtime: SessionSourceRuntime): runtime is SessionSourceRuntime & {
  listCodexSources(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]>;
} {
  return typeof runtime.listCodexSources === "function" && typeof runtime.discoverCodexSessionFiles === "function";
}

function codexDiscoveryMaxAgeMs(runtime: SessionSourceRuntime, status: SessionStatus): number | Promise<number> {
  if (typeof runtime.codexDiscoveryMaxAgeMs === "function") return runtime.codexDiscoveryMaxAgeMs({ status });
  return status === "live" ? DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS : DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS;
}

function shouldRefreshRoot(
  row: { root_mtime_ms?: unknown; scanned_at_ms?: unknown } | null,
  rootMtimeMs: number,
  nowMs: number,
  maxAgeMs: number,
): boolean {
  if (!row) return true;
  if (Number(row.root_mtime_ms) !== Number(rootMtimeMs)) return true;
  const scannedAtMs = Number(row.scanned_at_ms);
  if (!Number.isFinite(scannedAtMs)) return true;
  return nowMs - scannedAtMs >= maxAgeMs;
}

async function refreshCodexRootIndex(input: {
  runtime: SessionSourceRuntime & { discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]> };
  indexRuntime: SessionIndexRuntime;
  indexPath: string;
  source: CodexSessionSource;
  rootMtimeMs: number;
  nowMs: number;
}): Promise<void> {
  await replaceCodexRootIndex({
    indexRuntime: input.indexRuntime,
    indexPath: input.indexPath,
    source: input.source,
    rootMtimeMs: input.rootMtimeMs,
    scannedAtMs: input.nowMs,
    rows: await input.runtime.discoverCodexSessionFiles(input.source),
  });
}

async function validateIndexedCodexRows(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  indexPath: string,
  rows: CodexSessionFile[],
  max: number,
): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  for (const row of rows) {
    const stat = await runtime.statFile({ path: row.path });
    if (!stat) {
      await deleteCodexFileIndexEntry(indexRuntime, indexPath, row.path);
      continue;
    }
    if (Number(stat.modifiedMs) !== Number(row.modifiedMs) || Number(stat.sizeBytes) !== Number(row.sizeBytes)) {
      row.modifiedMs = stat.modifiedMs;
      row.sizeBytes = stat.sizeBytes;
      await updateCodexFileIndexEntry(indexRuntime, indexPath, row);
    }
    out.push(row);
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return max > 0 ? out.slice(0, max) : out;
}

async function discoverCodexFromIndex(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  max: number,
): Promise<CodexSessionFile[] | null> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return null;

  const sources = await runtime.listCodexSources();
  if (!sources.length) return [];

  const indexPath = indexRuntime.defaultIndexPath();
  await initializeDiscoveryIndex(indexRuntime, indexPath);

  const nowMs = Date.now();
  let fullRefreshDone = false;
  for (const source of sources) {
    const rootStat = await runtime.statFile({ path: source.dir });
    if (!rootStat) {
      await deleteCodexRootIndex(indexRuntime, indexPath, source.dir);
      continue;
    }

    if (!max) {
      await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs });
      fullRefreshDone = true;
      continue;
    }

    const maxAgeMs = await codexDiscoveryMaxAgeMs(runtime, source.status);
    const rootState = await readCodexRootState(indexRuntime, indexPath, source.dir);
    if (shouldRefreshRoot(rootState, rootStat.modifiedMs, nowMs, maxAgeMs)) {
      await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs });
    }
  }

  let rows = await queryIndexedCodexRows(indexRuntime, indexPath, sources, max);
  let validated = await validateIndexedCodexRows(runtime, indexRuntime, indexPath, rows, max);
  if (max > 0 && validated.length < max && !fullRefreshDone) {
    for (const source of sources) {
      const rootStat = await runtime.statFile({ path: source.dir });
      if (rootStat) {
        await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs: Date.now() });
      }
    }
    rows = await queryIndexedCodexRows(indexRuntime, indexPath, sources, max);
    validated = await validateIndexedCodexRows(runtime, indexRuntime, indexPath, rows, max);
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

export async function discoverSessions(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  input: DiscoverSessionsInput,
): Promise<DiscoveredSessionFile[]> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return runtime.discoverSessions(input);

  const out: DiscoveredSessionFile[] = [];
  if (input.source === "claude" || input.source === "all") {
    out.push(...await runtime.discoverSessions({ source: "claude", limit: input.limit, project: input.project }));
  }
  if (input.source === "codex" || input.source === "all") {
    const indexed = await discoverCodexFromIndex(runtime, indexRuntime, typeof input.limit === "number" && input.limit > 0 ? input.limit : 0);
    if (indexed) out.push(...indexed.map(codexFileToDiscovered));
    else out.push(...await runtime.discoverSessions({ source: "codex", limit: input.limit }));
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return input.limit && input.limit > 0 ? out.slice(0, input.limit) : out;
}
