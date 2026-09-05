import { service } from "../../impl";

/** Curates only native identity, scratch and Git capabilities for cleanup. */
export const module = service.worktree.use(({ context, next }) =>
  next({
    context: {
      filesystem: context.deps.filesystem,
      childProcess: context.deps.childProcess,
    },
  })
);
