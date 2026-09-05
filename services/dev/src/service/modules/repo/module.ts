import { service } from "../../impl";

/** Curates the ready capabilities consumed by repository admission and Git. */
export const module = service.repo.use(({ context, next }) =>
  next({
    context: {
      filesystem: context.deps.filesystem,
      childProcess: context.deps.childProcess,
    },
  })
);
