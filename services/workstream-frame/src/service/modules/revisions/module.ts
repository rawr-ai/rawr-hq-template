/**
 * @fileoverview Revisions module runtime composition.
 *
 * @remarks
 * Composition only: start from the package implementer, attach module
 * middleware, and narrow the context handlers actually see.
 */
import { impl } from "../../impl";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";
import { repository } from "./middleware/repository.middleware";

/** Composed module surface every revision procedure handler builds on. */
export const module = impl.revisions
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) =>
    next({
      context: {
        clock: context.deps.clock,
        config: context.config,
        ledger: context.provided.ledger,
        committedStore: context.provided.committedStore,
        family: context.provided.family,
        committedRevision: context.provided.committedRevision,
        refFor: context.provided.refFor,
      },
    })
  );
