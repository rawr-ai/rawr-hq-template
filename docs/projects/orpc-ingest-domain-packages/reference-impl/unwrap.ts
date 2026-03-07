// ============================================================================
// Unwrap
// Handles errors from ALL modules in this service.
// When you add a module-specific error, add it to TodoServiceError and
// add a case here. The exhaustive check forces both.
// ============================================================================

import { ORPCError } from '@orpc/server'
import type { Result } from 'neverthrow'
import type { NotFoundError, DatabaseError } from './errors.js'
import type { DuplicateTagError } from './tags/errors.js'
import type { AlreadyAssignedError } from './assignments/errors.js'

// ---- Union of ALL errors across ALL modules ----

type TodoServiceError =
  | NotFoundError
  | DatabaseError
  | DuplicateTagError
  | AlreadyAssignedError

// ---- Unwrap ----

export async function unwrap<T>(
  result: PromiseLike<Result<T, TodoServiceError>>,
): Promise<T> {
  const resolved = await result
  if (resolved.isOk()) return resolved.value

  const error = resolved.error
  switch (error._tag) {
    case 'NotFoundError':
      throw new ORPCError('NOT_FOUND', {
        message: error.message,
        data: { entity: error.entity, id: error.id },
      })
    case 'DatabaseError':
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'An internal error occurred',
      })
    case 'DuplicateTagError':
      throw new ORPCError('CONFLICT', {
        message: error.message,
        data: { name: error.name },
      })
    case 'AlreadyAssignedError':
      throw new ORPCError('CONFLICT', {
        message: error.message,
        data: { taskId: error.taskId, tagId: error.tagId },
      })
    default: {
      const _exhaustive: never = error
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }
  }
}
