import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RoleFilter, SessionSource } from "../types";
import { detectSessionFormat } from "../detect";
import { extractClaudeMessages } from "../claude/parse";
import { extractCodexMessages } from "../codex/parse";

type SqliteDb = {
  query: (sql: string) => { get: (params?: any[]) => any; run: (params?: any[]) => any };
  close: () => void;
};

async function openDb(indexPath: string): Promise<SqliteDb> {
  const mod = await import("bun:sqlite");
  const Database = (mod as any).Database as any;
  await fs.mkdir(path.dirname(indexPath), { recursive: true }).catch(() => undefined);
  const db = new Database(indexPath);
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
  db.query(`CREATE INDEX IF NOT EXISTS idx_session_cache_path ON session_cache(path)`).run();
  return db as SqliteDb;
}

export function defaultIndexPath(): string {
  const override = process.env.RAWR_SESSION_INDEX_PATH;
  if (override && override.trim()) return override.trim();
  return path.join(os.homedir(), ".cache", "rawr-session-index.sqlite");
}

function buildSearchText(messages: Array<{ role: string; content: string }>): string {
  const parts: string[] = [];
  for (const m of messages) {
    const content = m.content ?? "";
    if (!content) continue;
    const prefix = m.role === "user" ? "U" : m.role === "assistant" ? "A" : "T";
    parts.push(`${prefix}: ${content}`);
  }
  return parts.join("\n\n");
}

async function getSearchTextUncached(
  filePath: string,
  source: SessionSource,
  roles: RoleFilter[],
  includeTools: boolean,
): Promise<string> {
  const messages =
    source === "claude"
      ? await extractClaudeMessages(filePath, roles, includeTools)
      : await extractCodexMessages(filePath, roles, includeTools);
  return buildSearchText(messages);
}

export async function getSearchTextCached(input: {
  filePath: string;
  source?: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
}): Promise<string> {
  const rolesKey = [...new Set(input.roles)].sort().join(",");
  const includeToolsI = input.includeTools ? 1 : 0;
  const stat = await fs.stat(input.filePath);
  const db = await openDb(input.indexPath);
  try {
    const row = db
      .query("SELECT mtime, size, content FROM session_cache WHERE path=? AND roles=? AND include_tools=?")
      .get([input.filePath, rolesKey, includeToolsI]);
    if (row && Number(row.mtime) === Number(stat.mtimeMs) && Number(row.size) === Number(stat.size)) {
      return String(row.content ?? "");
    }

    const source = input.source ?? ((await detectSessionFormat(input.filePath)) as SessionSource);
    const text = await getSearchTextUncached(input.filePath, source, input.roles, input.includeTools);
    db.query("INSERT OR REPLACE INTO session_cache(path, roles, include_tools, mtime, size, content) VALUES (?,?,?,?,?,?)").run([
      input.filePath,
      rolesKey,
      includeToolsI,
      stat.mtimeMs,
      stat.size,
      text,
    ]);
    return text;
  } finally {
    db.close();
  }
}

export async function clearIndexFile(indexPath: string): Promise<void> {
  await fs.unlink(indexPath).catch(() => undefined);
}

export async function reindexSessions(input: {
  sessions: Array<{ path: string; source?: SessionSource }>;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
  limit: number;
}): Promise<{ indexed: number; total: number }> {
  const total = input.sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  let indexed = 0;
  for (const s of input.sessions.slice(0, limit)) {
    await getSearchTextCached({
      filePath: s.path,
      source: s.source,
      roles: input.roles,
      includeTools: input.includeTools,
      indexPath: input.indexPath,
    });
    indexed += 1;
  }
  return { indexed, total };
}
