import { service } from "../../impl";

export const module = service.workspace.use(async ({ context, next }) =>
  next({
    context: {
      workspaceStore: context.deps.workspaceStore,
      workspaceRef: context.scope.workspaceRef,
    },
  })
);
