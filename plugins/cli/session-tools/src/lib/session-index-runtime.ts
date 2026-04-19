import fs from "node:fs/promises";
import type {
  SessionIndexRuntime,
  SessionSearchCacheEntry,
  SessionSearchCacheKey,
} from "@rawr/session-intelligence/ports/session-index-runtime";
import { defaultSessionIndexPathSync } from "./session-paths";
import { openSqliteDb } from "./sqlite";

function initializeSearchDb(db: Awaited<ReturnType<typeof openSqliteDb>>): void {
  db.query(`
    CREATE TABLE IF NOT EXISTS session_cache (
      path TEXT NOT NULL,
      roles TEXT NOT NULL,
      include_tools INTEGER NOT NULL,
      mtime REAL NOT NULL,
      size INTEGER NOT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (path, roles, include_tools)
    )
  `).run();
  db.query("CREATE INDEX IF NOT EXISTS idx_session_cache_path ON session_cache(path)").run();
}

async function removeIndexFiles(indexPath: string): Promise<void> {
  await fs.unlink(indexPath).catch(() => undefined);
  await fs.rm(`${indexPath}-shm`, { force: true }).catch(() => undefined);
  await fs.rm(`${indexPath}-wal`, { force: true }).catch(() => undefined);
}

export function createSessionIndexRuntime(): SessionIndexRuntime {
  return {
    async getSearchText(input: SessionSearchCacheKey): Promise<SessionSearchCacheEntry | null> {
      const db = await openSqliteDb(input.indexPath);
      initializeSearchDb(db);
      try {
        const row = db
          .query("SELECT mtime, size, content FROM session_cache WHERE path=? AND roles=? AND include_tools=?")
          .get([input.path, input.rolesKey, input.includeTools ? 1 : 0]);
        if (!row) return null;
        return {
          ...input,
          modifiedMs: Number(row.mtime ?? 0),
          sizeBytes: Number(row.size ?? 0),
          content: String(row.content ?? ""),
        };
      } finally {
        db.close();
      }
    },

    async setSearchText(input: SessionSearchCacheEntry): Promise<void> {
      const db = await openSqliteDb(input.indexPath);
      initializeSearchDb(db);
      try {
        db.query("INSERT OR REPLACE INTO session_cache(path, roles, include_tools, mtime, size, content) VALUES (?,?,?,?,?,?)").run([
          input.path,
          input.rolesKey,
          input.includeTools ? 1 : 0,
          input.modifiedMs,
          input.sizeBytes,
          input.content,
        ]);
      } finally {
        db.close();
      }
    },

    async clearSearchText(input = {}): Promise<void> {
      const indexPath = input.indexPath ?? defaultSessionIndexPathSync();
      if (!input.path) {
        await removeIndexFiles(indexPath);
        return;
      }
      const db = await openSqliteDb(indexPath);
      initializeSearchDb(db);
      try {
        db.query("DELETE FROM session_cache WHERE path=?").run([input.path]);
      } finally {
        db.close();
      }
    },
  };
}

export { defaultSessionIndexPathSync };
