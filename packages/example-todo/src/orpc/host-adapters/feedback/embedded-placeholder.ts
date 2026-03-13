import type { FeedbackClient } from "../../ports/feedback";

/**
 * @fileoverview Embedded placeholder feedback adapter.
 *
 * @remarks
 * This is a temporary embedded adapter used to make the host-adapter shape
 * explicit in tests and in-process composition. It is not the final feedback
 * integration for the package.
 */

export type EmbeddedPlaceholderFeedbackSessionEntry = {
  path: string;
  traceId: string;
  sessionId: string;
};

type EmbeddedPlaceholderFeedbackOptions = {
  sink?: EmbeddedPlaceholderFeedbackSessionEntry[];
  createSessionId?: (input: { path: string; traceId: string }, index: number) => string;
};

export function createEmbeddedPlaceholderFeedbackAdapter(
  options: EmbeddedPlaceholderFeedbackOptions = {},
): FeedbackClient {
  let count = 0;

  return {
    async createSession(input) {
      count += 1;
      const sessionId = options.createSessionId?.(input, count) ?? `embedded-feedback-session-${count}`;
      options.sink?.push({
        path: input.path,
        traceId: input.traceId,
        sessionId,
      });

      return { sessionId };
    },
  };
}
