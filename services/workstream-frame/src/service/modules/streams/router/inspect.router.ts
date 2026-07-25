/**
 * @fileoverview `streams.inspect` — read durable truth, optionally in the past.
 */
import { withLedger } from "../../../model/helpers";
import { module } from "../module";

/**
 * Reconstructs the stream at `at`, or at head when omitted.
 *
 * @remarks
 * This is the experiment's temporal claim: the same call at two positions
 * returns two different worlds, because nothing is ever mutated in place.
 */
export const inspect = module.inspect.handler(async ({ context, input, errors }) => {
  return await withLedger(
    async () => {
      const head = await context.store.head();
      const observedAt = input.at ?? head;

      // A stream is observable neither before it was created nor beyond head.
      // Both are the same statement: at that position, it is not there.
      if (observedAt > head || !(await context.store.streamExists(input.streamId, observedAt))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' is not observable at t=${observedAt}`,
          data: { streamId: input.streamId, at: observedAt },
        });
      }

      return {
        stream: await context.store.readStream(input.streamId, observedAt),
        head,
        observedAt,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
