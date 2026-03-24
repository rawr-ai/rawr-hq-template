import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as otelApi from "@opentelemetry/api";
import { createTestingRawrHqManifest } from "@rawr/hq-app/testing";
import { createServerApp } from "../src/app";
import { createCoordinationRuntimeAdapter } from "../src/coordination";
import { __resetOrpcRouteTelemetryForTests, registerOrpcRoutes } from "../src/orpc";

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const counterAdd = vi.fn();
const histogramRecord = vi.fn();
const spanSetAttribute = vi.fn();
const spanSetStatus = vi.fn();
const spanRecordException = vi.fn();
const spanEnd = vi.fn();
const spanContext = vi.fn();
const startActiveSpan = vi.fn();
const rawrHqManifest = createTestingRawrHqManifest();

async function createTestApp(args: {
  contextFactory?: (request: Request, deps: unknown) => unknown;
}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-orpc-metrics-"));
  const runtime = createCoordinationRuntimeAdapter({
    repoRoot: tempRoot,
    inngestBaseUrl: "http://localhost:8288",
  });

  const app = registerOrpcRoutes(createServerApp(), {
    repoRoot: tempRoot,
    baseUrl: "http://localhost:3100",
    runtime,
    inngestClient: { send: vi.fn() } as never,
    router: rawrHqManifest.orpc.router as never,
    ...(args.contextFactory ? { contextFactory: args.contextFactory as never } : {}),
  });

  return { app, tempRoot };
}

beforeEach(() => {
  counterAdd.mockReset();
  histogramRecord.mockReset();
  spanSetAttribute.mockReset();
  spanSetStatus.mockReset();
  spanRecordException.mockReset();
  spanEnd.mockReset();
  spanContext.mockReset();
  startActiveSpan.mockReset();
  __resetOrpcRouteTelemetryForTests();

  vi.spyOn(otelApi.metrics, "getMeter").mockReturnValue({
    createCounter: () => ({ add: counterAdd }),
    createHistogram: () => ({ record: histogramRecord }),
  } as never);

  startActiveSpan.mockImplementation(async (_name: string, fn: (span: {
    setAttribute(key: string, value: string | boolean | number): void;
    setStatus(status: unknown): void;
    recordException(error: unknown): void;
    end(): void;
    spanContext(): { traceId: string; spanId: string; traceFlags: number };
  }) => Promise<Response>) => fn({
    setAttribute: spanSetAttribute,
    setStatus: spanSetStatus,
    recordException: spanRecordException,
    end: spanEnd,
    spanContext,
  }));

  spanContext.mockReturnValue({
    traceId: "11111111111111111111111111111111",
    spanId: "2222222222222222",
    traceFlags: 1,
  });

  vi.spyOn(otelApi.trace, "getTracer").mockReturnValue({
    startActiveSpan,
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetOrpcRouteTelemetryForTests();
});

describe("host oRPC route metrics", () => {
  it("records rpc success metrics with low-cardinality attributes and route span", async () => {
    const { app, tempRoot } = await createTestApp({});

    try {
      const response = await app.handle(
        new Request("http://localhost:3100/rpc/state/getRuntimeState", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: {} }),
        }),
      );

      expect(response.status).toBe(200);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.orpc.surface": "rpc",
        "rawr.orpc.router": "rpc",
        "rawr.orpc.authorized": true,
        "http.response.status_code": 200,
      }));
      expect(histogramRecord).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        "rawr.orpc.surface": "rpc",
        "rawr.orpc.router": "rpc",
        "rawr.orpc.authorized": true,
        "http.response.status_code": 200,
      }));
      expect(startActiveSpan).toHaveBeenCalledWith("rawr.orpc.rpc.request", expect.any(Function));
      expect(spanSetAttribute).toHaveBeenCalledWith("rawr.orpc.surface", "rpc");
      expect(spanSetAttribute).toHaveBeenCalledWith("http.response.status_code", 200);

      const attributes = counterAdd.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(attributes).not.toHaveProperty("url.full");
      expect(attributes).not.toHaveProperty("rawr.orpc.path");
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("records rpc forbidden metrics before handler dispatch", async () => {
    const { app, tempRoot } = await createTestApp({});

    try {
      const response = await app.handle(
        new Request("http://localhost:3100/rpc/state/getRuntimeState", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ json: {} }),
        }),
      );

      expect(response.status).toBe(403);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.orpc.surface": "rpc",
        "rawr.orpc.router": "rpc",
        "rawr.orpc.authorized": false,
        "http.response.status_code": 403,
      }));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("records rpc not-found metrics on unmatched procedures", async () => {
    const { app, tempRoot } = await createTestApp({});

    try {
      const response = await app.handle(
        new Request("http://localhost:3100/rpc/state/doesNotExist", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: {} }),
        }),
      );

      expect(response.status).toBe(404);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.orpc.surface": "rpc",
        "rawr.orpc.router": "rpc",
        "rawr.orpc.authorized": true,
        "http.response.status_code": 404,
      }));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("records rpc error metrics when context creation fails", async () => {
    const { app, tempRoot } = await createTestApp({
      contextFactory: () => {
        throw new Error("context boom");
      },
    });

    try {
      const response = await app.handle(
        new Request("http://localhost:3100/rpc/state/getRuntimeState", {
          method: "POST",
          headers: FIRST_PARTY_RPC_HEADERS,
          body: JSON.stringify({ json: {} }),
        }),
      );

      expect(response.status).toBe(500);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.orpc.surface": "rpc",
        "rawr.orpc.router": "rpc",
        "rawr.orpc.authorized": true,
        "http.response.status_code": 500,
      }));
      expect(spanSetStatus).toHaveBeenCalled();
      expect(spanRecordException).toHaveBeenCalled();
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("records openapi metrics separately from rpc metrics and creates an openapi route span", async () => {
    const { app, tempRoot } = await createTestApp({});

    try {
      const response = await app.handle(
        new Request("http://localhost:3100/api/orpc/exampleTodo/tasks/create", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-rawr-caller-surface": "external",
          },
          body: JSON.stringify({
            title: "Metrics proof route",
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.orpc.surface": "openapi",
        "rawr.orpc.router": "openapi",
        "http.response.status_code": 200,
      }));
      expect(startActiveSpan).toHaveBeenCalledWith("rawr.orpc.openapi.request", expect.any(Function));
      expect(spanSetAttribute).toHaveBeenCalledWith("rawr.orpc.surface", "openapi");

      const attributes = counterAdd.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(attributes).not.toHaveProperty("rawr.orpc.authorized");
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
