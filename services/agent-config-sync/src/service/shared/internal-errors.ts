/**
 * @fileoverview Shared internal-only error helpers.
 */
export class UnexpectedInternalError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}
