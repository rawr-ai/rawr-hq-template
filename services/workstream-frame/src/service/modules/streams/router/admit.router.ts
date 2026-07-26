/**
 * @fileoverview `streams.admit` — put one item into the frame.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Admits one item with its opening tags. */
export const admit = module.admit.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.admit" } });
  }

  return await withLedger(
    async () => {
      if (!(await context.store.streamExists(input.streamId))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }
      if (await context.store.itemExists(input.streamId, input.itemId)) {
        throw errors.ITEM_ALREADY_EXISTS({
          message: `Item '${input.itemId}' already exists`,
          data: { streamId: input.streamId, itemId: input.itemId },
        });
      }

      await context.store.admitItem(
        input.streamId,
        input.itemId,
        input.title,
        input.tags ?? [],
        context.clock.now()
      );

      const admitted = (await context.store.listItems(input.streamId)).find(
        (item) => item.id === input.itemId
      );
      // The write was accepted but the ledger did not serve it back. That is a
      // substrate problem, not a caller mistake, so it is not an ITEM_NOT_FOUND.
      if (!admitted) {
        throw errors.LEDGER_UNAVAILABLE({
          message: `Item '${input.itemId}' was written but could not be read back`,
          data: {
            operation: "select",
            reason: "BackendFailed",
            detail: `write to '${input.streamId}' was not observable at head`,
          },
        });
      }
      return admitted;
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
