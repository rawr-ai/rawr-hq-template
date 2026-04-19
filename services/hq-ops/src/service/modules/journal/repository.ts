import { createHash } from "node:crypto";
import type {
  HqOpsResources,
  SemanticEmbeddingConfig,
  SqliteDatabase,
} from "../../shared/ports/resources";
import type { JournalEvent, JournalSearchRow, JournalSnippet } from "./schemas";

export type JournalSearchResult = {
  mode: "fts" | "semantic";
  warning?: string;
  snippets: JournalSearchRow[];
};

type JournalSnippetRowFull = JournalSearchRow & Pick<JournalSnippet, "body">;

function journalRoot(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(repoRoot, ".rawr", "journal");
}

function eventsDir(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "events");
}

function snippetsDir(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "snippets");
}

function indexDbPath(resources: HqOpsResources, repoRoot: string): string {
  return resources.path.join(journalRoot(resources, repoRoot), "index.sqlite");
}

function eventJsonPath(resources: HqOpsResources, repoRoot: string, id: string): string {
  return resources.path.join(eventsDir(resources, repoRoot), `${id}.json`);
}

function snippetJsonPath(resources: HqOpsResources, repoRoot: string, id: string): string {
  return resources.path.join(snippetsDir(resources, repoRoot), `${id}.json`);
}

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

