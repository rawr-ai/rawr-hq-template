/**
 * @fileoverview Canonical feedback client port.
 *
 * @remarks
 * This is a host-provided feedback capability port. Middleware may depend on it
 * via `context.deps.feedback`, but consumers should import the port type from
 * the SDK seam rather than from middleware implementation files.
 */

export interface FeedbackClient {
  createSession(input: { path: string; traceId: string }): Promise<{ sessionId: string }>;
}
