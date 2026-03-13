// ============================================================================
// Service Router
// Merges all module routers into one. This is the service's public surface.
// ============================================================================

import { base } from './base.js'
import { tasksRouter } from './tasks/router.js'
import { tagsRouter } from './tags/router.js'
import { assignmentsRouter } from './assignments/router.js'

export const todoRouter = base.router({
  tasks: tasksRouter,
  tags: tagsRouter,
  assignments: assignmentsRouter,
})

export type TodoRouter = typeof todoRouter
