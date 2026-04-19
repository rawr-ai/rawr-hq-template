import fs from "node:fs/promises";
import path from "node:path";

export type SqliteStatement = {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

export type SqliteDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatement;
  close(): void;
};

export async function openSqliteDatabase(dbPath: string): Promise<SqliteDatabase> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  try {
    const mod = await import("bun:sqlite");
    const Database = (mod as { Database: new (dbPath: string) => SqliteDatabase }).Database;
    return new Database(dbPath);
  } catch {
    const mod = await import("node:sqlite");
    const DatabaseSync = (mod as {
      DatabaseSync: new (dbPath: string) => {
        exec(sql: string): unknown;
        prepare(sql: string): {
          get(...params: unknown[]): unknown;
          run(...params: unknown[]): unknown;
          all(...params: unknown[]): unknown[];
        };
        close(): void;
      };
    }).DatabaseSync;
    const db = new DatabaseSync(dbPath);

    return {
      exec(sql: string) {
        return db.exec(sql);
      },
      prepare(sql: string) {
        const statement = db.prepare(sql);
        return {
          get(...params: unknown[]) {
            return statement.get(...params);
          },
          run(...params: unknown[]) {
            return statement.run(...params);
          },
          all(...params: unknown[]) {
            return statement.all(...params);
          },
        };
      },
      close() {
        db.close();
      },
    };
  }
}
