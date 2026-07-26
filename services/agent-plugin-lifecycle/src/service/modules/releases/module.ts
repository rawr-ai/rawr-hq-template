import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { service } from "../../impl";
import { analytics, observability } from "./middleware";
import { createStagedContentWorkspaceObservationReader } from "./model/helpers/staged-content-workspace";

export const module = service.releases
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) =>
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
