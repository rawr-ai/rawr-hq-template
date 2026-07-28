import { service } from "../../impl";

export const module = service.corpusArtifacts.use(async ({ context, next }) =>
  next({
    context: {
      workspaceStore: context.deps.workspaceStore,
      workspaceRef: context.scope.workspaceRef,
    },
  })
);
