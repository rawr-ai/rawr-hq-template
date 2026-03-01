import { z } from 'zod'
import { randomUUID } from 'crypto'
import { withService, base } from '../base.js'
import { createTagRepository } from './repository.js'
import { TagSchema } from './schemas.js'
import type { Tag } from './schemas.js'
import { unwrap } from '../unwrap.js'

const withTags = withService.use(({ context, next }) =>
  next({
    context: {
      repo: createTagRepository(context.deps.sql),
    },
  }),
)

const create = withTags
  .input(z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  }))
  .output(TagSchema)
  .handler(({ input, context }) => {
    const tag: Tag = {
      id: randomUUID(),
      name: input.name.trim(),
      color: input.color.toLowerCase(),
      createdAt: context.clock.now(),
    }
    context.logger.info('tags.create', { id: tag.id, name: tag.name })
    return unwrap(context.repo.insert(tag))
  })

const list = withTags
  .output(TagSchema.array())
  .handler(({ context }) =>
    unwrap(context.repo.findAll()),
  )

export const tagsRouter = base.router({
  create,
  list,
})
