import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { createStagedContentWorkspaceObservationReader } from "#agent-plugin-lifecycle-service/modules/releases/model/helpers/staged-content-workspace";
import { createMiddleware } from "../../../base";

/** Contributes Releases capabilities from service-owned content resources. */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      source: createCleanContentWorkspaceReader({
        contentWorkspace: context.deps.contentWorkspace,
      }),
      stagedSource: createStagedContentWorkspaceObservationReader({
        contentWorkspace: context.deps.contentWorkspace,
      }),
    },
  })
);
