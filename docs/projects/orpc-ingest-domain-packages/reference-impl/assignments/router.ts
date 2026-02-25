// ============================================================================
// Assignments Router
// Demonstrates cross-module composition WITHIN the same service.
// Modules call each other's repositories directly — no client indirection.
// These are trusted internal calls within one domain boundary.
// ============================================================================

import { z } from 'zod'
import { randomUUID } from 'crypto'
import { withService, base } from '../base.js'
import { createAssignmentRepository } from './repository.js'
import { createTaskRepository } from '../tasks/repository.js'
import { createTagRepository } from '../tags/repository.js'
import { AssignmentSchema } from './schemas.js'
import { TaskSchema } from '../tasks/schemas.js'
import { TagSchema } from '../tags/schemas.js'
import type { Assignment } from './schemas.js'
import { unwrap } from '../unwrap.js'

const withAssignments = withService.use(({ context, next }) =>
  next({
    context: {
      repo: createAssignmentRepository(context.deps.sql),
      tasks: createTaskRepository(context.deps.sql),
      tags: createTagRepository(context.deps.sql),
    },
  }),
)

/**
 * Assign a tag to a task.
 * CROSS-MODULE: verifies task and tag exist via their repos,
 * then creates the assignment. neverthrow chains the whole thing —
 * if task doesn't exist, we get NotFoundError('Task', id).
 * If tag doesn't exist, NotFoundError('Tag', id).
 * If already assigned, AlreadyAssignedError.
 * All handled by unwrap().
 */
const assign = withAssignments
  .input(z.object({
    taskId: z.string().uuid(),
    tagId: z.string().uuid(),
  }))
  .output(AssignmentSchema)
  .handler(({ input, context }) =>
    unwrap(
      context.tasks.findById(input.taskId)
        .andThen(() => context.tags.findById(input.tagId))
        .andThen(() =>
          context.repo.insert({
            id: randomUUID(),
            taskId: input.taskId,
            tagId: input.tagId,
            createdAt: context.clock.now(),
          } satisfies Assignment),
        ),
    ),
  )

/**
 * List tags for a task, with full tag details.
 * CROSS-MODULE: fetches assignments, then batch-fetches the tasks
 * to return enriched data.
 */
const listForTask = withAssignments
  .input(z.object({ taskId: z.string().uuid() }))
  .output(z.object({
    task: TaskSchema,
    tags: TagSchema.array(),
  }))
  .handler(async ({ input, context }) => {
    const task = await unwrap(context.tasks.findById(input.taskId))
    const assignments = await unwrap(context.repo.findByTask(input.taskId))

    if (assignments.length === 0) {
      return { task, tags: [] }
    }

    // Batch fetch — could be a tags.findByIds() in a real app
    const tags = await Promise.all(
      assignments.map((a) => unwrap(context.tags.findById(a.tagId))),
    )

    return { task, tags }
  })

export const assignmentsRouter = base.router({
  assign,
  listForTask,
})
