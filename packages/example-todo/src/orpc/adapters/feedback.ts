/**
 * @fileoverview Canonical feedback adapter contract.
 *
 * @remarks
 * This is a host-provided client/adapter interface. Middleware may depend on
 * it via `context.deps.feedback`, but consumers should import the adapter type
 * from the SDK seam rather than from the middleware implementation file.
 */

export interface FeedbackClient {
  createSession(input: { path: string; requestId?: string }): Promise<{ sessionId: string }>;
}
