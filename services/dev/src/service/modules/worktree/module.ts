import { service } from "../../impl";

export const module = service.worktree.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      resources: context.deps.resources,
    },
  })
);
