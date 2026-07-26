import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";

import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { createMiddleware } from "../../../base";

/** Contributes Releases capabilities from service-owned content resources. */
export const capabilities = createMiddleware().middleware(({ context, next }) => {
  const stagedContentWorkspace: Pick<
    ContentWorkspaceResource<never>,
    "observeGitStagedIndex"
  > = context.deps.contentWorkspace;
  return next({
    context: {
      source: createCleanContentWorkspaceReader({
        contentWorkspace: context.deps.contentWorkspace,
      }),
      stagedContentWorkspace,
    },
  });
});
