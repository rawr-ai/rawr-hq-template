/**
 * @fileoverview `revisions.preview` — what promoting would do, without doing it.
 *
 * @remarks
 * This is the promotion gate. The work-stream model says blockers are revised
 * under law rather than patched; the same applies to promotion. You look at
 * what folding a candidate in would cost before you fold it, and the answer is
 * computed from the two lines rather than asserted by whoever asks.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Reports ahead/behind, conflicts, and mergeability without changing anything. */
export const preview = module.preview.handler(async ({ context, input, errors }) => {
  if (input.revision === context.committedRevision) {
    throw errors.REVISION_NOT_CANDIDATE({
      message: `'${input.revision}' is the committed revision`,
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

      const preview = await context.ledger.previewMerge({
        from: context.refFor(input.revision),
        into: context.refFor(context.committedRevision),
      });

      return {
        revision: input.revision,
        into: context.committedRevision,
        ahead: preview.ahead,
        behind: preview.behind,
        conflicts: preview.conflicts,
        fastForward: preview.fastForward,
        mergeable: preview.mergeable,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
