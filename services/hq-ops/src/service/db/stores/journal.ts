import { Value } from "typebox/value";
import type {
  FileSystemResource,
  JournalIndexDatabaseResource,
  PathResource,
  SqliteDatabase,
} from "../../model/ports/resources";
import {
  type JournalEvent,
  type JournalSnippet,
  JournalSnippetSchema,
} from "../../modules/journal/entities";
import {
  type JournalSearchRow,
  JournalSearchRowSchema,
} from "../../modules/journal/model/dto/journal.dto";
import type {
  JournalEmbeddingCacheKey,
  JournalEmbeddingCacheWrite,
  JournalIndex,
} from "../../modules/journal/model/ports/journal-index";
import type { JournalStore } from "../../modules/journal/model/ports/journal-store";

type JournalStoreOptions = {
  fs: FileSystemResource;
  indexDatabase: JournalIndexDatabaseResource;
  path: PathResource;
  repoRoot: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function decodeSearchRow(row: unknown): JournalSearchRow {
  if (!isRecord(row)) throw new TypeError("Journal index returned a non-record search row");

  const candidate = {
    id: row.id,
    ts: row.ts,
    kind: row.kind,
    title: row.title,
    preview: row.preview,
    tags: parseTags(row.tags),
    sourceEventId: row.sourceEventId == null ? undefined : row.sourceEventId,
  };

  if (!Value.Check(JournalSearchRowSchema, candidate)) {
    throw new TypeError("Journal index returned an invalid search row");
  }

  return candidate;
}

function decodeSnippetRow(row: unknown): JournalSnippet {
  if (!isRecord(row)) throw new TypeError("Journal index returned a non-record snippet row");

  const candidate = { ...decodeSearchRow(row), body: row.body };
  if (!Value.Check(JournalSnippetSchema, candidate)) {
    throw new TypeError("Journal index returned an invalid snippet row");
  }

  return candidate;
}

function upsertSnippet(db: SqliteDatabase, snippet: JournalSnippet): void {
  const tags = JSON.stringify(snippet.tags);

  db.prepare(
    `INSERT OR REPLACE INTO snippets (id, ts, kind, title, preview, body, tags, sourceEventId)
     VALUES ($id, $ts, $kind, $title, $preview, $body, $tags, $sourceEventId)`
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

  db.prepare("DELETE FROM snippets_fts WHERE id = $id").run({ $id: snippet.id });
  db.prepare(
    `INSERT INTO snippets_fts (id, title, preview, body, tags)
     VALUES ($id, $title, $preview, $body, $tags)`
  ).run({
    $id: snippet.id,
    $title: snippet.title,
    $preview: snippet.preview,
    $body: snippet.body,
    $tags: tags,
  });
}

function tailIndexedSnippets(db: SqliteDatabase, limit: number): JournalSearchRow[] {
  const rows = db
    .prepare(
      `SELECT id, ts, kind, title, preview, tags, sourceEventId
       FROM snippets
       ORDER BY ts DESC
       LIMIT $limit`
    )
    .all({ $limit: limit });

  return rows.map(decodeSearchRow);
}

function searchIndexedSnippets(
  db: SqliteDatabase,
  query: string,
  limit: number
): JournalSearchRow[] {
  const ids = db
    .prepare(
      `SELECT id
       FROM snippets_fts
       WHERE snippets_fts MATCH $query
       LIMIT $limit`
    )
    .all({ $query: query, $limit: limit });

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const selectedIds = ids.map((row) => {
    if (!isRecord(row) || typeof row.id !== "string") {
      throw new TypeError("Journal index returned an invalid full-text search identity");
    }
    return row.id;
  });
  const rows = db
    .prepare(
      `SELECT id, ts, kind, title, preview, tags, sourceEventId
       FROM snippets
       WHERE id IN (${placeholders})
       ORDER BY ts DESC`
    )
    .all(...selectedIds);

  return rows.map(decodeSearchRow);
}

function listRecentSnippets(db: SqliteDatabase, limit: number): JournalSnippet[] {
  const rows = db
    .prepare(
      `SELECT id, ts, kind, title, preview, body, tags, sourceEventId
       FROM snippets
       ORDER BY ts DESC
       LIMIT $limit`
    )
    .all({ $limit: limit });

  return rows.map(decodeSnippetRow);
}

function float32ToBlob(vector: Float32Array): Uint8Array {
  return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
}

function blobToFloat32(blob: Uint8Array): Float32Array {
  const buffer = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
  return new Float32Array(buffer);
}

function readEmbedding(db: SqliteDatabase, key: JournalEmbeddingCacheKey): Float32Array | null {
  const row = db
    .prepare(
      `SELECT provider, model, dims, contentHash, vector
       FROM snippet_embeddings
       WHERE id = $id`
    )
    .get({ $id: key.id });

  if (
    isRecord(row) &&
    typeof row.provider === "string" &&
    typeof row.model === "string" &&
    typeof row.dims === "number" &&
    Number.isInteger(row.dims) &&
    typeof row.contentHash === "string" &&
    row.vector instanceof Uint8Array &&
    row.provider === key.provider &&
    row.model === key.model &&
    row.contentHash === key.contentHash &&
    row.vector.byteLength === row.dims * Float32Array.BYTES_PER_ELEMENT
  ) {
    return blobToFloat32(row.vector);
  }

  return null;
}

function writeEmbedding(db: SqliteDatabase, input: JournalEmbeddingCacheWrite): void {
  db.prepare(
    `INSERT OR REPLACE INTO snippet_embeddings
       (id, provider, model, dims, contentHash, vector, updatedAt)
     VALUES ($id, $provider, $model, $dims, $contentHash, $vector, $updatedAt)`
  ).run({
    $id: input.id,
    $provider: input.provider,
    $model: input.model,
    $dims: input.vector.length,
    $contentHash: input.contentHash,
    $vector: float32ToBlob(input.vector),
    $updatedAt: new Date().toISOString(),
  });
}

function createJournalIndex(db: SqliteDatabase): JournalIndex {
  return {
    upsertSnippet: (snippet) => upsertSnippet(db, snippet),
    tailSnippets: (limit) => tailIndexedSnippets(db, limit),
    searchFts: (query, limit) => searchIndexedSnippets(db, query, limit),
    listRecentSnippets: (limit) => listRecentSnippets(db, limit),
    readEmbedding: (key) => readEmbedding(db, key),
    writeEmbedding: (input) => writeEmbedding(db, input),
  };
}

/**
 * Creates the service-owned Journal store over canonical JSON records and a
 * host-opened, migration-ready SQLite derived index.
 */
export function createJournalStore(options: JournalStoreOptions): JournalStore {
  const journalRoot = options.path.join(options.repoRoot, ".rawr", "journal");
  const eventsDirectory = options.path.join(journalRoot, "events");
  const snippetsDirectory = options.path.join(journalRoot, "snippets");
  const databasePath = options.path.join(journalRoot, "index.sqlite");

  return {
    async writeEvent(event) {
      await options.fs.mkdir(eventsDirectory);
      const filePath = options.path.join(eventsDirectory, `${event.id}.json`);
      await options.fs.writeText(filePath, JSON.stringify(event, null, 2));
      return filePath;
    },

    async writeSnippet(snippet) {
      await options.fs.mkdir(snippetsDirectory);
      const filePath = options.path.join(snippetsDirectory, `${snippet.id}.json`);
      await options.fs.writeText(filePath, JSON.stringify(snippet, null, 2));
      return filePath;
    },

    async getSnippet(id) {
      const raw = await options.fs.readText(options.path.join(snippetsDirectory, `${id}.json`));
      if (raw === null) return null;

      try {
        return JSON.parse(raw) as JournalSnippet;
      } catch {
        return null;
      }
    },

    async withIndex(operation) {
      const db = await options.indexDatabase.open(databasePath);
      try {
        return await operation(createJournalIndex(db));
      } finally {
        db.close();
      }
    },
  };
}
