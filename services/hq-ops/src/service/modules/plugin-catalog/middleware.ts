import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/**
 * Observability middleware for HQ plugin catalog procedures.
 */
export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "plugin-catalog",
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("hq-ops.plugin-catalog.module.observed", {
      module: "plugin-catalog",
      path: pathLabel,
      repo_root: context.scope.repoRoot,
    });
    context.deps.logger.info("hq-ops.plugin-catalog.module", {
      layer: "module",
      module: "plugin-catalog",
      path: pathLabel,
      repoRoot: context.scope.repoRoot,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/**
 * Analytics middleware for catalog calls that identify which plugin-management
 * procedure was used without leaking catalog internals to projections.
 */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "plugin-catalog",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
