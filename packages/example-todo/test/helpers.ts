import type { DbPool } from "../src/orpc/ports/db";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";
import type { Assignment } from "../src/service/modules/assignments/schemas";
import type { Tag } from "../src/service/modules/tags/schemas";
import type { Task } from "../src/service/modules/tasks/schemas";

type InMemorySqlOptions = {
  failIfQueryIncludes?: string[];
};

export type LogEntry = {
  level: "info" | "error";
  event: string;
  payload: Record<string, unknown>;
};

export type AnalyticsEntry = {
  event: string;
  payload: Record<string, unknown>;
};

type DepsOptions = InMemorySqlOptions & {
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

type ClientOptions = DepsOptions & {
  deps?: Service["Deps"];
  readOnly?: boolean;
  maxAssignmentsPerTask?: number;
  workspaceId?: string;
};

export type OrpcErrorShape = {
  defined?: boolean;
  code?: string;
  status?: number;
  data?: Record<string, unknown>;
};

export function createInMemorySql(options: InMemorySqlOptions = {}) {
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

export function createDeps(options: DepsOptions = {}): Service["Deps"] {
  let tick = 0;
  const sql = createInMemorySql(options);
  const dbPool: DbPool = {
    connect: () => sql,
  };

  return {
    dbPool,
    clock: {
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 1, 25, 0, 0, tick)).toISOString();
      },
    },
    logger: {
      info: (event, payload) => {
        options.logs?.push({
          level: "info",
          event,
          payload: (payload as Record<string, unknown> | undefined) ?? {},
        });
      },
      error: (event, payload) => {
        options.logs?.push({
          level: "error",
          event,
          payload: (payload as Record<string, unknown> | undefined) ?? {},
        });
      },
    },
    analytics: {
      track: (event, payload) => {
        options.analytics?.push({
          event,
          payload: (payload as Record<string, unknown> | undefined) ?? {},
        });
      },
    },
  };
}

export function createClientOptions(options: ClientOptions = {}): CreateClientOptions {
  return {
    deps: options.deps ?? createDeps(options),
    scope: {
      workspaceId: options.workspaceId ?? "workspace-default",
    },
    config: {
      readOnly: options.readOnly ?? false,
      limits: {
        maxAssignmentsPerTask: options.maxAssignmentsPerTask ?? 2,
      },
    },
  };
}

export function createInvocation(traceId = "trace-default") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export const invocation = createInvocation;
