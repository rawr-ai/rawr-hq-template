import type { SearchTextStore, SessionIndexRuntime } from "../../model/ports";

/** Binds normalized transcript search-text persistence to the index capability. */
export function createSearchTextStore(
  indexRuntime: SessionIndexRuntime,
  indexPath: () => string
): SearchTextStore {
  async function initialize(): Promise<string> {
    const path = indexPath();
    await indexRuntime.execute({
      indexPath: path,
      sql: `
        CREATE TABLE IF NOT EXISTS session_cache (
          path TEXT NOT NULL,
          roles TEXT NOT NULL,
          include_tools INTEGER NOT NULL,
          mtime REAL NOT NULL,
          size INTEGER NOT NULL,
          content TEXT NOT NULL,
          PRIMARY KEY (path, roles, include_tools)
        )
      `,
    });
    await indexRuntime.execute({
      indexPath: path,
      sql: "CREATE INDEX IF NOT EXISTS idx_session_cache_path ON session_cache(path)",
    });
    return path;
  }

  return {
    async read(input) {
      const path = await initialize();
      const rows = await indexRuntime.query<{
        mtime?: unknown;
        size?: unknown;
        content?: unknown;
      }>({
        indexPath: path,
        sql: "SELECT mtime, size, content FROM session_cache WHERE path=? AND roles=? AND include_tools=?",
        params: [input.path, input.rolesKey, input.includeTools ? 1 : 0],
      });
      const row = rows[0];
      if (!row) return null;
      return {
        ...input,
        modifiedMs: Number(row.mtime ?? 0),
        sizeBytes: Number(row.size ?? 0),
        content: String(row.content ?? ""),
      };
    },

    async write(input): Promise<void> {
      const path = await initialize();
      await indexRuntime.execute({
        indexPath: path,
        sql: "INSERT OR REPLACE INTO session_cache(path, roles, include_tools, mtime, size, content) VALUES (?,?,?,?,?,?)",
        params: [
          input.path,
          input.rolesKey,
          input.includeTools ? 1 : 0,
          input.modifiedMs,
          input.sizeBytes,
          input.content,
        ],
      });
    },

    async clear(pathToClear): Promise<void> {
      const path = await initialize();
      await indexRuntime.execute({
        indexPath: path,
        sql: "DELETE FROM session_cache WHERE path=?",
        params: [pathToClear],
      });
    },

    async clearAll(): Promise<void> {
      await indexRuntime.removeIndex({ indexPath: indexPath() });
    },
  };
}
