/**
 * @fileoverview Repo-state module middleware exports.
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Module-local observability middleware attached by `repo-state/module.ts`. */
export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "repo-state",
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("hq-ops.repo-state.module.observed", {
      module: "repo-state",
      path: pathLabel,
      repo_root: context.scope.repoRoot,
    });
    context.deps.logger.info("hq-ops.repo-state.module", {
      layer: "module",
      module: "repo-state",
      path: pathLabel,
      repoRoot: context.scope.repoRoot,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/** Module-local analytics middleware attached by `repo-state/module.ts`. */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "repo-state",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
