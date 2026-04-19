/**
 * @fileoverview Feedback provider.
 *
 * @remarks
 * Optional provider example. Only services that attach it get the downstream
 * `provided.feedbackSession` execution context.
 */

import type { FeedbackClient } from "../ports/feedback";
import { createBaseProvider } from "../baseline/middleware";

/**
 * Optional feedback provider.
 *
 * @remarks
 * Export this as a ready-to-use middleware value.
 *
 * This provider intentionally fixes the output shape it adds. If services were
 * allowed to narrow `provided.feedbackSession`, the provider could no longer
 * safely assign its concrete `{ sessionId: string }` value.
 */
export const feedbackProvider = createBaseProvider<{
  deps: {
    feedback: FeedbackClient;
  };
  invocation: {
    traceId: string;
  };
}>().middleware<{
  feedbackSession: {
    sessionId: string;
  };
}>(async ({ context, path, next }) => {
  const session = await context.deps.feedback.createSession({
    path: path.join("."),
    traceId: context.invocation.traceId,
  });

  return next({
    feedbackSession: {
      sessionId: session.sessionId,
    },
  });
});
