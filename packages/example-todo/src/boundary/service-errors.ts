/**
 * @fileoverview Shared internal-only error helpers.
 *
 * @remarks
 * These errors are for unexpected internal states inside the package boundary.
 * They are not ORPC boundary contract errors and should not be surfaced as
 * typed caller-actionable errors by default.
 *
 * @agents
 * Keep expected business states as values (null/exists/result objects).
 * Use this file only for truly unexpected internal failure context.
 */
export class UnexpectedInternalError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}
