import fs from "node:fs/promises";
import type { SessionIndexBatch, SessionIndexRuntime, SessionIndexStatement } from "@rawr/session-intelligence/ports/session-index-runtime";
import { defaultSessionIndexPathSync } from "./session-paths";
import { openSqliteDb } from "./sqlite";

async function removeIndexFiles(indexPath: string): Promise<void> {
  await fs.unlink(indexPath).catch(() => undefined);
  await fs.rm(`${indexPath}-shm`, { force: true }).catch(() => undefined);
  await fs.rm(`${indexPath}-wal`, { force: true }).catch(() => undefined);
}

async function withDb<T>(input: { indexPath: string }, fn: (db: Awaited<ReturnType<typeof openSqliteDb>>) => T): Promise<T> {
  const db = await openSqliteDb(input.indexPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function createSessionIndexRuntime(): SessionIndexRuntime {
  return {
    defaultIndexPath(): string {
      return defaultSessionIndexPathSync();
    },

    async execute(input: SessionIndexStatement & { indexPath: string }): Promise<void> {
      await withDb(input, (db) => {
        db.query(input.sql).run(input.params);
      });
    },

    async query<Row extends Record<string, unknown> = Record<string, unknown>>(input: SessionIndexStatement & { indexPath: string }): Promise<Row[]> {
      return await withDb(input, (db) => (db.query(input.sql).all?.(input.params) ?? []) as Row[]);
    },

    async transaction(input: SessionIndexBatch): Promise<void> {
      await withDb(input, (db) => {
        db.query("BEGIN IMMEDIATE").run();
        try {
          for (const statement of input.statements) {
            db.query(statement.sql).run(statement.params);
          }
          db.query("COMMIT").run();
        } catch (err) {
          db.query("ROLLBACK").run();
          throw err;
        }
      });
    },

    async removeIndex(input: { indexPath: string }): Promise<void> {
      await removeIndexFiles(input.indexPath);
    },
  };
}

export { defaultSessionIndexPathSync };
