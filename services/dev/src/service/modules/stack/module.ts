import { service } from "../../impl";

/** Curates Graphite execution and shared scratch admission for stack operations. */
export const module = service.stack.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      process: context.deps.resources.process,
      checkScratchPolicy: context.provided.checkScratchPolicy,
    },
  })
);
