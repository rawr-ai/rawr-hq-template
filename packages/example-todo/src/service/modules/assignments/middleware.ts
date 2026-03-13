/**
 * @fileoverview Assignments module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `setup.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repositories`
 *
 * This module is composite, so its repository provider injects assignment,
 * task, and tag repositories together. These exports are module-owned generic
 * middleware names; some consumers attach them at module scope in `setup.ts`
 * while others attach them at procedure scope in `router.ts`.
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

/** Composite repository provider attached at module scope in `setup.ts`. */
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

/** Procedure-local observability middleware attached by `assignments/router.ts`. */
export const observability = createServiceObservabilityMiddleware({
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("todo.assignments.assign.requested", {
      workspace_id: context.scope.workspaceId,
      path: pathLabel,
    });
    context.deps.logger.info("todo.assignments.assign.requested", {
      layer: "procedure",
      procedure: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/** Procedure-local analytics middleware attached by `assignments/router.ts`. */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "procedure",
    analytics_procedure: pathLabel,
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});
