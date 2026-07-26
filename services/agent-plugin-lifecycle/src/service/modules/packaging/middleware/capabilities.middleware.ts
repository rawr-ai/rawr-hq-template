import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { createMiddleware } from "../../../base";

/** Contributes Packaging capabilities from service-owned dependencies. */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      source: createCleanContentWorkspaceReader({
        contentWorkspace: context.deps.contentWorkspace,
      }),
      packageOutput: context.deps.packageOutput,
    },
  })
);
