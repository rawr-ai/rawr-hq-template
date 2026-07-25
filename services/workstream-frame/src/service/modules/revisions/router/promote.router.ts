/**
 * @fileoverview `revisions.promote` — fold a candidate into committed truth.
 *
 * @remarks
 * Promotion is the only way candidate work becomes product truth, and it is
 * atomic: either the committed line advances or it does not. Conflicts are
 * reported rather than resolved here — deciding what a collision *means* is a
 * work-stream judgement, not a merge algorithm's.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Merges the candidate into the committed revision and records the decision. */
export const promote = module.promote.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "revisions.promote" } });
  }
  if (input.revision === context.committedRevision) {
    throw errors.REVISION_NOT_CANDIDATE({
      message: `'${input.revision}' is the committed revision and cannot be folded into itself`,
      data: { revision: input.revision, committed: context.committedRevision },
    });
  }

  return await withLedger(
    async () => {
      const lines = await context.ledger.lines({ family: context.family });
      if (!lines.some((line) => line.ledger === context.refFor(input.revision))) {
        throw errors.REVISION_NOT_FOUND({
          message: `Revision '${input.revision}' not found`,
          data: { revision: input.revision, committed: context.committedRevision },
        });
      }

      const receipt = await context.ledger.merge({
        from: context.refFor(input.revision),
        into: context.refFor(context.committedRevision),
      });

      // The disposition is committed truth: what the work stream decided about
      // a candidate belongs on the committed line, not on the candidate.
      await context.committedStore.recordRevisionStatus(
        input.revision,
        "promoted",
        context.clock.now(),
        input.note
      );

      return {
        revision: input.revision,
        into: context.committedRevision,
        t: receipt.t,
        copied: receipt.copied,
        conflicts: receipt.conflicts,
        fastForward: receipt.fastForward,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
