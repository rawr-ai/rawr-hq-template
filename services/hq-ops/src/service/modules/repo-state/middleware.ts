/**
 * @fileoverview Repo-state module middleware exports.
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
import type { HqOpsResources } from "../../shared/ports/resources";
import { createRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

/** Standalone repository provider attached at module scope in `module.ts`. */
export const repository = createServiceProvider<{
  deps: {
    resources: HqOpsResources;
  };
  scope: {
    repoRoot: string;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.deps.resources, context.scope.repoRoot),
  });
});

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
