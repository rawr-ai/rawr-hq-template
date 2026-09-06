import { service } from "../../impl";

/** Curates native repository and child-process capabilities, not a workflow engine. */
export const module = service.stack.use(({ context, next }) =>
  next({
    context: {
      filesystem: context.deps.filesystem,
      childProcess: context.deps.childProcess,
    },
  })
);
