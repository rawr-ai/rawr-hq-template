/**
 * @fileoverview Tag module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - attach module-local additive middleware when the whole module needs it
 * - inject tag module dependencies/context
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
  type ServiceDeps,
  type ServiceInvocation,
  type ServiceScope,
} from "../../base";
import type { Sql } from "../../../orpc-sdk";
import { createRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
const tagRepositoryProvider = createServiceProvider<{
  scope: {
    workspaceId: string;
  };
  provided: {
    sql: Sql;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.provided.sql, context.scope.workspaceId),
  });
});

const tagModuleObservability = createServiceObservabilityMiddleware<{
  deps: Pick<ServiceDeps, "logger">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>({
  attributes: ({ context }) => ({
    module: "tags",
    workspace_id: context.scope.workspaceId,
    invocation_trace_id: context.invocation.traceId,
  }),
  onStarted: ({ span, context, pathLabel }) => {
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

const tagModuleAnalytics = createServiceAnalyticsMiddleware<{
  deps: Pick<ServiceDeps, "analytics">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "module",
    analytics_module: "tags",
    analytics_path: pathLabel,
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});

export const os = impl.tags
  .use(tagModuleObservability)
  .use(tagModuleAnalytics)
  .use(tagRepositoryProvider);
