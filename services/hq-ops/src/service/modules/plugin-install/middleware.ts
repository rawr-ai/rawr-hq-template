/**
 * @fileoverview Plugin-install module middleware exports.
 *
 * @remarks
 * Keep concrete command execution outside this service. This module classifies
 * observed plugin-manager state and returns structured repair plans.
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

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    module: "plugin-install",
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStart: ({ span, context, pathLabel }) => {
    span?.addEvent("hq-ops.plugin-install.module.observed", {
      module: "plugin-install",
      path: pathLabel,
      repo_root: context.scope.repoRoot,
    });
    context.deps.logger.info("hq-ops.plugin-install.module", {
      layer: "module",
      module: "plugin-install",
      path: pathLabel,
      repoRoot: context.scope.repoRoot,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "plugin-install",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_repo_root: context.scope.repoRoot,
    analytics_trace_id: context.invocation.traceId,
  }),
});
