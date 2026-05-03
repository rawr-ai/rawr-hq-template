/**
 * session-intelligence: codex discovery index repository.
 *
 * This repository owns the SQL schema and query mechanics used to index Codex
 * session roots. Catalog/search use it so persistence + query mechanics stay
 * behind a service-owned boundary.
 */
import type { CodexSessionFile, CodexSessionSource } from "../entities";
import type { SessionIndexRuntime } from "../ports/session-index-runtime";

export type IndexedCodexRootState = {
  root_mtime_ms?: unknown;
  scanned_at_ms?: unknown;
};

export async function initializeDiscoveryIndex(indexRuntime: SessionIndexRuntime, indexPath: string): Promise<void> {
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

export async function replaceCodexRootIndex(input: {
  indexRuntime: SessionIndexRuntime;
  indexPath: string;
  source: CodexSessionSource;
  rootMtimeMs: number;
  scannedAtMs: number;
  rows: CodexSessionFile[];
}): Promise<void> {
  await input.indexRuntime.transaction({
    indexPath: input.indexPath,
    statements: [
      { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [input.source.dir] },
      ...input.rows.map((row) => ({
        sql: "INSERT OR REPLACE INTO codex_file_index(file_path, root_dir, status, modified_ms, size_bytes) VALUES (?,?,?,?,?)",
        params: [row.path, input.source.dir, row.status, row.modifiedMs, row.sizeBytes],
      })),
      {
        sql: "INSERT OR REPLACE INTO codex_root_scan_state(root_dir, status, root_mtime_ms, scanned_at_ms) VALUES (?,?,?,?)",
        params: [input.source.dir, input.source.status, input.rootMtimeMs, input.scannedAtMs],
      },
    ],
  });
}

export async function deleteCodexRootIndex(indexRuntime: SessionIndexRuntime, indexPath: string, rootDir: string): Promise<void> {
  await indexRuntime.transaction({
    indexPath,
    statements: [
      { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [rootDir] },
      { sql: "DELETE FROM codex_root_scan_state WHERE root_dir=?", params: [rootDir] },
    ],
  });
}

export async function readCodexRootState(indexRuntime: SessionIndexRuntime, indexPath: string, rootDir: string): Promise<IndexedCodexRootState | null> {
  const rows = await indexRuntime.query<IndexedCodexRootState>({
    indexPath,
    sql: "SELECT root_mtime_ms, scanned_at_ms FROM codex_root_scan_state WHERE root_dir=?",
    params: [rootDir],
  });
  return rows[0] ?? null;
}

export async function queryIndexedCodexRows(indexRuntime: SessionIndexRuntime, indexPath: string, sources: CodexSessionSource[], max: number): Promise<CodexSessionFile[]> {
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

export async function deleteCodexFileIndexEntry(indexRuntime: SessionIndexRuntime, indexPath: string, filePath: string): Promise<void> {
  await indexRuntime.execute({
    indexPath,
    sql: "DELETE FROM codex_file_index WHERE file_path=?",
    params: [filePath],
  });
}

export async function updateCodexFileIndexEntry(indexRuntime: SessionIndexRuntime, indexPath: string, row: CodexSessionFile): Promise<void> {
  await indexRuntime.execute({
    indexPath,
    sql: "UPDATE codex_file_index SET modified_ms=?, size_bytes=? WHERE file_path=?",
    params: [row.modifiedMs, row.sizeBytes, row.path],
  });
}
