/**
 * @fileoverview `streams.close` — seal a stream against further work.
 *
 * @remarks
 * Settlement and closure are different claims. Settlement is an observation
 * about the last push; closure is an assertion about the future. A stream can
 * settle many times and reopen its work each time something is resolved. It
 * closes once.
 *
 * Closing refuses writes and nothing else. Every read, including every temporal
 * read, keeps working forever — which is the point of sealing rather than
 * deleting.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Records the closure fact and returns the sealed stream. */
export const close = module.close.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.close" } });
  }
  const store = context.storeFor(input.revision);

  return await withLedger(
    async () => {
      if (!(await store.streamExists(input.streamId))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }

      const stream = await store.readStream(input.streamId);
      if (stream.closedAt !== null) {
        throw errors.STREAM_CLOSED({
          message: `Stream '${input.streamId}' was already closed at ${stream.closedAt}`,
          data: { streamId: input.streamId, closedAt: stream.closedAt },
        });
      }

      await store.closeStream(input.streamId, context.clock.now(), input.note);
      return await store.readStream(input.streamId);
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
