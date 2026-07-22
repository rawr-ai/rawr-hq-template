import fs from "node:fs/promises";
import path from "node:path";

export type SqliteQuery = {
  get: (params?: unknown[]) => any;
  run: (params?: unknown[]) => any;
  all?: (params?: unknown[]) => any[];
};

export type SqliteDb = {
  query: (sql: string) => SqliteQuery;
  close: () => void;
};

export async function openSqliteDb(indexPath: string): Promise<SqliteDb> {
  await fs.mkdir(path.dirname(indexPath), { recursive: true }).catch(() => undefined);

  try {
    const mod = await import("bun:sqlite");
    const Database = (mod as any).Database;
    return new Database(indexPath) as SqliteDb;
  } catch {
    const mod = await import("node:sqlite");
    const DatabaseSync = (mod as any).DatabaseSync;
    const nodeDb = new DatabaseSync(indexPath);
    return {
      query: (sql: string): SqliteQuery => {
        const stmt = nodeDb.prepare(sql);
        return {
          get: (params?: unknown[]) => (Array.isArray(params) ? stmt.get(...params) : stmt.get()),
          run: (params?: unknown[]) => (Array.isArray(params) ? stmt.run(...params) : stmt.run()),
          all: (params?: unknown[]) => (Array.isArray(params) ? stmt.all(...params) : stmt.all()),
        };
      },
      close: () => nodeDb.close(),
    };
  }
}
