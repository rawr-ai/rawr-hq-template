/**
 * @fileoverview Security module runtime composition.
 */
import { service } from "../../impl";

/**
 * Security implementer with the route-facing resource and repository context.
 *
 * The service lanes remain inherited for downstream middleware; security routes
 * author only against these curated names.
 */
export const module = service.security.use(async ({ context, next }) =>
  next({
    context: {
      resources: context.deps.resources,
      repoRoot: context.scope.repoRoot,
    },
  })
);
