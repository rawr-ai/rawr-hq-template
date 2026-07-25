/**
 * @fileoverview `revisions.abandon` — set a candidate aside.
 *
 * @remarks
 * This deletes nothing. The substrate does offer a way to drop a line outright,
 * and that is deliberately not what this does: a candidate that was not
 * promoted is *superseded*, and superseding is something you record, not
 * something you erase. The line stays readable, and why it was set aside stays
 * answerable.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Records that a candidate was set aside, leaving its history intact. */
export const abandon = module.abandon.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "revisions.abandon" } });
  }
  if (input.revision === context.committedRevision) {
    throw errors.REVISION_NOT_CANDIDATE({
      message: `'${input.revision}' is the committed revision and cannot be abandoned`,
      data: { revision: input.revision, committed: context.committedRevision },
    });
  }

  return await withLedger(
    async () => {
      const lines = await context.ledger.lines({ family: context.family });
      const line = lines.find((candidate) => candidate.ledger === context.refFor(input.revision));
      if (!line) {
        throw errors.REVISION_NOT_FOUND({
          message: `Revision '${input.revision}' not found`,
          data: { revision: input.revision, committed: context.committedRevision },
        });
      }

      await context.committedStore.recordRevisionStatus(
        input.revision,
        "abandoned",
        context.clock.now(),
        input.note
      );

      return {
        revision: input.revision,
        status: "abandoned" as const,
        t: line.t,
        committed: false,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
