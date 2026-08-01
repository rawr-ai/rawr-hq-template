import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

interface BunSqliteDatabase {
  close(): void;
  query(sql: string): {
    get(...parameters: readonly unknown[]): unknown;
  };
}

interface BunSqliteModule {
  readonly Database: new (
    filename: string,
    options: { readonly readonly: true }
  ) => BunSqliteDatabase;
}

const require = createRequire(import.meta.url);

/**
 * Resolve a Codex rollout through Bun's local state database.
 *
 * This adapter stays separate from generic session evidence so importing the
 * latter does not load the Bun-only `bun:sqlite` runtime module.
 */
export function resolveCodexRollout(threadId: string, codexHome = process.env.CODEX_HOME): string {
  if (!/^[0-9a-f-]{36}$/u.test(threadId)) {
    throw new Error("Codex thread ID must be a UUID");
  }
  if (!codexHome) throw new Error("CODEX_HOME is not configured");

  const { Database } = require("bun:sqlite") as BunSqliteModule;
  const candidates = [
    join(codexHome, "state_5.sqlite"),
    join(codexHome, "sqlite", "state_5.sqlite"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const database = new Database(candidate, { readonly: true });
    try {
      const row = database
        .query("SELECT rollout_path FROM threads WHERE id = ? LIMIT 1")
        .get(threadId) as { rollout_path?: unknown } | null;
      if (typeof row?.rollout_path === "string" && existsSync(row.rollout_path)) {
        return row.rollout_path;
      }
    } finally {
      database.close();
    }
  }
  throw new Error(`No Codex rollout was found for thread ${threadId}`);
}
