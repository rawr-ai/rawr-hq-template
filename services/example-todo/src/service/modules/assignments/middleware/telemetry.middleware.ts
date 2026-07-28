/**
 * @fileoverview Qualified Assignments module telemetry middleware.
 *
 * @remarks
 * These module-wide signals observe the inherited service lanes before the
 * module curates its smaller handler vocabulary.
 */

import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../../base";

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

/** Observes successful assignment creation at the procedure boundary. */
export const observeAssignmentCreation = createServiceObservabilityMiddleware({
  onSuccess: ({ span, context }) => {
    span?.addEvent("todo.assignments.assign.completed", {
      workspace_id: context.scope.workspaceId,
    });
  },
});
