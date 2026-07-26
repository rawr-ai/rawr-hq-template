/**
 * @fileoverview Attaches revision mechanics to module execution context.
 *
 * @remarks
 * This module needs the ledger port directly, because forking and promoting are
 * operations on *lines of facts* rather than on the facts themselves. It also
 * needs a store bound to the committed revision, because a revision's
 * disposition is recorded as committed truth: deciding what to do with a
 * candidate is itself a decision the work stream made.
 */
import type { SemanticLedgerPort } from "@rawr/resource-semantic-ledger";
import { createServiceProvider } from "../../../base";
import { createStreamStore, type StreamStore } from "../../../db/stores/stream-store";
import { lineRef, parseLineIdentity } from "../../../model/helpers/revision-identity";

/** Exposes the ledger port, the committed-line store, and line naming. */
export const repository = createServiceProvider<{
  deps: {
    ledger: SemanticLedgerPort;
  };
  scope: {
    ledgerName: string;
  };
}>().middleware<{
  ledger: SemanticLedgerPort;
  committedStore: StreamStore;
  family: string;
  committedRevision: string;
  refFor: (revision: string) => string;
}>(async ({ context, next }) => {
  const { family, revision } = parseLineIdentity(context.scope.ledgerName);
  return next({
    ledger: context.deps.ledger,
    committedStore: createStreamStore(context.deps.ledger, lineRef(family, revision)),
    family,
    committedRevision: revision,
    refFor: (requested: string) => lineRef(family, requested),
  });
});
