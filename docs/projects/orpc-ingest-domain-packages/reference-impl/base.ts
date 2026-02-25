// ============================================================================
// Shared oRPC base for all modules in this service.
// Defines the root context and shared middleware.
// Every module's router builds on top of this.
// ============================================================================

import { os } from '@orpc/server'
import type { TodoDeps, Logger, Clock } from './deps.js'

// ---- Context types ----

export interface BaseContext {
  deps: TodoDeps
}

export interface ServiceContext {
  logger: Logger
  clock: Clock
}

// ---- Base + middleware ----

export const base = os.context<BaseContext>()

export const withService = base.use(({ context, next }) => {
  const { deps } = context
  return next({
    context: {
      logger: deps.logger,
      clock: deps.clock,
    },
  })
})
