/**
 * @fileoverview Security module runtime composition.
 */
import { service } from "../../impl";

/**
 * Security implementer with only its route-facing mechanics and repository context.
 *
 * The service lanes remain inherited for downstream middleware; security routes
 * author only against these curated names.
 */
export const module = service.security.use(async ({ context, next }) =>
  next({
    context: {
      fs: context.deps.resources.fs,
      path: context.deps.resources.path,
      process: context.deps.resources.process,
      repoRoot: context.scope.repoRoot,
    },
  })
);
