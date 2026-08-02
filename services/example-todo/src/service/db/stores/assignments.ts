import type { Sql } from "@habitat-ai/rawr-hq-sdk";
import type { AssignmentType } from "../../model/dto/assignment";
import type { TodoIdentifierType } from "../../model/dto/identifier";
import type { WorkspaceIdType } from "../../model/dto/workspace-id";
import type { AssignmentsStore } from "../../model/ports/assignments-store";

/**
 * Binds assignment persistence to the SQL capability and workspace selected by
 * the service so relationship routes share one scoped persistence owner.
 */
export function createAssignmentsStore(sql: Sql, workspaceId: WorkspaceIdType): AssignmentsStore {
  return {
    async findByTask(taskId: TodoIdentifierType): Promise<AssignmentType[]> {
      return await sql.query<AssignmentType>(
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

    async insert(assignment: AssignmentType): Promise<AssignmentType> {
      const row = await sql.queryOne<AssignmentType>(
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
      const rows = await sql.query<AssignmentType>(
        "SELECT * FROM task_tags WHERE task_id = $1 AND workspace_id = $2 ORDER BY created_at DESC",
        [taskId, workspaceId]
      );
      return rows.length;
    },
  };
}
