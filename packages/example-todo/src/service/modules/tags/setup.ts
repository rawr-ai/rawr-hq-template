/**
 * @fileoverview Tag module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - inject tag module dependencies/context
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = impl.tags
  .use(async ({ context, next }) => next({
    context: {
      clock: context.deps.clock,
      logger: context.deps.logger,
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
    },
  }))
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));
