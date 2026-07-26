/**
 * @fileoverview `streams.open` — declare a frame's shape.
 *
 * @remarks
 * The stream node and every boundary node are offered as one proposal, so a
 * frame either comes into being whole or not at all. Two declarations of one
 * stream can therefore never overlay two shapes on the same subjects, which
 * would leave the gate order at the mercy of whichever row a provider returns
 * first.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Creates the stream and its ordered boundaries in the addressed revision. */
export const open = module.open.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.open" } });
  }
  const store = context.storeFor(input.revision);

  return await withLedger(
    async () => {
      await store.ensureLedger();
      const proposed = await store.createStream(
        input.streamId,
        input.boundaries,
        context.clock.now()
      );
      // The proposal asserts the stream absent and nothing else, so a refusal
      // has exactly one meaning.
      if (!proposed.applied) {
        throw errors.STREAM_ALREADY_EXISTS({
          message: `Stream '${input.streamId}' already exists`,
          data: { streamId: input.streamId },
        });
      }

      return await store.readStream(input.streamId);
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
