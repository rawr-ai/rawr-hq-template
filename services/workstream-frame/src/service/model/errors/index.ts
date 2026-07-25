/**
 * @fileoverview Curated index for the errors model kind.
 *
 * @remarks
 * Boundary errors are declared once here and imported by module contracts.
 * There is deliberately no "item blocked" error: a boundary refusing an item is
 * the frame working correctly, so it is a result rather than a failure.
 */
export {
  ITEM_ALREADY_EXISTS,
  ITEM_NOT_DERIVED,
  ITEM_NOT_FOUND,
  LEDGER_UNAVAILABLE,
  READ_ONLY_MODE,
  STREAM_ALREADY_EXISTS,
  STREAM_NOT_FOUND,
} from "./boundary-errors";
