import { err, ok, ResultAsync } from "neverthrow";
import type { Sql } from "../deps";
import { DatabaseError, NotFoundError } from "../errors";
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
