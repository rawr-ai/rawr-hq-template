import { indexDbPath } from "./paths";
import { openSqliteDatabase, type SqliteDatabase } from "./sqlite";
import type { JournalSnippet, JournalSearchRow } from "./store";

export type JournalSnippetRowFull = JournalSearchRow & Pick<JournalSnippet, "body">;

function parseTags(value: unknown): string[] {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) return parsed;
  } catch {
    // ignore malformed tags
  }
  return [];
}

function normalizeRow(row: Record<string, unknown>): JournalSearchRow {
  return {
    id: String(row.id),
    ts: String(row.ts),
    kind: row.kind as JournalSearchRow["kind"],
    title: String(row.title),
    preview: String(row.preview),
    tags: parseTags(row.tags),
    sourceEventId: row.sourceEventId == null ? undefined : String(row.sourceEventId),
  };
}

function normalizeRowFull(row: Record<string, unknown>): JournalSnippetRowFull {
  return { ...normalizeRow(row), body: String(row.body) };
}

export async function openJournalDb(repoRoot: string): Promise<SqliteDatabase> {
  const db = await openSqliteDatabase(indexDbPath(repoRoot));

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      preview TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      sourceEventId TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts USING fts5(
      id,
      title,
      preview,
      body,
      tags
    );

    CREATE TABLE IF NOT EXISTS snippet_embeddings (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      dims INTEGER NOT NULL,
      contentHash TEXT NOT NULL,
      vector BLOB NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  return db;
}

export function upsertSnippet(db: SqliteDatabase, snippet: JournalSnippet): void {
  const tags = JSON.stringify(snippet.tags ?? []);

  db.prepare(
    `INSERT OR REPLACE INTO snippets (id, ts, kind, title, preview, body, tags, sourceEventId)
     VALUES ($id, $ts, $kind, $title, $preview, $body, $tags, $sourceEventId)`,
  ).run({
    $id: snippet.id,
    $ts: snippet.ts,
    $kind: snippet.kind,
    $title: snippet.title,
    $preview: snippet.preview,
    $body: snippet.body,
    $tags: tags,
    $sourceEventId: snippet.sourceEventId ?? null,
  });

  db.prepare(
    `INSERT OR REPLACE INTO snippets_fts (id, title, preview, body, tags)
     VALUES ($id, $title, $preview, $body, $tags)`,
  ).run({
    $id: snippet.id,
    $title: snippet.title,
    $preview: snippet.preview,
    $body: snippet.body,
    $tags: tags,
  });
}

export function tailSnippets(db: SqliteDatabase, limit: number): JournalSearchRow[] {
  const rows = db.prepare(
    `SELECT id, ts, kind, title, preview, tags, sourceEventId
     FROM snippets
     ORDER BY ts DESC
     LIMIT $limit`,
  ).all({ $limit: limit }) as Array<Record<string, unknown>>;
  return rows.map(normalizeRow);
}

export function searchSnippetsFts(db: SqliteDatabase, query: string, limit: number): JournalSearchRow[] {
  const ids = db.prepare(
    `SELECT id
     FROM snippets_fts
     WHERE snippets_fts MATCH $q
     LIMIT $limit`,
  ).all({ $q: query, $limit: limit }) as Array<{ id: string }>;

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT id, ts, kind, title, preview, tags, sourceEventId
     FROM snippets
     WHERE id IN (${placeholders})
     ORDER BY ts DESC`,
  ).all(...ids.map((row) => row.id)) as Array<Record<string, unknown>>;

  return rows.map(normalizeRow);
}

export function listRecentSnippetsFull(db: SqliteDatabase, limit: number): JournalSnippetRowFull[] {
  const rows = db.prepare(
    `SELECT id, ts, kind, title, preview, body, tags, sourceEventId
     FROM snippets
     ORDER BY ts DESC
     LIMIT $limit`,
  ).all({ $limit: limit }) as Array<Record<string, unknown>>;
  return rows.map(normalizeRowFull);
}
