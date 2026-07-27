CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description VARCHAR(2000),
  completed BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX tasks_workspace_created_at_idx
  ON tasks (workspace_id, created_at DESC);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name VARCHAR(50) NOT NULL,
  color CHAR(7) NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, name)
);

CREATE TABLE task_tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks (id),
  tag_id TEXT NOT NULL REFERENCES tags (id),
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, task_id, tag_id)
);

CREATE INDEX task_tags_workspace_task_created_at_idx
  ON task_tags (workspace_id, task_id, created_at DESC);
