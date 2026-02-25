import { ResultAsync, ok, err } from 'neverthrow'
import type { Assignment } from './schemas.js'
import type { Sql } from '../deps.js'
import { DatabaseError } from '../errors.js'
import { AlreadyAssignedError } from './errors.js'

export function createAssignmentRepository(sql: Sql) {
  return {
    findByTask(taskId: string): ResultAsync<Assignment[], DatabaseError> {
      return ResultAsync.fromPromise(
        sql.query<Assignment>(
          'SELECT * FROM task_tags WHERE task_id = $1 ORDER BY created_at DESC',
          [taskId],
        ),
        (cause) => new DatabaseError(cause),
      )
    },

    insert(assignment: Assignment): ResultAsync<Assignment, AlreadyAssignedError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<{ id: string }>(
          'SELECT id FROM task_tags WHERE task_id = $1 AND tag_id = $2',
          [assignment.taskId, assignment.tagId],
        ),
        (cause) => new DatabaseError(cause),
      ).andThen((existing) =>
        existing
          ? err(new AlreadyAssignedError(assignment.taskId, assignment.tagId))
          : ResultAsync.fromPromise(
              sql.queryOne<Assignment>(
                `INSERT INTO task_tags (id, task_id, tag_id, created_at)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [assignment.id, assignment.taskId, assignment.tagId, assignment.createdAt],
              ),
              (cause) => new DatabaseError(cause),
            ).map((row) => row!),
      )
    },
  }
}

export type AssignmentRepository = ReturnType<typeof createAssignmentRepository>
