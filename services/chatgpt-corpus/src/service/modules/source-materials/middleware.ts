import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { WorkspaceStore } from "../../../orpc/ports/workspace-store";
import { createRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({});
export const analytics = createServiceAnalyticsMiddleware({});

export const repository = createServiceProvider<{
  deps: {
    workspaceStore: WorkspaceStore;
  };
  scope: {
    workspaceRef: string;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.deps.workspaceStore, context.scope.workspaceRef),
  });
});
