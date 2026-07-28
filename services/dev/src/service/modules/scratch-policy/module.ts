import { service } from "../../impl";

export const module = service.scratchPolicy.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      resources: context.deps.resources,
    },
  })
);
