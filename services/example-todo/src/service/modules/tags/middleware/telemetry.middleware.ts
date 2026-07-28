/**
 * @fileoverview Qualified Tag module telemetry middleware.
 *
 * @remarks
 * These module-wide signals observe the inherited service lanes before the
 * module curates its smaller handler vocabulary.
 */

import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../../base";

/** Observes every Tags operation before the module narrows handler context. */
export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "tags",
    workspace_id: context.scope.workspaceId,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("todo.tags.module.observed", {
      module: "tags",
      path: pathLabel,
      workspace_id: context.scope.workspaceId,
    });
    context.deps.logger.info("todo.tags.module", {
      layer: "module",
      module: "tags",
      path: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/** Adds module identity to the canonical service analytics event. */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "tags",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});

/** Observes the normalization phase that is unique to tag creation. */
export const observeTagCreation = createServiceObservabilityMiddleware({
  onStart: ({ span, context }) => {
    span?.addEvent("todo.tags.create.normalization.started", {
      workspace_id: context.scope.workspaceId,
    });
  },
  onSuccess: ({ span, context }) => {
    span?.addEvent("todo.tags.create.normalization.succeeded", {
      workspace_id: context.scope.workspaceId,
    });
  },
});

/** Adds tag-creation identity to the canonical service analytics event. */
export const analyzeTagCreation = createServiceAnalyticsMiddleware({
  payload: ({ context, outcome }) => ({
    analytics_layer: "procedure",
    analytics_procedure: "tags.create",
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});
