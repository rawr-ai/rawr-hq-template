/**
 * @fileoverview Assignment repository with local persistence behavior.
 *
 * @remarks
 * Expected duplicate checks are returned as values (`exists`) so procedure
 * handlers can decide caller-actionable boundary errors explicitly.
 */
import type { Sql } from "../../deps";
import { UnexpectedInternalError } from "../../shared/internal-errors";
import type { Assignment } from "./schemas";

export function createRepository(sql: Sql) {
  return {
    async findByTask(taskId: string): Promise<Assignment[]> {
      return await sql.query<Assignment>("SELECT * FROM task_tags WHERE task_id = $1 ORDER BY created_at DESC", [taskId]);
    },

    async exists(taskId: string, tagId: string): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>("SELECT id FROM task_tags WHERE task_id = $1 AND tag_id = $2", [taskId, tagId]);
      return !!row;
    },

    async insert(assignment: Assignment): Promise<Assignment> {
      const row = await sql.queryOne<Assignment>(
        `INSERT INTO task_tags (id, task_id, tag_id, created_at)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [assignment.id, assignment.taskId, assignment.tagId, assignment.createdAt],
      );

      if (!row) {
        throw new UnexpectedInternalError("task_tags.insert returned no row");
      }

      return row;
    },
  };
}
