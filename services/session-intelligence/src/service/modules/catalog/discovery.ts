import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { DiscoverSessionsInput, SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { CodexSessionFile, CodexSessionSource, DiscoveredSessionFile, SessionStatus } from "../../shared/schemas";

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

async function initializeDiscoveryIndex(indexRuntime: SessionIndexRuntime, indexPath: string): Promise<void> {
  await indexRuntime.execute({
    indexPath,
    sql: `
      CREATE TABLE IF NOT EXISTS codex_file_index (
        file_path TEXT PRIMARY KEY,
        root_dir TEXT NOT NULL,
        status TEXT NOT NULL,
        modified_ms REAL NOT NULL,
        size_bytes INTEGER NOT NULL
      )
    `,
  });
  await indexRuntime.execute({
    indexPath,
    sql: "CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified ON codex_file_index(root_dir, modified_ms DESC)",
  });
  await indexRuntime.execute({
    indexPath,
    sql: `
      CREATE TABLE IF NOT EXISTS codex_root_scan_state (
        root_dir TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        root_mtime_ms REAL NOT NULL,
        scanned_at_ms REAL NOT NULL
      )
    `,
  });
}

async function refreshCodexRootIndex(input: {
  runtime: SessionSourceRuntime & { discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]> };
  indexRuntime: SessionIndexRuntime;
  indexPath: string;
  source: CodexSessionSource;
  rootMtimeMs: number;
  nowMs: number;
}): Promise<void> {
  const rows = await input.runtime.discoverCodexSessionFiles(input.source);
  await input.indexRuntime.transaction({
    indexPath: input.indexPath,
    statements: [
      { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [input.source.dir] },
      ...rows.map((row) => ({
        sql: "INSERT OR REPLACE INTO codex_file_index(file_path, root_dir, status, modified_ms, size_bytes) VALUES (?,?,?,?,?)",
        params: [row.path, input.source.dir, row.status, row.modifiedMs, row.sizeBytes],
      })),
      {
        sql: "INSERT OR REPLACE INTO codex_root_scan_state(root_dir, status, root_mtime_ms, scanned_at_ms) VALUES (?,?,?,?)",
        params: [input.source.dir, input.source.status, input.rootMtimeMs, input.nowMs],
      },
    ],
  });
}

async function queryIndexedCodexRows(indexRuntime: SessionIndexRuntime, indexPath: string, sources: CodexSessionSource[], max: number): Promise<CodexSessionFile[]> {
  if (!sources.length) return [];
  const placeholders = sources.map(() => "?").join(",");
  const queryLimit = max > 0 ? max * 8 + 32 : 0;
  const sql =
    queryLimit > 0
      ? `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC LIMIT ?`
      : `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC`;
  const params: unknown[] = sources.map((source) => source.dir);
  if (queryLimit > 0) params.push(queryLimit);
  const rows = await indexRuntime.query<{
    file_path?: unknown;
    status?: unknown;
    modified_ms?: unknown;
    size_bytes?: unknown;
  }>({ indexPath, sql, params });
  return rows.map((row) => ({
    path: String(row.file_path ?? ""),
    status: row.status === "archived" ? "archived" : "live",
    modifiedMs: Number(row.modified_ms ?? 0),
    sizeBytes: Number(row.size_bytes ?? 0),
  }));
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
      await indexRuntime.execute({
        indexPath,
        sql: "DELETE FROM codex_file_index WHERE file_path=?",
        params: [row.path],
      });
      continue;
    }
    if (Number(stat.modifiedMs) !== Number(row.modifiedMs) || Number(stat.sizeBytes) !== Number(row.sizeBytes)) {
      row.modifiedMs = stat.modifiedMs;
      row.sizeBytes = stat.sizeBytes;
      await indexRuntime.execute({
        indexPath,
        sql: "UPDATE codex_file_index SET modified_ms=?, size_bytes=? WHERE file_path=?",
        params: [row.modifiedMs, row.sizeBytes, row.path],
      });
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
      await indexRuntime.transaction({
        indexPath,
        statements: [
          { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [source.dir] },
          { sql: "DELETE FROM codex_root_scan_state WHERE root_dir=?", params: [source.dir] },
        ],
      });
      continue;
    }

    if (!max) {
      await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs });
      fullRefreshDone = true;
      continue;
    }

    const rootRows = await indexRuntime.query<{ root_mtime_ms?: unknown; scanned_at_ms?: unknown }>({
      indexPath,
      sql: "SELECT root_mtime_ms, scanned_at_ms FROM codex_root_scan_state WHERE root_dir=?",
      params: [source.dir],
    });
    const maxAgeMs = await codexDiscoveryMaxAgeMs(runtime, source.status);
    if (shouldRefreshRoot(rootRows[0] ?? null, rootStat.modifiedMs, nowMs, maxAgeMs)) {
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
