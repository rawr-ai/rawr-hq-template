/**
 * @fileoverview State module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repository`
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { createRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Standalone repository provider attached at module scope in `module.ts`. */
export const repository = createServiceProvider<{
  scope: {
    repoRoot: string;
  };
}>().middleware<{
  repository: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repository: createRepository(context.scope.repoRoot),
  });
});

/** Module-local observability middleware attached by `state/module.ts`. */
export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "state",
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("state.state.module.observed", {
      module: "state",
      path: pathLabel,
      repo_root: context.scope.repoRoot,
    });
    context.deps.logger.info("state.state.module", {
      layer: "module",
      module: "state",
      path: pathLabel,
      repoRoot: context.scope.repoRoot,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

/** Module-local analytics middleware attached by `state/module.ts`. */
export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "state",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
