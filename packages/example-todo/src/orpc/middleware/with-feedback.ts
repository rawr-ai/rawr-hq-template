/**
 * @fileoverview Feedback middleware (optional feature).
 *
 * @remarks
 * This exists to illustrate "optional" middleware: only services that choose
 * to attach this middleware (and provide its deps) get the additional execution
 * context it produces.
 */

import { os } from "@orpc/server";

export type FeedbackClient = {
  createSession(input: { path: string; requestId?: string }): Promise<{ sessionId: string }>;
};

export type FeedbackDeps = {
  feedback: FeedbackClient;
};

/**
 * Helper type: opt a service context into the feedback deps requirement.
 *
 * @remarks
 * This keeps service code lightweight: import one middleware + one helper type.
 *
 * `withFeedback` itself is context-augmenting (it adds `context.feedback`), so
 * services do *not* need to pre-declare a `feedback?` slot on their context.
 */
export type WithFeedbackContext<TContext extends { deps: object }> = TContext & {
  deps: TContext["deps"] & FeedbackDeps;
};

export type FeedbackRequiredContext = {
  deps: FeedbackDeps;
  requestId?: string;
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
  return os.$context<FeedbackRequiredContext>().middleware(async ({ context, path, next }) => {
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
