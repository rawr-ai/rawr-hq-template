import type { DbPool, Sql } from "../../ports/db";
import type { Assignment } from "../../../service/modules/assignments/schemas";
import type { Tag } from "../../../service/modules/tags/schemas";
import type { Task } from "../../../service/modules/tasks/schemas";

/**
 * @fileoverview Embedded in-memory SQL adapter.
 *
 * @remarks
 * This is a temporary in-memory host adapter used for tests and in-process
 * composition. It demonstrates the host-adapter shape for SQL without implying
 * that an in-memory implementation is the long-term production adapter.
 */

export type EmbeddedInMemorySqlOptions = {
  failIfQueryIncludes?: string[];
};

export function createEmbeddedInMemorySqlAdapter(
  options: EmbeddedInMemorySqlOptions = {},
): Sql {
  const tasks = new Map<string, Task>();
  const tags = new Map<string, Tag>();
  const assignments = new Map<string, Assignment>();

  function shouldFail(text: string): boolean {
    return options.failIfQueryIncludes?.some((pattern) => text.includes(pattern)) ?? false;
  }

  async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | null> {
    if (shouldFail(text)) {
      throw new Error(`forced failure for queryOne: ${text}`);
    }

    if (text.includes("SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2")) {
      const task = tasks.get(String(params[0])) ?? null;
      const workspaceId = String(params[1]);
      return (task && task.workspaceId === workspaceId ? task : null) as T | null;
    }

    if (text.includes("INSERT INTO tasks")) {
      const task: Task = {
        id: String(params[0]),
        workspaceId: String(params[1]),
        title: String(params[2]),
        description: (params[3] as string | null) ?? null,
        completed: Boolean(params[4]),
        createdAt: String(params[5]),
        updatedAt: String(params[6]),
      };
      tasks.set(task.id, task);
      return task as T;
    }

    if (text.includes("SELECT id FROM tags WHERE name = $1 AND workspace_id = $2")) {
      const existing = [...tags.values()].find(
        (tag) => tag.name === String(params[0]) && tag.workspaceId === String(params[1]),
      );
      return (existing ? { id: existing.id } : null) as T | null;
    }

    if (text.includes("SELECT * FROM tags WHERE id = $1 AND workspace_id = $2")) {
      const tag = tags.get(String(params[0])) ?? null;
      const workspaceId = String(params[1]);
      return (tag && tag.workspaceId === workspaceId ? tag : null) as T | null;
    }

    if (text.includes("INSERT INTO tags")) {
      const tag: Tag = {
        id: String(params[0]),
        workspaceId: String(params[1]),
        name: String(params[2]),
        color: String(params[3]),
        createdAt: String(params[4]),
      };
      tags.set(tag.id, tag);
      return tag as T;
    }

    if (text.includes("SELECT id FROM task_tags WHERE task_id = $1 AND tag_id = $2 AND workspace_id = $3")) {
      const existing = [...assignments.values()].find(
        (assignment) =>
          assignment.taskId === String(params[0])
          && assignment.tagId === String(params[1])
          && assignment.workspaceId === String(params[2]),
      );
      return (existing ? { id: existing.id } : null) as T | null;
    }

    if (text.includes("INSERT INTO task_tags")) {
      const assignment: Assignment = {
        id: String(params[0]),
        workspaceId: String(params[1]),
        taskId: String(params[2]),
        tagId: String(params[3]),
        createdAt: String(params[4]),
      };
      assignments.set(assignment.id, assignment);
      return assignment as T;
    }

    throw new Error(`Unsupported queryOne SQL: ${text}`);
  }

  async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    if (shouldFail(text)) {
      throw new Error(`forced failure for query: ${text}`);
    }

    if (text.includes("SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC")) {
      const workspaceId = String(params[0]);
      return [...tags.values()]
        .filter((tag) => tag.workspaceId === workspaceId)
        .sort((a, b) => a.name.localeCompare(b.name)) as T[];
    }

    if (text.includes("SELECT * FROM tags WHERE id = ANY($1) AND workspace_id = $2 ORDER BY name ASC")) {
      const ids = new Set((params[0] as string[]) ?? []);
      const workspaceId = String(params[1]);
      return [...tags.values()]
        .filter((tag) => ids.has(tag.id) && tag.workspaceId === workspaceId)
        .sort((a, b) => a.name.localeCompare(b.name)) as T[];
    }

    if (text.includes("SELECT * FROM tasks WHERE id = ANY($1) AND workspace_id = $2 ORDER BY created_at DESC")) {
      const ids = new Set((params[0] as string[]) ?? []);
      const workspaceId = String(params[1]);
      return [...tasks.values()]
        .filter((task) => ids.has(task.id) && task.workspaceId === workspaceId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as T[];
    }

    if (text.includes("SELECT * FROM task_tags WHERE task_id = $1 AND workspace_id = $2 ORDER BY created_at DESC")) {
      const taskId = String(params[0]);
      const workspaceId = String(params[1]);
      return [...assignments.values()]
        .filter((assignment) => assignment.taskId === taskId && assignment.workspaceId === workspaceId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as T[];
    }

    throw new Error(`Unsupported query SQL: ${text}`);
  }

  return { queryOne, query };
}

export function createEmbeddedInMemoryDbPoolAdapter(
  options: EmbeddedInMemorySqlOptions = {},
): DbPool {
  const sql = createEmbeddedInMemorySqlAdapter(options);

  return {
    connect() {
      return sql;
    },
  };
}
