/**
 * @fileoverview Journal module runtime composition.
 */
import { service } from "../../impl";

/**
 * Journal implementer narrowed to the service-projected store and embedding
 * capability used by its handlers.
 *
 * The module neither acquires persistence nor recovers aggregate host resources.
 */
export const module = service.journal.use(async ({ context, next }) =>
  next({
    context: {
      journalStore: context.provided.journalStore,
      embeddings: context.deps.resources.embeddings,
    },
  })
);
