/**
 * @fileoverview Task repository (data access + domain-level failure mapping).
 *
 * @remarks
 * Task repository methods return promises and throw typed domain failures.
 * This keeps repository APIs straightforward while preserving typed failures.
 *
 * Invariants:
 * - Translate adapter errors to `DatabaseError`.
 * - Translate missing rows to domain `NotFoundError` where relevant.
 * - Do not create ORPC errors here.
 *
 * @agents
 * Keep SQL and row-to-domain mapping here. If a new query is added, return a
 * typed domain error on failure and let the router decide ORPC-level mapping.
 */
import type { Sql } from "../../boundary/deps";
import { DatabaseError, NotFoundError } from "../../boundary/service-errors";
import type { Task } from "./schemas";

export function createTaskRepository(sql: Sql) {
  return {
    async findById(id: string): Promise<Task> {
      try {
        const row = await sql.queryOne<Task>("SELECT * FROM tasks WHERE id = $1", [id]);
        if (!row) {
          throw new NotFoundError("Task", id);
        }

        return row;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }

        throw new DatabaseError(error);
      }
    },

    async insert(task: Task): Promise<Task> {
      try {
        const row = await sql.queryOne<Task>(
          `INSERT INTO tasks (id, title, description, completed, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [task.id, task.title, task.description, task.completed, task.createdAt, task.updatedAt],
        );

        if (!row) {
          throw new DatabaseError("tasks.insert returned no row");
        }

        return row;
      } catch (error) {
        if (error instanceof DatabaseError) {
          throw error;
        }

        throw new DatabaseError(error);
      }
    },

    async findByIds(ids: string[]): Promise<Task[]> {
      try {
        return await sql.query<Task>("SELECT * FROM tasks WHERE id = ANY($1) ORDER BY created_at DESC", [ids]);
      } catch (error) {
        throw new DatabaseError(error);
      }
    },
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
