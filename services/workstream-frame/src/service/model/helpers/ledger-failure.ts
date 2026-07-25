/**
 * @fileoverview Translates provider failures into typed boundary errors.
 */
import { isSemanticLedgerFailure } from "@rawr/resource-semantic-ledger";

/** Redacted provider failure context surfaced on the boundary. */
export interface LedgerFailureData {
  operation?: string;
  reason?: string;
  detail?: string;
}

/**
 * Run a ledger-touching block, converting provider failures into the one typed
 * boundary error callers can act on.
 *
 * @param run - The block to execute.
 * @param fail - Throws the typed boundary error for a classified provider failure.
 */
export async function withLedger<T>(
  run: () => Promise<T>,
  fail: (data: LedgerFailureData) => never
): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    if (isSemanticLedgerFailure(cause)) {
      fail({ operation: cause.operation, reason: cause.reason, detail: cause.detail });
    }
    throw cause;
  }
}
