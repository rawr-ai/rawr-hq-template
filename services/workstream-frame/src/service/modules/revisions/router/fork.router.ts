/**
 * @fileoverview `revisions.fork` — start a candidate revision.
 */
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Forks a new line of work-stream truth from an existing one. */
export const fork = module.fork.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "revisions.fork" } });
  }
  const from = input.from ?? context.committedRevision;

  return await withLedger(
    async () => {
      const lines = await context.ledger.lines({ family: context.family });
      const names = new Set(lines.map((line) => line.ledger));

      if (!names.has(context.refFor(from))) {
        throw errors.REVISION_NOT_FOUND({
          message: `Revision '${from}' not found`,
          data: { revision: from, committed: context.committedRevision },
        });
      }
      if (names.has(context.refFor(input.revision))) {
        throw errors.REVISION_ALREADY_EXISTS({
          message: `Revision '${input.revision}' already exists`,
          data: { revision: input.revision },
        });
      }

      const head = await context.ledger.fork({
        from: context.refFor(from),
        to: context.refFor(input.revision),
      });

      return {
        revision: input.revision,
        status: "candidate" as const,
        t: head.t,
        committed: false,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
