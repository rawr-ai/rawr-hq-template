/**
 * @fileoverview Journal module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - inject journal-module placeholder context
 * - export configured `module` for future handler implementations
 */
import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

/**
 * Keep module-wide composition here so the reservation procedure already uses
 * the same load-bearing module assembly seam that later real procedures will
 * inherit.
 */
export const module = impl.journal
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      repo: context.provided.repo,
    },
  }));
