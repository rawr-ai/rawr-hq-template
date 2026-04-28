/**
 * @fileoverview Plugin-lifecycle module middleware exports.
 *
 * @remarks
 * This module owns deterministic lifecycle and merge policy semantics. Git,
 * GitHub, Graphite, judge, and process execution stay in projection adapters.
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "plugin-lifecycle",
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("hq-ops.plugin-lifecycle.module.observed", {
      module: "plugin-lifecycle",
      path: pathLabel,
      repo_root: context.scope.repoRoot,
    });
    context.deps.logger.info("hq-ops.plugin-lifecycle.module", {
      layer: "module",
      module: "plugin-lifecycle",
      path: pathLabel,
      repoRoot: context.scope.repoRoot,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "plugin-lifecycle",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
