import type { Sql } from "@rawr/hq-sdk";
import type { TodoIdentifierType } from "../../model/dto/identifier";
import type { Task } from "../../model/dto/task";
import type { WorkspaceIdType } from "../../model/dto/workspace-id";
import type { TasksStore } from "../../model/ports/tasks-store";

/**
 * Binds task persistence to the SQL capability and workspace selected by the
 * service so task routes never issue raw queries or supply scope ad hoc.
 */
export function createTasksStore(sql: Sql, workspaceId: WorkspaceIdType): TasksStore {
  return {
    async findById(id: TodoIdentifierType): Promise<Task | null> {
      return await sql.queryOne<Task>("SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2", [
        id,
        workspaceId,
      ]);
    },

    async insert(task: Task): Promise<Task> {
      const row = await sql.queryOne<Task>(
        `INSERT INTO tasks (id, workspace_id, title, description, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          task.id,
          task.workspaceId,
          task.title,
          task.description,
          task.completed,
          task.createdAt,
          task.updatedAt,
        ]
      );

      if (!row) {
        throw new Error("tasks.insert returned no row");
      }

      return row;
    },

    async findByIds(ids: TodoIdentifierType[]): Promise<Task[]> {
      return await sql.query<Task>(
        "SELECT * FROM tasks WHERE id = ANY($1) AND workspace_id = $2 ORDER BY created_at DESC",
        [ids, workspaceId]
      );
    },
  };
}
