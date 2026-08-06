import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Inngest } from "inngest";
import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerOrpcRoutes } from "../src/orpc";
import {
  assertHeavyMiddlewareDedupeMarkers,
  createRequestScopedBoundaryContext,
  hasRequestScopedMiddlewareMarker,
  RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY,
  RAWR_MIDDLEWARE_DEDUPE_MARKERS,
  type RawrInitialContext,
  resolveRequestScopedMiddlewareDecision,
} from "../src/request-context";
import { createTestingRawrHostSeam } from "../src/testing-host";
import { createTestingServerTelemetry } from "./support/process-runtime";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const TEST_INITIAL: RawrInitialContext = {
  ...createTestingServerTelemetry().effectContext,
  deps: {
    runtime: {},
    inngestClient: {} as Inngest,
    exampleTodo: createTestingRawrHostSeam().satisfiers.exampleTodo,
  },
  scope: {
    repoRoot: "/tmp/rawr-d1-dedupe",
  },
  config: {
    baseUrl: "http://localhost:3000",
  },
};

const RPC_AUTH_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;

async function createRouteInitialContext(): Promise<RawrInitialContext> {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-d1-dedupe-"));
  const runtime = { repoRoot, inngestBaseUrl: "http://localhost:8288" };
  const inngestClient = {
    send: async () => ({ ids: ["evt-d1-dedupe"] }),
  } as unknown as Inngest;

  return {
    ...createTestingServerTelemetry().effectContext,
    deps: {
      runtime,
      inngestClient,
      exampleTodo: createTestingRawrHostSeam().satisfiers.exampleTodo,
    },
    scope: { repoRoot },
    config: { baseUrl: "http://localhost:3000" },
  };
}

describe("middleware dedupe", () => {
  it("caches a heavy middleware decision per request", () => {
    const request = new Request("http://localhost/rpc/exampleTodo/tasks/create");
    let evaluationCount = 0;

    const first = resolveRequestScopedMiddlewareDecision(request, RPC_AUTH_MARKER, () => {
      evaluationCount += 1;
      return true;
    });
    const second = resolveRequestScopedMiddlewareDecision(request, RPC_AUTH_MARKER, () => {
      evaluationCount += 1;
      return false;
    });

    expect(first).toBe(true);
    expect(second).toBe(first);
    expect(evaluationCount).toBe(1);
  });

  it("shares marker cache across contexts for the same request", () => {
    const request = new Request("http://localhost/rpc/exampleTodo/tasks/get");
    const contextA = createRequestScopedBoundaryContext(request, TEST_INITIAL);
    const contextB = createRequestScopedBoundaryContext(request, TEST_INITIAL);

    resolveRequestScopedMiddlewareDecision(request, RPC_AUTH_MARKER, () => true);

    expect(contextA.invocation.middlewareState).toBe(contextB.invocation.middlewareState);
    expect(hasRequestScopedMiddlewareMarker(contextA, RPC_AUTH_MARKER)).toBe(true);
    expect(hasRequestScopedMiddlewareMarker(contextB, RPC_AUTH_MARKER)).toBe(true);
  });

  it("enforces heavy middleware marker policy for request contexts", () => {
    const request = new Request("http://localhost/rpc/exampleTodo/tasks/get");
    const context = createRequestScopedBoundaryContext(request, TEST_INITIAL);

    expect(() =>
      assertHeavyMiddlewareDedupeMarkers(
        context,
        RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers
      )
    ).toThrowError(/missing required heavy middleware dedupe marker/);

    resolveRequestScopedMiddlewareDecision(request, RPC_AUTH_MARKER, () => true);
    expect(() =>
      assertHeavyMiddlewareDedupeMarkers(
        context,
        RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers
      )
    ).not.toThrow();
  });

  it("marks RPC auth dedupe marker before handler dispatch", async () => {
    const initial = await createRouteInitialContext();
    const markerSnapshots: boolean[] = [];
    const app = registerOrpcRoutes(createServerApp(), {
      ...initial,
      onContextCreated: (context) => {
        markerSnapshots.push(hasRequestScopedMiddlewareMarker(context, RPC_AUTH_MARKER));
      },
    });

    const res = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { title: "Dedupe proof" } }),
      })
    );

    expect(res.status).toBe(200);
    expect(markerSnapshots).toEqual([true]);
  });

  it("hard-fails when context factory drifts from request-scoped marker cache", async () => {
    const initial = await createRouteInitialContext();
    const app = registerOrpcRoutes(createServerApp(), {
      ...initial,
      contextFactory: (request, stableContext) => {
        const context = createRequestScopedBoundaryContext(request, stableContext);
        return {
          ...context,
          invocation: {
            ...context.invocation,
            middlewareState: {
              markerCache: new Map(),
            },
          },
        };
      },
    });

    const res = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/get", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: { id: "dedupe-failure" } }),
      })
    );

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