async function openJournalDb(resources: HqOpsResources, repoRoot: string): Promise<SqliteDatabase> {
  const db = await resources.sqlite.open(indexDbPath(resources, repoRoot));

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

function upsertSnippet(db: SqliteDatabase, snippet: JournalSnippet): void {
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

function tailIndexedSnippets(db: SqliteDatabase, limit: number): JournalSearchRow[] {
  const rows = db.prepare(
    `SELECT id, ts, kind, title, preview, tags, sourceEventId
     FROM snippets
     ORDER BY ts DESC
     LIMIT $limit`,
  ).all({ $limit: limit }) as Array<Record<string, unknown>>;
  return rows.map(normalizeRow);
}

function searchSnippetsFts(db: SqliteDatabase, query: string, limit: number): JournalSearchRow[] {
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

function listRecentSnippetsFull(db: SqliteDatabase, limit: number): JournalSnippetRowFull[] {
  const rows = db.prepare(
    `SELECT id, ts, kind, title, preview, body, tags, sourceEventId
     FROM snippets
     ORDER BY ts DESC
     LIMIT $limit`,
  ).all({ $limit: limit }) as Array<Record<string, unknown>>;
  return rows.map(normalizeRowFull);
}

function semanticContent(snippet: { title: string; body: string; tags: string[] }): string {
  const tags = snippet.tags.length > 0 ? `tags: ${snippet.tags.join(",")}\n` : "";
  return `${snippet.title}\n${tags}\n${snippet.body}`.trim();
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function float32ToBlob(vec: Float32Array): Uint8Array {
  return new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
}

function blobToFloat32(blob: Uint8Array): Float32Array {
  const ab = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
  return new Float32Array(ab);
}

async function ensureSnippetEmbedding(
  resources: HqOpsResources,
  db: SqliteDatabase,
  input: { id: string; model: string; content: string; config: SemanticEmbeddingConfig },
): Promise<Float32Array> {
  const contentHash = sha256Hex(input.content);
  const row = db.prepare(
    `SELECT provider, model, dims, contentHash, vector
     FROM snippet_embeddings
     WHERE id = $id`,
  ).get({ $id: input.id }) as
    | { provider: string; model: string; dims: number; contentHash: string; vector: Uint8Array }
    | undefined;

  if (
    row &&
    row.provider === input.config.provider &&
    row.model === input.model &&
    row.contentHash === contentHash &&
    row.vector
  ) {
    return blobToFloat32(row.vector);
  }

  const vec = await resources.embeddings.embedText({ text: input.content, config: input.config });
  db.prepare(
    `INSERT OR REPLACE INTO snippet_embeddings (id, provider, model, dims, contentHash, vector, updatedAt)
     VALUES ($id, $provider, $model, $dims, $contentHash, $vector, $updatedAt)`,
  ).run({
    $id: input.id,
    $provider: input.config.provider,
    $model: input.model,
    $dims: vec.length,
    $contentHash: contentHash,
    $vector: float32ToBlob(vec),
    $updatedAt: new Date().toISOString(),
  });

  return vec;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let a2 = 0;
  let b2 = 0;

  for (let i = 0; i < n; i += 1) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    a2 += av * av;
    b2 += bv * bv;
  }

  if (a2 === 0 || b2 === 0) return 0;
  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
}

async function searchSnippetsSemantic(
  resources: HqOpsResources,
  db: SqliteDatabase,
  query: string,
  limit: number,
  opts?: { candidateLimit?: number },
): Promise<Array<JournalSearchRow & { score: number }>> {
  const config = resources.embeddings.getConfig();
  if (!config) throw new Error("Semantic search not configured (missing embedding provider configuration)");

  const candidateLimit = Math.max(1, Math.min(opts?.candidateLimit ?? 200, 500));
  const candidates = listRecentSnippetsFull(db, candidateLimit);
  if (candidates.length === 0) return [];

  const qVec = await resources.embeddings.embedText({ text: query, config });
  const scored: Array<JournalSearchRow & { score: number }> = [];

  for (const snippet of candidates) {
    const content = semanticContent(snippet);
    const vec = await ensureSnippetEmbedding(resources, db, {
      id: snippet.id,
      model: config.model,
      content,
      config,
    });
    const score = cosineSimilarity(qVec, vec);
    const row: JournalSearchRow = {
      id: snippet.id,
      ts: snippet.ts,
      kind: snippet.kind,
      title: snippet.title,
      preview: snippet.preview,
      tags: snippet.tags,
      sourceEventId: snippet.sourceEventId,
    };
    scored.push({ ...row, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function readSnippetJson(resources: HqOpsResources, repoRoot: string, id: string): Promise<JournalSnippet | null> {
  const raw = await resources.fs.readText(snippetJsonPath(resources, repoRoot, id));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as JournalSnippet;
  } catch {
    return null;
  }
}

async function writeEvent(resources: HqOpsResources, repoRoot: string, event: JournalEvent): Promise<string> {
  await resources.fs.mkdir(eventsDir(resources, repoRoot));
  const filePath = eventJsonPath(resources, repoRoot, event.id);
  await resources.fs.writeText(filePath, JSON.stringify(event, null, 2));
  return filePath;
}

async function writeSnippet(
  resources: HqOpsResources,
  repoRoot: string,
  snippet: JournalSnippet,
  db?: SqliteDatabase,
): Promise<string> {
  await resources.fs.mkdir(snippetsDir(resources, repoRoot));
  const filePath = snippetJsonPath(resources, repoRoot, snippet.id);
  await resources.fs.writeText(filePath, JSON.stringify(snippet, null, 2));

  let localDb: SqliteDatabase | undefined;
  try {
    localDb = db ?? (await openJournalDb(resources, repoRoot));
    upsertSnippet(localDb, snippet);
  } catch {
    // JSON remains the source of truth even if the sqlite index is unavailable.
  } finally {
    if (!db && localDb) localDb.close();
  }

  return filePath;
}

export function createRepository(resources: HqOpsResources, repoRoot: string) {
  return {
    async writeEvent(event: JournalEvent) {
      return { path: await writeEvent(resources, repoRoot, event) };
    },
    async writeSnippet(snippet: JournalSnippet) {
      return { path: await writeSnippet(resources, repoRoot, snippet) };
    },
    async getSnippet(id: string) {
      return { snippet: await readSnippetJson(resources, repoRoot, id) };
    },
    async tailSnippets(limit: number) {
      const db = await openJournalDb(resources, repoRoot);
      try {
        return { snippets: tailIndexedSnippets(db, limit) };
      } finally {
        db.close();
      }
    },
    async searchSnippets(query: string, limit: number, mode: "fts" | "semantic") {
      const db = await openJournalDb(resources, repoRoot);
      try {
        if (mode === "semantic") {
          try {
            return { mode, snippets: await searchSnippetsSemantic(resources, db, query, limit) } satisfies JournalSearchResult;
          } catch (error) {
            return {
              mode,
              warning: error instanceof Error ? error.message : String(error),
              snippets: [],
            } satisfies JournalSearchResult;
          }
        }

        return { mode, snippets: searchSnippetsFts(db, query, limit) } satisfies JournalSearchResult;
      } finally {
        db.close();
      }
    },
  };
}
