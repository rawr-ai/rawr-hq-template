/**
 * @fileoverview `streams.open` — declare a frame's shape.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Creates the stream and its ordered boundaries. */
export const open = module.open.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.open" } });
  }

  return await withLedger(
    async () => {
      await context.store.ensureLedger();
      if (await context.store.streamExists(input.streamId)) {
        throw errors.STREAM_ALREADY_EXISTS({
          message: `Stream '${input.streamId}' already exists`,
          data: { streamId: input.streamId },
        });
      }

      await context.store.createStream(input.streamId, input.boundaries, context.clock.now());
      return await context.store.readStream(input.streamId);
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
