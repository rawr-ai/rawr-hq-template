/**
 * @fileoverview `streams.trace` — how one item came to be where it is.
 *
 * @remarks
 * `inspect` answers *what is true now*, and answers it at any past position.
 * This answers the different question *what happened*, which no snapshot at any
 * single position can supply.
 *
 * It is one read rather than a walk across positions because every transition
 * was written as a node carrying its own time. That is the whole reason the
 * store models clearances and resolutions as nodes instead of bare literals.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Returns every recorded transition for one item, oldest first. */
export const trace = module.trace.handler(async ({ context, input, errors }) => {
  const store = context.storeFor(input.revision);

  return await withLedger(
    async () => {
      const head = await store.head();
      const observedAt = input.at ?? head;

      if (observedAt > head || !(await store.streamExists(input.streamId, observedAt))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' is not observable at t=${observedAt}`,
          data: { streamId: input.streamId, at: observedAt },
        });
      }

      const boundaries = await store.listBoundaries(input.streamId, observedAt);
      const items = await store.listItems(input.streamId, boundaries, observedAt);
      if (!items.some((candidate) => candidate.id === input.itemId)) {
        throw errors.ITEM_NOT_FOUND({
          message: `Item '${input.itemId}' is not observable at t=${observedAt}`,
          data: { streamId: input.streamId, itemId: input.itemId },
        });
      }

      return {
        streamId: input.streamId,
        itemId: input.itemId,
        events: await store.traceItem(input.streamId, input.itemId, boundaries, observedAt),
        observedAt,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
