/**
 * @fileoverview Assignments module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repositories`
 *
 * This module is composite, so its repository provider injects assignment,
 * task, and tag repositories together. These exports are module-owned generic
 * middleware names attached at module scope in `module.ts`.
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { Sql } from "../../../orpc-sdk";
import { createRepository as createTagRepository } from "../tags/repository";
import { createRepository as createTaskRepository } from "../tasks/repository";
import { createRepository as createAssignmentRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Composite repository provider attached at module scope in `module.ts`. */
export const repositories = createServiceProvider<{
  scope: {
    workspaceId: string;
  };
  provided: {
    sql: Sql;
  };
}>().middleware<{
  repo: ReturnType<typeof createAssignmentRepository>;
  tasks: ReturnType<typeof createTaskRepository>;
  tags: ReturnType<typeof createTagRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createAssignmentRepository(context.provided.sql, context.scope.workspaceId),
    tasks: createTaskRepository(context.provided.sql, context.scope.workspaceId),
    tags: createTagRepository(context.provided.sql, context.scope.workspaceId),
  });
});

/** Module-local observability middleware attached by `assignments/module.ts`. */
export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "assignments",
    workspace_id: context.scope.workspaceId,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("todo.assignments.module.observed", {
      module: "assignments",
      workspace_id: context.scope.workspaceId,
      path: pathLabel,
    });
    context.deps.logger.info("todo.assignments.module", {
      layer: "module",
      module: "assignments",
      path: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/** Module-local analytics middleware attached by `assignments/module.ts`. */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "assignments",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});
