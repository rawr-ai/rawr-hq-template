/**
 * @fileoverview Assignment repository with composite-domain constraints.
 *
 * @remarks
 * This repository handles assignment persistence and local conflict detection
 * (`AlreadyAssignedError`). It does not verify task/tag existence; that check is
 * composed at router level using other repositories.
 *
 * @agents
 * Preserve this split:
 * - repository handles assignment table behavior,
 * - router composes cross-module existence checks and contract-level mapping.
 */
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Sql } from "../../boundary/deps";
import { DatabaseError } from "../../boundary/service-errors";
import { AlreadyAssignedError } from "./errors";
import type { Assignment } from "./schemas";

function toDatabaseError(cause: unknown): DatabaseError {
  return new DatabaseError(cause);
}

export function createAssignmentRepository(sql: Sql) {
  return {
    findByTask(taskId: string): ResultAsync<Assignment[], DatabaseError> {
      return ResultAsync.fromPromise(
        sql.query<Assignment>("SELECT * FROM task_tags WHERE task_id = $1 ORDER BY created_at DESC", [taskId]),
        toDatabaseError,
      );
    },

    insert(assignment: Assignment): ResultAsync<Assignment, AlreadyAssignedError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<{ id: string }>("SELECT id FROM task_tags WHERE task_id = $1 AND tag_id = $2", [
          assignment.taskId,
          assignment.tagId,
        ]),
        toDatabaseError,
      ).andThen((existing) => {
        if (existing) {
          return errAsync(new AlreadyAssignedError(assignment.taskId, assignment.tagId));
        }

        return ResultAsync.fromPromise(
          sql.queryOne<Assignment>(
            `INSERT INTO task_tags (id, task_id, tag_id, created_at)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [assignment.id, assignment.taskId, assignment.tagId, assignment.createdAt],
          ),
          toDatabaseError,
        ).andThen((row) => (row ? okAsync(row) : errAsync(new DatabaseError("task_tags.insert returned no row"))));
      });
    },
  };
}

export type AssignmentRepository = ReturnType<typeof createAssignmentRepository>;
