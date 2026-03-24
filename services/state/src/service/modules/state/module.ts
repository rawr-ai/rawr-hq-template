/**
 * @fileoverview State module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - inject state-module dependencies/context
 * - export configured `module` for handler implementations
 */
import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on
 * business logic.
 */
export const module = impl
  .state
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));
