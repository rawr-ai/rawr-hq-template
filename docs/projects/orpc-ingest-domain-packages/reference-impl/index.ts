import { createRouterClient } from '@orpc/server'
import { todoRouter } from './router.js'
import type { TodoDeps } from './base.js'

export { todoRouter, type TodoRouter } from './router.js'

export function createTodoClient(deps: TodoDeps) {
  return createRouterClient(todoRouter, { context: { deps } })
}

export type TodoClient = ReturnType<typeof createTodoClient>

// Types
export type { Task } from './tasks/schemas.js'
export type { Tag } from './tags/schemas.js'
export type { Assignment } from './assignments/schemas.js'
export type { TodoDeps, DbPool, Sql, Logger, Clock } from './base.js'
