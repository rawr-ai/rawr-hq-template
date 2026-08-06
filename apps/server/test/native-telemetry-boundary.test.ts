import { ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { type DrainContext, initLogger } from "evlog";
import { beforeAll, describe, expect, it } from "vitest";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";
import { createTestingRawrHostSeam } from "../src/testing-host";
import {
  createTestingServerProcessRuntime,
  createTestingServerTelemetry,
} from "./support/process-runtime";

const FIRST_PARTY_HEADERS = {
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

beforeAll(() => {
  initLogger({
    enabled: true,
    silent: true,
    redact: true,
    _suppressDrainWarning: true,
  });
});

function operation(event: DrainContext["event"]): {
  id: string;
  name: string;
  outcome: "succeeded" | "failed" | "cancelled";
} {
  const value = event.operation;
  if (typeof value !== "object" || value === null) {
    throw new Error("missing product operation enrichment");
  }
  return value as ReturnType<typeof operation>;
}

function createObservedApp(events: DrainContext[]) {
  const processRuntime = createTestingServerProcessRuntime();
  return registerRawrRoutes(createServerApp(), {
    ...processRuntime,
    telemetry: {
      ...processRuntime.telemetry,
      telemetry: {
        ...processRuntime.telemetry.telemetry,
        availability: "available",
      },
      evlogDrain: async (context) => {
        events.push(context);
      },
    },
    repoRoot: "/tmp/rawr-native-telemetry-test",
    baseUrl: "http://localhost:3000",
    hostComposition: createTestingRawrHostSeam(),
  });
}

describe("native oRPC product events", () => {
  it("emits one event per matched, unmatched, and buffered batch operation", async () => {
    const events: DrainContext[] = [];
    const physicalRequests: Request[] = [];
    const app = createObservedApp(events);
    const fetch = (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      physicalRequests.push(request.clone());
      return app.handle(request);
    };

    const matchedLink = new RPCLink({
      origin: "http://localhost",
      url: "/rpc",
      headers: { ...FIRST_PARTY_HEADERS, "x-request-id": "request-matched" },
      fetch,
    });
    await matchedLink.call(
      ["exampleTodo", "tasks", "create"],
      { title: "Observe one native operation" },
      { context: {} }
    );

    expect(events).toHaveLength(1);
    expect(operation(events[0]?.event ?? {})).toMatchObject({
      name: "exampletodo.tasks.create",
      outcome: "succeeded",
    });

    const unmatchedLink = new RPCLink({
      origin: "http://localhost",
      url: "/rpc",
      headers: { ...FIRST_PARTY_HEADERS, "x-request-id": "request-unmatched" },
      fetch,
    });
    await expect(unmatchedLink.call(["missing"], {}, { context: {} })).rejects.toBeInstanceOf(
      ORPCError
    );

    expect(events).toHaveLength(2);
    expect(operation(events[1]?.event ?? {})).toMatchObject({
      name: "unmatched",
      outcome: "failed",
    });

    const batchLink = new RPCLink({
      origin: "http://localhost",
      url: "/rpc",
      headers: { ...FIRST_PARTY_HEADERS, "x-request-id": "request-batch" },
      fetch,
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: true, context: {}, path: [] }],
          mode: "buffered",
        }),
      ],
    });
    const batchResults = await Promise.allSettled([
      batchLink.call(
        ["exampleTodo", "tasks", "create"],
        { title: "Observe the matched batch item" },
        { context: {} }
      ),
      batchLink.call(["missing"], {}, { context: {} }),
    ]);

    expect(batchResults.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
    expect(physicalRequests).toHaveLength(3);
    expect(physicalRequests[2]?.headers.get("orpc-batch")).toBe("buffered");
    expect(events).toHaveLength(4);

    const batchEvents = events.slice(2);
    expect(batchEvents.map(({ request }) => request?.requestId)).toEqual([
      "request-batch",
      "request-batch",
    ]);
    expect(batchEvents.map(({ event }) => operation(event).outcome).sort()).toEqual([
      "failed",
      "succeeded",
    ]);
    expect(new Set(events.map(({ event }) => operation(event).id)).size).toBe(4);
  });

  it("does not construct or drain product events when telemetry is disabled", async () => {
    let drainCalls = 0;
    const telemetry = createTestingServerTelemetry();
    const processRuntime = createTestingServerProcessRuntime();
    const app = registerRawrRoutes(createServerApp(), {
      ...processRuntime,
      telemetry: {
        ...telemetry,
        evlogDrain: async () => {
          drainCalls += 1;
        },
      },
      repoRoot: "/tmp/rawr-disabled-telemetry-test",
      baseUrl: "http://localhost:3000",
      hostComposition: createTestingRawrHostSeam(),
    });
    const physicalRequests: Request[] = [];
    const fetch = (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      physicalRequests.push(request.clone());
      return app.handle(request);
    };
    const link = new RPCLink({
      origin: "http://localhost",
      url: "/rpc",
      headers: FIRST_PARTY_HEADERS,
      fetch,
    });

    await link.call(
      ["exampleTodo", "tasks", "create"],
      { title: "Keep disabled telemetry inert" },
      { context: {} }
    );

    const batchLink = new RPCLink({
      origin: "http://localhost",
      url: "/rpc",
      headers: FIRST_PARTY_HEADERS,
      fetch,
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: true, context: {}, path: [] }],
          mode: "buffered",
        }),
      ],
    });
    const batchResults = await Promise.allSettled([
      batchLink.call(
        ["exampleTodo", "tasks", "create"],
        { title: "Keep disabled batch support independent" },
        { context: {} }
      ),
      batchLink.call(["missing"], {}, { context: {} }),
    ]);

    expect(batchResults.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
    expect(physicalRequests).toHaveLength(2);
    expect(physicalRequests[1]?.headers.get("orpc-batch")).toBe("buffered");
    expect(drainCalls).toBe(0);
  });
});
