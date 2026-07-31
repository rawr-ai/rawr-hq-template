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
