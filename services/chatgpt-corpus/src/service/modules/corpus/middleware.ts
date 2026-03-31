import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { createRepository } from "./repository";
import { getWorkspacePaths, normalizeWorkspaceRoot } from "./workspace";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({});
export const analytics = createServiceAnalyticsMiddleware({});

export const repository = createServiceProvider()
  .middleware<{
    workspaceRoot: string;
    paths: ReturnType<typeof getWorkspacePaths>;
    repo: ReturnType<typeof createRepository>;
  }>(async ({ next }, input) => {
    const typedInput = input as { workspaceRoot: string };
    const workspaceRoot = normalizeWorkspaceRoot(typedInput.workspaceRoot);
    const paths = getWorkspacePaths(workspaceRoot);

    return next({
      workspaceRoot,
      paths,
      repo: createRepository(paths),
    });
  });
