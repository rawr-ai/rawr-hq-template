/**
 * @fileoverview Tag module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - curate the tag route context from inherited service capabilities
 * - export configured `module` for handler implementations
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = impl.tags
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) =>
    next({
      context: {
        clock: context.deps.clock,
        identifierGenerator: context.deps.identifierGenerator,
        logger: context.deps.logger,
        workspaceId: context.scope.workspaceId,
        traceId: context.invocation.traceId,
        tagsStore: context.provided.tagsStore,
      },
    })
  );
