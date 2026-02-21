import { describe, expect, it } from "vitest";
import {
  assertHeavyMiddlewareDedupeMarkers,
  RAWR_MIDDLEWARE_DEDUPE_MARKERS,
  RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY,
  createRequestScopedBoundaryContext,
  hasRequestScopedMiddlewareMarker,
  resolveRequestScopedMiddlewareValue,
  type RawrBoundaryContextDeps,
} from "../src/workflows/context";
import { createServerApp } from "../src/app";
import { createCoordinationRuntimeAdapter } from "../src/coordination";
import { registerOrpcRoutes } from "../src/orpc";
import type { Inngest } from "inngest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const TEST_DEPS: RawrBoundaryContextDeps = {
  repoRoot: "/tmp/rawr-d1-dedupe",
  baseUrl: "http://localhost:3000",
  runtime: {} as RawrBoundaryContextDeps["runtime"],
  inngestClient: {} as Inngest,
};

const RPC_AUTH_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;

async function createRouteRuntimeDeps() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-d1-dedupe-"));
  const runtime = createCoordinationRuntimeAdapter({
    repoRoot,
    inngestBaseUrl: "http://localhost:8288",
  });
  const inngestClient = {
    send: async () => ({ ids: ["evt-d1-dedupe"] }),
  } as unknown as Inngest;

  return { repoRoot, runtime, inngestClient };
}

describe("middleware dedupe", () => {
  it("caches heavy middleware marker values per request", () => {
    const request = new Request("http://localhost/rpc/coordination/listWorkflows");
    let evaluationCount = 0;

    const first = resolveRequestScopedMiddlewareValue(request, RPC_AUTH_MARKER, () => {
      evaluationCount += 1;
      return { allowed: true };
    });
    const second = resolveRequestScopedMiddlewareValue(request, RPC_AUTH_MARKER, () => {
      evaluationCount += 1;
      return { allowed: false };
    });

    expect(first).toEqual({ allowed: true });
    expect(second).toBe(first);
    expect(evaluationCount).toBe(1);
  });

  it("shares marker cache across contexts for the same request", () => {
    const request = new Request("http://localhost/rpc/coordination/listWorkflows");
    const contextA = createRequestScopedBoundaryContext(request, TEST_DEPS);
    const contextB = createRequestScopedBoundaryContext(request, TEST_DEPS);

    resolveRequestScopedMiddlewareValue(request, RPC_AUTH_MARKER, () => true);

    expect(contextA.middlewareState).toBe(contextB.middlewareState);
    expect(hasRequestScopedMiddlewareMarker(contextA, RPC_AUTH_MARKER)).toBe(true);
    expect(hasRequestScopedMiddlewareMarker(contextB, RPC_AUTH_MARKER)).toBe(true);
  });

  it("enforces heavy middleware marker policy for request contexts", () => {
    const request = new Request("http://localhost/rpc/coordination/listWorkflows");
    const context = createRequestScopedBoundaryContext(request, TEST_DEPS);

    expect(() =>
      assertHeavyMiddlewareDedupeMarkers(context, RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers)
    ).toThrowError(/missing required heavy middleware dedupe marker/);

    resolveRequestScopedMiddlewareValue(request, RPC_AUTH_MARKER, () => true);
    expect(() =>
      assertHeavyMiddlewareDedupeMarkers(context, RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers)
    ).not.toThrow();
  });

  it("marks RPC auth dedupe marker before handler dispatch", async () => {
    const deps = await createRouteRuntimeDeps();
    const markerSnapshots: boolean[] = [];
    const app = registerOrpcRoutes(createServerApp(), {
      ...deps,
      baseUrl: "http://localhost:3000",
      onContextCreated: (context) => {
        markerSnapshots.push(hasRequestScopedMiddlewareMarker(context, RPC_AUTH_MARKER));
      },
    });

    const res = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(res.status).toBe(200);
    expect(markerSnapshots).toEqual([true]);
  });

  it("hard-fails when context factory drifts from request-scoped marker cache", async () => {
    const deps = await createRouteRuntimeDeps();
    const app = registerOrpcRoutes(createServerApp(), {
      ...deps,
      baseUrl: "http://localhost:3000",
      contextFactory: (request, contextDeps) => ({
        ...createRequestScopedBoundaryContext(request, contextDeps),
        middlewareState: {
          markerCache: new Map(),
        },
      }),
    });

    const res = await app.handle(
      new Request("http://localhost/rpc/coordination/listWorkflows", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
