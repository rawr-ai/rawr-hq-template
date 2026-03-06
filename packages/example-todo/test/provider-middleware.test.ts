import { describe, expect, it } from "vitest";
import { createRouterClient, implement } from "@orpc/server";
import { Type } from "typebox";

import type { BaseMetadata } from "../src/orpc/base";
import { createContractBuilder } from "../src/orpc/factory";
import { defineService, schema, type FeedbackClient } from "../src/orpc-sdk";
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

  it("defineService binds metadata into contract and middleware authoring", async () => {
    const service = defineService<BaseMetadata & { audit?: "basic" | "full" }>({
      metadata: {
        idempotent: true,
        audit: "basic",
      },
    });

    const contract = {
      ping: service.oc
        .meta({ idempotent: true })
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          ok: Type.Boolean(),
        }, { additionalProperties: false }))),
    };

    const metadataAwareMiddleware = service.createMiddleware().middleware(async ({ procedure, next }) => {
      expect(procedure["~orpc"].meta.audit).toBe("basic");
      return next();
    });

    const os = implement(contract)
      .$context<{ deps: {} }>()
      .use(metadataAwareMiddleware);

    const ping = os.ping.handler(async () => ({ ok: true }));
    const router = os.router({ ping });
    const client = createRouterClient(router, { context: { deps: {} } });

    await expect(client.ping({})).resolves.toEqual({ ok: true });
  });
});
