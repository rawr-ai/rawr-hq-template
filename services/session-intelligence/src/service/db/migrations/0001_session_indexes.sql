CREATE TABLE IF NOT EXISTS codex_file_index (
  file_path TEXT PRIMARY KEY,
  root_dir TEXT NOT NULL,
  status TEXT NOT NULL,
  modified_ms REAL NOT NULL,
  size_bytes INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified
  ON codex_file_index(root_dir, modified_ms DESC);

CREATE TABLE IF NOT EXISTS codex_root_scan_state (
  root_dir TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  root_mtime_ms REAL NOT NULL,
  scanned_at_ms REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS session_cache (
  path TEXT NOT NULL,
  roles TEXT NOT NULL,
  include_tools INTEGER NOT NULL,
  mtime REAL NOT NULL,
  size INTEGER NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (path, roles, include_tools)
);

CREATE INDEX IF NOT EXISTS idx_session_cache_path ON session_cache(path);
