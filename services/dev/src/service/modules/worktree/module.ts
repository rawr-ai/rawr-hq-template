import { service } from "../../impl";

/** Curates worktree execution, path comparison, and shared scratch admission. */
export const module = service.worktree.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      process: context.deps.resources.process,
      path: context.deps.resources.path,
      checkScratchPolicy: context.provided.checkScratchPolicy,
    },
  })
);
