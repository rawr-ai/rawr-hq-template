/**
 * @fileoverview Assignment repository with local persistence behavior.
 *
 * @remarks
 * Expected duplicate checks are returned as values (`exists`) so procedure
 * handlers can decide caller-actionable boundary errors explicitly.
 */
import type { Sql } from "@rawr/hq-sdk";
import type { TodoIdentifierType } from "#example-todo-service/model/dto/identifier";
import type { WorkspaceIdType } from "#example-todo-service/model/dto/workspace-id";
import type { Assignment } from "./schemas";

export function createRepository(sql: Sql, workspaceId: WorkspaceIdType) {
  return {
    async findByTask(taskId: TodoIdentifierType): Promise<Assignment[]> {
      return await sql.query<Assignment>(
        "SELECT * FROM task_tags WHERE task_id = $1 AND workspace_id = $2 ORDER BY created_at DESC",
        [taskId, workspaceId]
      );
    },

    async exists(taskId: TodoIdentifierType, tagId: TodoIdentifierType): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>(
        "SELECT id FROM task_tags WHERE task_id = $1 AND tag_id = $2 AND workspace_id = $3",
        [taskId, tagId, workspaceId]
      );
      return !!row;
    },

    async insert(assignment: Assignment): Promise<Assignment> {
      const row = await sql.queryOne<Assignment>(
        `INSERT INTO task_tags (id, workspace_id, task_id, tag_id, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          assignment.id,
          assignment.workspaceId,
          assignment.taskId,
          assignment.tagId,
          assignment.createdAt,
        ]
      );

      if (!row) {
        throw new Error("task_tags.insert returned no row");
      }

      return row;
    },

    async countByTask(taskId: TodoIdentifierType): Promise<number> {
      const rows = await sql.query<Assignment>(
        "SELECT * FROM task_tags WHERE task_id = $1 AND workspace_id = $2 ORDER BY created_at DESC",
        [taskId, workspaceId]
      );
      return rows.length;
    },
  };
}
