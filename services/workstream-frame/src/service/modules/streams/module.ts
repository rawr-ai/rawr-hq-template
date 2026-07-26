/**
 * @fileoverview Streams module runtime composition.
 *
 * @remarks
 * Composition only: start from the package implementer, attach module
 * middleware, and narrow the context handlers actually see. Handlers receive a
 * per-revision store factory, `clock`, and `config` — not the raw dependency
 * bag, and never a ledger reference they assembled themselves.
 */
import { impl } from "../../impl";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";
import { repository } from "./middleware/repository.middleware";

/** Composed module surface every stream procedure handler builds on. */
export const module = impl.streams
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) =>
    next({
      context: {
        clock: context.deps.clock,
        config: context.config,
        committedRevision: context.provided.committedRevision,
        storeFor: context.provided.storeFor,
      },
    })
  );
