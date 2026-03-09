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
import { trace } from "@opentelemetry/api";
import { impl } from "../../impl";
import {
  createServiceMiddleware,
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

const tagModuleObservability = createServiceMiddleware<{
  deps: Pick<ServiceDeps, "logger">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>().middleware(async ({ context, path, next }) => {
  const pathLabel = path.join(".");
  trace.getActiveSpan()?.addEvent("todo.tags.module.observed", {
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

  return next();
});

const tagModuleAnalytics = createServiceMiddleware<{
  deps: Pick<ServiceDeps, "analytics">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>().middleware(async ({ context, path, next }) => {
  const pathLabel = path.join(".");
  let outcome: "success" | "error" = "success";

  try {
    return await next();
  }
  catch (error) {
    outcome = "error";
    throw error;
  }
  finally {
    await context.deps.analytics.track("todo.mock.module.analytics", {
      layer: "module",
      module: "tags",
      path: pathLabel,
      outcome,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  }
});

export const os = impl.tags
  .use(tagModuleObservability)
  .use(tagModuleAnalytics)
  .use(tagRepositoryProvider);
