import { impl } from "../../impl";
import { createResourceContentWorkspaceSnapshotReader } from "../releases/repository/content-workspace";
import { analytics, observability } from "./middleware";

export const module = impl.packaging
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) =>
    next({
      context: {
        source: createResourceContentWorkspaceSnapshotReader({
          contentWorkspace: context.deps.contentWorkspace,
        }),
        packageOutput: context.deps.packageOutput,
      },
    })
  );
