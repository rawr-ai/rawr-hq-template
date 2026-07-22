import { impl } from "../../impl";

export const module = impl.repo.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      resources: context.deps.resources,
    },
  })
);
