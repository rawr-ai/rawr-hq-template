/**
 * @fileoverview Config module runtime composition.
 */
import { service } from "../../impl";

/** Config implementer with only its filesystem, path, and repository capabilities. */
export const module = service.config.use(async ({ context, next }) =>
  next({
    context: {
      fs: context.deps.resources.fs,
      path: context.deps.resources.path,
      repoRoot: context.scope.repoRoot,
    },
  })
);
