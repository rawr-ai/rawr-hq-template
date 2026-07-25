/**
 * @fileoverview `streams.resolve` — close one feedback loop.
 */
import { withLedger } from "../../../model/helpers";
import { module } from "../module";

/** Marks a derived item resolved and grants its tag to the parent it blocked. */
export const resolve = module.resolve.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.resolve" } });
  }

  return await withLedger(
    async () => {
      if (!(await context.store.streamExists(input.streamId))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }

      const item = (await context.store.listItems(input.streamId)).find(
        (candidate) => candidate.id === input.itemId
      );
      if (!item) {
        throw errors.ITEM_NOT_FOUND({
          message: `Item '${input.itemId}' not found`,
          data: { streamId: input.streamId, itemId: input.itemId },
        });
      }
      if (item.derivedFrom === null || item.grants === null) {
        throw errors.ITEM_NOT_DERIVED({
          message: `Item '${input.itemId}' was admitted directly and has nothing to grant`,
          data: { itemId: input.itemId },
        });
      }
      // Resolving twice is a no-op rather than a failure.
      if (item.resolved) return item;

      await context.store.resolveDerived(input.streamId, item.id, item.derivedFrom, item.grants);

      const refreshed = await context.store.listItems(input.streamId);
      return refreshed.find((candidate) => candidate.id === input.itemId) ?? item;
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
