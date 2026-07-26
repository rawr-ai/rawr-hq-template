/**
 * @fileoverview `streams.admit` — put one item into the frame.
 *
 * @remarks
 * Admission is offered before it is explained. The stream must exist, must not
 * have been sealed, and must not already carry the id, and the substrate weighs
 * all three in the step that writes. A read happens only to name which of them
 * refused, so no answer here rests on a reading the ledger has since overtaken.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Admits one item, carrying whatever tags it already has. */
export const admit = module.admit.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.admit" } });
  }
  const store = context.storeFor(input.revision);

  return await withLedger(
    async () => {
      const proposed = await store.admitItem(
        input.streamId,
        input.itemId,
        input.title,
        input.tags ?? [],
        context.clock.now()
      );

      if (!proposed.applied) {
        // Sealed, then taken, then missing — most specific first, so a caller
        // hears the narrowest true reason its admission was not recorded.
        const stream = await store.readStream(input.streamId);
        if (stream.closedAt !== null) {
          throw errors.STREAM_CLOSED({
            message: `Stream '${input.streamId}' was closed at ${stream.closedAt}`,
            data: { streamId: input.streamId, closedAt: stream.closedAt },
          });
        }
        if (stream.items.some((candidate) => candidate.id === input.itemId)) {
          throw errors.ITEM_ALREADY_EXISTS({
            message: `Item '${input.itemId}' already exists in '${input.streamId}'`,
            data: { streamId: input.streamId, itemId: input.itemId },
          });
        }
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }

      const admitted = (await store.readStream(input.streamId)).items.find(
        (candidate) => candidate.id === input.itemId
      );
      if (!admitted) {
        // The proposal applied but is not readable back. That is a substrate
        // problem rather than a caller mistake, so it is not ITEM_NOT_FOUND.
        throw errors.LEDGER_UNAVAILABLE({
          data: { operation: "propose", reason: "BackendFailed", detail: "Item not readable" },
        });
      }
      return admitted;
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
