/**
 * @fileoverview Task repository (data access only).
 *
 * @remarks
 * Expected business states are returned as values:
 * - `findById` returns `null` when missing.
 *
 * Unexpected/internal failures bubble via thrown exceptions from the adapter.
 * We only wrap impossible local invariants with `UnexpectedInternalError`.
 *
 * @agents
 * Keep boundary concerns out of this file. Procedure routers decide caller
 * actionable errors from returned values.
 */
import type { Sql } from "../../../orpc-sdk";
import { UnexpectedInternalError } from "../../shared/internal-errors";
import type { Task } from "./schemas";

export function createRepository(sql: Sql, workspaceId: string) {
  return {
    async findById(id: string): Promise<Task | null> {
      return await sql.queryOne<Task>("SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2", [id, workspaceId]);
    },

    async insert(task: Task): Promise<Task> {
      const row = await sql.queryOne<Task>(
        `INSERT INTO tasks (id, workspace_id, title, description, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [task.id, task.workspaceId, task.title, task.description, task.completed, task.createdAt, task.updatedAt],
      );

      if (!row) {
        throw new UnexpectedInternalError("tasks.insert returned no row");
      }

      return row;
    },

    async findByIds(ids: string[]): Promise<Task[]> {
      return await sql.query<Task>(
        "SELECT * FROM tasks WHERE id = ANY($1) AND workspace_id = $2 ORDER BY created_at DESC",
        [ids, workspaceId],
      );
    },
  };
}
