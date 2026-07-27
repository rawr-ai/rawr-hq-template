/**
 * @fileoverview Assignments module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 *
 * These exports are module-owned generic middleware names attached at module
 * scope in `module.ts`.
 */

import { createServiceAnalyticsMiddleware, createServiceObservabilityMiddleware } from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

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
