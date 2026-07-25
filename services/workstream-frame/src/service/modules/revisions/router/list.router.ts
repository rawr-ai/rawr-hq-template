/**
 * @fileoverview `revisions.list` — every revision and where it sits.
 */
import type { RevisionView } from "../../../model/dto/revision";
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Lists every line of work-stream truth with its recorded disposition. */
export const list = module.list.handler(async ({ context, errors }) => {
  return await withLedger(
    async () => {
      const lines = await context.ledger.lines({ family: context.family });
      const dispositions = await context.committedStore.readRevisionStatuses();
      const prefix = `${context.family}:`;

      const revisions: RevisionView[] = lines.map((line) => {
        const name = line.ledger.startsWith(prefix)
          ? line.ledger.slice(prefix.length)
          : line.ledger;
        const committed = name === context.committedRevision;
        return {
          revision: name,
          // A line with no recorded disposition is still open. Committed is
          // decided by identity, not by a fact, so it can never be contradicted.
          status: committed ? ("committed" as const) : (dispositions.get(name) ?? "candidate"),
          t: line.t,
          committed,
        };
      });

      return {
        committed: context.committedRevision,
        revisions: revisions.sort((left, right) => left.revision.localeCompare(right.revision)),
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
