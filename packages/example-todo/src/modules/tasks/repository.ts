/**
 * @fileoverview Task repository (data access + domain-level failure mapping).
 *
 * @remarks
 * Repositories return `ResultAsync` instead of throwing expected failures.
 * This keeps domain composition explicit and testable.
 *
 * Invariants:
 * - Translate adapter errors to `DatabaseError`.
 * - Translate missing rows to domain `NotFoundError` where relevant.
 * - Do not create ORPC errors here.
 *
 * @agents
 * Keep SQL and row-to-domain mapping here. If a new query is added, return a
 * typed `ResultAsync` and let the router decide ORPC-level error surface.
 */
import { err, ok, ResultAsync } from "neverthrow";
import type { Sql } from "../../boundary/deps";
import { DatabaseError, NotFoundError } from "../../boundary/service-errors";
import type { Task } from "./schemas";

function toDatabaseError(cause: unknown): DatabaseError {
  return new DatabaseError(cause);
}

export function createTaskRepository(sql: Sql) {
  return {
    findById(id: string): ResultAsync<Task, NotFoundError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<Task>("SELECT * FROM tasks WHERE id = $1", [id]),
        toDatabaseError,
      ).andThen((row) => (row ? ok(row) : err(new NotFoundError("Task", id))));
    },

    insert(task: Task): ResultAsync<Task, DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<Task>(
          `INSERT INTO tasks (id, title, description, completed, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [task.id, task.title, task.description, task.completed, task.createdAt, task.updatedAt],
        ),
        toDatabaseError,
      ).andThen((row) => (row ? ok(row) : err(new DatabaseError("tasks.insert returned no row"))));
    },

    findByIds(ids: string[]): ResultAsync<Task[], DatabaseError> {
      return ResultAsync.fromPromise(
        sql.query<Task>("SELECT * FROM tasks WHERE id = ANY($1) ORDER BY created_at DESC", [ids]),
        toDatabaseError,
      );
    },
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
