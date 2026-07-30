import { service } from "../../impl";

/** Curates only workspace filesystem observation for scratch-policy operations. */
export const module = service.scratchPolicy.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      fs: context.deps.resources.fs,
      path: context.deps.resources.path,
    },
  })
);
