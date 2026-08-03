import type {
  CodexDiscoveryStore,
  IndexedCodexRootState,
  SessionIndexRuntime,
} from "../../model/ports";

/** Binds Codex discovery persistence to the host-supplied index capability. */
export function createCodexDiscoveryStore(
  indexRuntime: SessionIndexRuntime,
  indexPath: () => string
): CodexDiscoveryStore {
  return {
    async initialize(): Promise<void> {
      const path = indexPath();
      await indexRuntime.execute({
        indexPath: path,
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
        indexPath: path,
        sql: "CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified ON codex_file_index(root_dir, modified_ms DESC)",
      });
      await indexRuntime.execute({
        indexPath: path,
        sql: `
          CREATE TABLE IF NOT EXISTS codex_root_scan_state (
            root_dir TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            root_mtime_ms REAL NOT NULL,
            scanned_at_ms REAL NOT NULL
          )
        `,
      });
    },

    async replaceRoot(input): Promise<void> {
      await indexRuntime.transaction({
        indexPath: indexPath(),
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
    },

    async deleteRoot(rootDir): Promise<void> {
      await indexRuntime.transaction({
        indexPath: indexPath(),
        statements: [
          { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [rootDir] },
          { sql: "DELETE FROM codex_root_scan_state WHERE root_dir=?", params: [rootDir] },
        ],
      });
    },

    async readRootState(rootDir): Promise<IndexedCodexRootState | null> {
      const rows = await indexRuntime.query<IndexedCodexRootState>({
        indexPath: indexPath(),
        sql: "SELECT root_mtime_ms, scanned_at_ms FROM codex_root_scan_state WHERE root_dir=?",
        params: [rootDir],
      });
      return rows[0] ?? null;
    },

    async queryRows(sources, max) {
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
      }>({ indexPath: indexPath(), sql, params });
      return rows.map((row) => ({
        path: String(row.file_path ?? ""),
        status: row.status === "archived" ? ("archived" as const) : ("live" as const),
        modifiedMs: Number(row.modified_ms ?? 0),
        sizeBytes: Number(row.size_bytes ?? 0),
      }));
    },

    async deleteFile(filePath): Promise<void> {
      await indexRuntime.execute({
        indexPath: indexPath(),
        sql: "DELETE FROM codex_file_index WHERE file_path=?",
        params: [filePath],
      });
    },

    async updateFile(row): Promise<void> {
      await indexRuntime.execute({
        indexPath: indexPath(),
        sql: "UPDATE codex_file_index SET modified_ms=?, size_bytes=? WHERE file_path=?",
        params: [row.modifiedMs, row.sizeBytes, row.path],
      });
    },
  };
}
