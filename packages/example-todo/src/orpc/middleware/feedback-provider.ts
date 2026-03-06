/**
 * @fileoverview Feedback provider.
 *
 * @remarks
 * Optional provider example. Only services that attach it get the downstream
 * `feedbackSession` execution context.
 */

import type { FeedbackClient } from "../adapters/feedback";
import { createBaseMiddleware } from "../base";

/**
 * Optional feedback provider.
 *
 * @remarks
 * Export this as a ready-to-use middleware value.
 *
 * This provider intentionally fixes the output shape it adds. If services were
 * allowed to narrow `feedbackSession`, the provider could no longer safely
 * assign its concrete `{ sessionId: string }` value.
 */
export const feedbackProvider = createBaseMiddleware<{
  deps: {
    feedback: FeedbackClient;
  };
  requestId?: string;
}>().middleware(async ({ context, path, next }) => {
  const session = await context.deps.feedback.createSession({
    path: path.join("."),
    requestId: context.requestId,
  });

  return next({
    context: {
      feedbackSession: {
        sessionId: session.sessionId,
      },
    },
  });
});
