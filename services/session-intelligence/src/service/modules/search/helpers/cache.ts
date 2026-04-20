import type { SessionIndexRuntime, SessionSearchCacheEntry, SessionSearchCacheKey } from "../../../shared/ports/session-index-runtime";

async function initializeSearchIndex(indexRuntime: SessionIndexRuntime, indexPath: string): Promise<void> {
  await indexRuntime.execute({
    indexPath,
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
    indexPath,
    sql: "CREATE INDEX IF NOT EXISTS idx_session_cache_path ON session_cache(path)",
  });
}

export async function readCachedSearchText(indexRuntime: SessionIndexRuntime, input: SessionSearchCacheKey): Promise<SessionSearchCacheEntry | null> {
  await initializeSearchIndex(indexRuntime, input.indexPath);
  const rows = await indexRuntime.query<{ mtime?: unknown; size?: unknown; content?: unknown }>({
    indexPath: input.indexPath,
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
}

export async function writeCachedSearchText(indexRuntime: SessionIndexRuntime, input: SessionSearchCacheEntry): Promise<void> {
  await initializeSearchIndex(indexRuntime, input.indexPath);
  await indexRuntime.execute({
    indexPath: input.indexPath,
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
}

export async function clearCachedSearchText(indexRuntime: SessionIndexRuntime, input: { indexPath: string; path: string }): Promise<void> {
  await initializeSearchIndex(indexRuntime, input.indexPath);
  await indexRuntime.execute({
    indexPath: input.indexPath,
    sql: "DELETE FROM session_cache WHERE path=?",
    params: [input.path],
  });
}
