/**
 * @fileoverview Config module runtime composition.
 */
import { impl } from "../../impl";

/**
 * Config implementer with the route-facing resource and repository context.
 *
 * The service lanes remain inherited for downstream middleware; config routes
 * author only against these curated names.
 */
export const module = impl.config.use(async ({ context, next }) =>
  next({
    context: {
      resources: context.deps.resources,
      repoRoot: context.scope.repoRoot,
    },
  })
);
