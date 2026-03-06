/**
 * @fileoverview Feedback provider.
 *
 * @remarks
 * This exists to illustrate optional provider composition: only services that
 * choose to attach it (and provide its deps) get the additional execution
 * context it produces.
 */

import type { FeedbackClient } from "../adapters/feedback";
import { createBaseMiddleware } from "../factory";

/**
 * Optional feedback provider.
 *
 * @remarks
 * Export this as a ready-to-use middleware value.
 *
 * This middleware is intentionally *not* generic over an arbitrary `TContext`:
 * if we allow services to narrow `context.feedbackSession` to a stricter subtype, a
 * generic middleware cannot safely assign a concrete `{ sessionId: string }`
 * value to it. Keeping the context fixed makes the type relationship explicit
 * and avoids surprising unsoundness.
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
    } satisfies {
      feedbackSession: {
        sessionId: string;
      };
    },
  });
});
