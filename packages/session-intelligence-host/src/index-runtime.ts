import fs from "node:fs/promises";
import path from "node:path";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages } from "./parsers";
import { openSqliteDb } from "./sqlite";
import { defaultSessionIndexPath } from "./source-runtime";
import type { MetadataSearchHit, RoleFilter, SearchHit, SessionIndexRuntime, SessionListItem, SessionSource } from "./types";

function buildSearchText(messages: Array<{ role: string; content: string }>): string {
  const parts: string[] = [];
  for (const message of messages) {
    if (!message.content) continue;
    const prefix = message.role === "user" ? "U" : message.role === "assistant" ? "A" : "T";
    parts.push(`${prefix}: ${message.content}`);
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

export async function getSearchTextCached(input: {
  filePath: string;
  source?: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
}, loader?: () => Promise<string>): Promise<string> {
  const rolesKey = [...new Set(input.roles)].sort().join(",");
  const includeToolsI = input.includeTools ? 1 : 0;
  const stat = await fs.stat(input.filePath);
  const db = await openSqliteDb(input.indexPath);
  initializeSearchDb(db);
  try {
    const row = db
      .query("SELECT mtime, size, content FROM session_cache WHERE path=? AND roles=? AND include_tools=?")
      .get([input.filePath, rolesKey, includeToolsI]);
    if (row && Number(row.mtime) === Number(stat.mtimeMs) && Number(row.size) === Number(stat.size)) {
      return String(row.content ?? "");
    }

    const source = input.source ?? ((await detectSessionFormat(input.filePath)) as SessionSource);
    const text = loader ? await loader() : await getSearchTextUncached(input.filePath, source, input.roles, input.includeTools);
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
  await fs.rm(`${indexPath}-shm`, { force: true }).catch(() => undefined);
  await fs.rm(`${indexPath}-wal`, { force: true }).catch(() => undefined);
}

export async function getSearchText(input: {
  indexPath: string;
  path: string;
  rolesKey: string;
  includeTools: boolean;
}): Promise<{
  indexPath: string;
  path: string;
  rolesKey: string;
  includeTools: boolean;
  modifiedMs: number;
  sizeBytes: number;
  content: string;
} | null> {
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
}

export async function setSearchText(input: {
  indexPath: string;
  path: string;
  rolesKey: string;
  includeTools: boolean;
  modifiedMs: number;
  sizeBytes: number;
  content: string;
}): Promise<void> {
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
}

export async function clearSearchText(input: { indexPath?: string; path?: string } = {}): Promise<void> {
  const indexPath = input.indexPath ?? defaultSessionIndexPath();
  if (!input.path) {
    await clearIndexFile(indexPath);
    return;
  }
  const db = await openSqliteDb(indexPath);
  initializeSearchDb(db);
  try {
    db.query("DELETE FROM session_cache WHERE path=?").run([input.path]);
  } finally {
    db.close();
  }
}

export async function reindexSessions(input: {
  sessions: Array<{ path: string; source?: SessionSource }>;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
  limit?: number;
}): Promise<{ indexed: number; total: number }> {
  const total = input.sessions.length;
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, total) : total;
  let indexed = 0;
  for (const session of input.sessions.slice(0, limit)) {
    await getSearchTextCached({
      filePath: session.path,
      source: session.source,
      roles: input.roles,
      includeTools: input.includeTools,
      indexPath: input.indexPath,
    });
    indexed += 1;
  }
  return { indexed, total };
}

function metadataMatchScore(session: SessionListItem, needle: string): number {
  const n = needle.toLowerCase();
  const fields: Array<keyof SessionListItem | "status"> = [
    "title",
    "cwd",
    "project",
    "gitBranch",
    "model",
    "path",
    "sessionId",
    "status",
    "modelProvider",
  ];
  let score = 0;
  for (const f of fields) {
    const raw = (session as any)[f];
    if (raw == null) continue;
    const value = String(raw).toLowerCase();
    if (!value.includes(n)) continue;
    score += 1;
    if (f === "title" || f === "cwd" || f === "path" || f === "sessionId") score += 1;
  }
  return score;
}

export function searchSessionsByMetadata(input: {
  sessions: SessionListItem[];
  needle: string;
  limit?: number;
}): MetadataSearchHit[] {
  const trimmed = input.needle.trim();
  if (!trimmed) return [];
  const ranked: MetadataSearchHit[] = [];
  for (const session of input.sessions) {
    const score = metadataMatchScore(session, trimmed);
    if (score > 0) ranked.push({ ...session, matchScore: score });
  }
  ranked.sort((a, b) => (a.matchScore === b.matchScore ? (a.modified < b.modified ? 1 : -1) : b.matchScore - a.matchScore));
  return input.limit && input.limit > 0 ? ranked.slice(0, input.limit) : ranked;
}

export async function searchSessionsByContent(input: {
  sessions: SessionListItem[];
  pattern: string;
  ignoreCase?: boolean;
  maxMatches?: number;
  snippetLen?: number;
  roles: RoleFilter[];
  includeTools: boolean;
  useIndex?: boolean;
  indexPath: string;
}): Promise<SearchHit[]> {
  const flags = input.ignoreCase ?? true ? "gmi" : "gm";
  let rx: RegExp;
  try {
    rx = new RegExp(input.pattern, flags);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid regex for query: ${message}`);
  }

  const hits: SearchHit[] = [];
  const maxMatches = input.maxMatches && input.maxMatches > 0 ? input.maxMatches : 10;
  const snippetLen = input.snippetLen && input.snippetLen > 0 ? input.snippetLen : 200;
  for (const session of input.sessions) {
    const filePath = session.path;
    const source = (await detectSessionFormat(filePath)) as SessionSource;
    const text = input.useIndex ?? true
      ? await getSearchTextCached({ filePath, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath })
      : await getSearchTextUncached(filePath, source, input.roles, input.includeTools);
    const matches = [...text.matchAll(rx)];
    if (!matches.length) continue;

    const first = matches[0]!;
    const start = Math.max(0, first.index! - Math.floor(snippetLen / 2));
    const end = Math.min(text.length, start + snippetLen);
    hits.push({ ...session, matchCount: matches.length, matchSnippet: text.slice(start, end).replaceAll("\n", "\\n") });
  }
  hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
  return hits.slice(0, maxMatches);
}

export function createNodeSessionIndexRuntime(): SessionIndexRuntime {
  return {
    defaultIndexPath: defaultSessionIndexPath,
    getSearchText,
    setSearchText,
    clearSearchText,
    getSearchTextCached,
    reindexSessions,
    clearIndex: (input) => clearIndexFile(input?.indexPath ?? defaultSessionIndexPath()),
    clearIndexFile,
    searchSessionsByMetadata,
    searchSessionsByContent,
  };
}
