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
import type { Sql } from "../../orpc-runtime/deps";
import { UnexpectedInternalError } from "../../orpc-runtime/internal-errors";
import type { Task } from "./schemas";

export function createRepository(sql: Sql) {
  return {
    async findById(id: string): Promise<Task | null> {
      return await sql.queryOne<Task>("SELECT * FROM tasks WHERE id = $1", [id]);
    },

    async insert(task: Task): Promise<Task> {
      const row = await sql.queryOne<Task>(
        `INSERT INTO tasks (id, title, description, completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [task.id, task.title, task.description, task.completed, task.createdAt, task.updatedAt],
      );

      if (!row) {
        throw new UnexpectedInternalError("tasks.insert returned no row");
      }

      return row;
    },

    async findByIds(ids: string[]): Promise<Task[]> {
      return await sql.query<Task>("SELECT * FROM tasks WHERE id = ANY($1) ORDER BY created_at DESC", [ids]);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
