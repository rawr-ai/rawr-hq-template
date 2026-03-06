import { describe, expect, it } from "vitest";
import { createRouterClient, implement } from "@orpc/server";
import { Type } from "typebox";

import { createContractBuilder, schema, type BaseMetadata, type FeedbackClient } from "../src/orpc-sdk";
import { feedbackProvider } from "../src/orpc/middleware/feedback-provider";

describe("provider middleware", () => {
  it("adds feedback execution context only when attached", async () => {
    const calls: Array<{ path: string; requestId?: string }> = [];

    const feedbackClient: FeedbackClient = {
      async createSession(input) {
        calls.push(input);
        return { sessionId: "session-123" };
      },
    };

    const ocBase = createContractBuilder<BaseMetadata>({
      baseMetadata: { idempotent: true },
    });

    const feedbackContract = {
      ping: ocBase
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          sessionId: Type.String(),
        }, { additionalProperties: false }))),
    };

    const os = implement(feedbackContract)
      .$context<{ deps: { feedback: FeedbackClient }; requestId?: string }>()
      .use(feedbackProvider);

    const ping = os.ping.handler(async ({ context }) => {
      return { sessionId: context.feedbackSession.sessionId };
    });

    const router = os.router({ ping });

    const client = createRouterClient(router, {
      context: {
        deps: { feedback: feedbackClient },
        requestId: "req-42",
      },
    });

    await expect(client.ping({})).resolves.toEqual({ sessionId: "session-123" });
    expect(calls).toEqual([{ path: "ping", requestId: "req-42" }]);
  });
});
