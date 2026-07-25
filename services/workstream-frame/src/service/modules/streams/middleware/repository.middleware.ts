/**
 * @fileoverview Attaches the ledger-backed stream store to module execution
 * context.
 *
 * @remarks
 * The service receives an already-provisioned `SemanticLedgerPort` through
 * `deps`. It never selects or constructs a provider, which is what keeps
 * provider choice an application concern rather than a domain one.
 */
import type { SemanticLedgerPort } from "@rawr/resource-semantic-ledger";
import { createServiceProvider } from "../../../base";
import { createStreamStore } from "../../../db/stores/stream-store";

/** Builds the store once per call and exposes it as `provided.store`. */
export const repository = createServiceProvider<{
  deps: {
    ledger: SemanticLedgerPort;
  };
  scope: {
    ledgerName: string;
  };
}>().middleware<{
  store: ReturnType<typeof createStreamStore>;
}>(async ({ context, next }) => {
  return next({
    store: createStreamStore(context.deps.ledger, context.scope.ledgerName),
  });
});
