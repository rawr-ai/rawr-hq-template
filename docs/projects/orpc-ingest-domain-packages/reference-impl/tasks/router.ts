import { z } from 'zod'
import { randomUUID } from 'crypto'
import { withService, base } from '../base.js'
import { createTaskRepository } from './repository.js'
import { TaskSchema } from './schemas.js'
import type { Task } from './schemas.js'
import { unwrap } from '../unwrap.js'

// ---- Module middleware: adds task repo to context ----

const withTasks = withService.use(({ context, next }) =>
  next({
    context: {
      repo: createTaskRepository(context.deps.sql),
    },
  }),
)

// ---- Procedures ----

const create = withTasks
  .input(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
  }))
  .output(TaskSchema)
  .handler(({ input, context }) => {
    const now = context.clock.now()
    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }
    context.logger.info('tasks.create', { id: task.id })
    return unwrap(context.repo.insert(task))
  })

const get = withTasks
  .input(z.object({ id: z.string().uuid() }))
  .output(TaskSchema)
  .handler(({ input, context }) =>
    unwrap(context.repo.findById(input.id)),
  )

// ---- Module router ----

export const tasksRouter = base.router({
  create,
  get,
})
