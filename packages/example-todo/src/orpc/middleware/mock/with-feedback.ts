/**
 * @fileoverview Mock feedback middleware (wireframe only).
 *
 * @remarks
 * This exists to illustrate "optional" middleware: only services that choose
 * to attach this middleware (and provide its deps) get the additional execution
 * context it produces.
 *
 * Nothing in the todo service uses this yet.
 */

import { os } from "@orpc/server";

import type { BaseContext, BaseDeps } from "../../base";

export type FeedbackClient = {
  createSession(input: { path: string; requestId?: string }): Promise<{ sessionId: string }>;
};

export type FeedbackDeps = BaseDeps & {
  feedback: FeedbackClient;
};

export type FeedbackContext = BaseContext<FeedbackDeps> & {
  requestId?: string;
  /**
   * Optional slot populated by `withFeedback`.
   *
   * @remarks
   * This mirrors a common oRPC-native pattern: the *shape* exists up-front in
   * the service context, and middleware fills it in at runtime.
   */
  feedback?: FeedbackExecutionContext["feedback"];
};

export type FeedbackExecutionContext = {
  feedback: {
    sessionId: string;
  };
};

/**
 * Optional middleware example.
 *
 * @remarks
 * This middleware is intentionally *not* generic over an arbitrary `TContext`:
 * if we allow services to narrow `context.feedback` to a stricter subtype, a
 * generic middleware cannot safely assign a concrete `{ sessionId: string }`
 * value to it. Keeping the context fixed makes the type relationship explicit
 * and avoids surprising unsoundness.
 */
export function withFeedback() {
  return os.$context<FeedbackContext>().middleware(async ({ context, path, next }) => {
    const session = await context.deps.feedback.createSession({
      path: path.join("."),
      requestId: context.requestId,
    });

    return next({
      context: {
        feedback: {
          sessionId: session.sessionId,
        },
      } satisfies FeedbackExecutionContext,
    });
  });
}
