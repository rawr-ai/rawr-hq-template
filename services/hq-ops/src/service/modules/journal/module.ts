/**
 * @fileoverview Journal module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

/**
 * Journal implementer with the route-facing resource and repository context.
 *
 * The service lanes remain inherited for downstream middleware; journal routes
 * author only against these curated names.
 */
export const module = impl.journal
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) =>
    next({
      context: {
        resources: context.deps.resources,
        repoRoot: context.scope.repoRoot,
      },
    })
  );
