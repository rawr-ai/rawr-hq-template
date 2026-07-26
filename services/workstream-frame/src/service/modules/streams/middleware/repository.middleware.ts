/**
 * @fileoverview Attaches revision-addressable stream stores to module execution
 * context.
 *
 * @remarks
 * The service receives an already-provisioned `SemanticLedgerPort` through
 * `deps`. It never selects or constructs a provider, which is what keeps
 * provider choice an application concern rather than a domain one.
 *
 * A store is bound to one revision, so handlers ask for the store belonging to
 * the revision they were addressed at. Omitting a revision means the committed
 * one, which keeps every caller reading and writing product truth by default.
 */
import type { SemanticLedgerPort } from "@rawr/resource-semantic-ledger";
import { createServiceProvider } from "../../../base";
import { createStreamStore, type StreamStore } from "../../../db/stores/stream-store";
import { lineRef, parseLineIdentity } from "../../../model/helpers/revision-identity";

/** Exposes a per-revision store factory and the committed revision's name. */
export const repository = createServiceProvider<{
  deps: {
    ledger: SemanticLedgerPort;
  };
  scope: {
    ledgerName: string;
  };
}>().middleware<{
  storeFor: (revision?: string) => StreamStore;
  family: string;
  committedRevision: string;
}>(async ({ context, next }) => {
  const { family, revision } = parseLineIdentity(context.scope.ledgerName);
  return next({
    family,
    committedRevision: revision,
    storeFor: (requested?: string) =>
      createStreamStore(context.deps.ledger, lineRef(family, requested ?? revision)),
  });
});
