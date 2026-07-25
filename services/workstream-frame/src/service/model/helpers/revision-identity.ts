/**
 * @fileoverview Maps revision names onto ledger line references.
 *
 * @remarks
 * The service speaks in revisions; the ledger speaks in `family:line`
 * references. This is the single place the two vocabularies meet, so no handler
 * ever builds a ledger reference by hand.
 */

/** A ledger reference split into the family it belongs to and the line it names. */
export interface LineIdentity {
  /** Name shared by every revision of one work stream. */
  readonly family: string;
  /** The revision this reference names. */
  readonly revision: string;
}

/**
 * Split a configured ledger name into its family and its committed revision.
 *
 * @remarks
 * A name without a `:` is treated as naming the family with a `main` revision,
 * so a host may configure either form.
 *
 * @param ledgerName - Ledger identity as supplied in scope.
 */
export function parseLineIdentity(ledgerName: string): LineIdentity {
  const separator = ledgerName.indexOf(":");
  if (separator <= 0 || separator === ledgerName.length - 1) {
    return { family: ledgerName, revision: "main" };
  }
  return {
    family: ledgerName.slice(0, separator),
    revision: ledgerName.slice(separator + 1),
  };
}

/**
 * Build the ledger reference for one revision of one family.
 *
 * @param family - Name shared by every revision.
 * @param revision - Revision to address.
 */
export function lineRef(family: string, revision: string): string {
  return `${family}:${revision}`;
}
