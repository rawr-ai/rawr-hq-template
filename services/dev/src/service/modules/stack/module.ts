import { service } from "../../impl";

export const module = service.stack.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      resources: context.deps.resources,
    },
  })
);
