import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as otelApi from "@opentelemetry/api";
import { createServerApp } from "../src/app";
import { __resetWorkflowRouteTelemetryForTests } from "../src/workflows/harness";
import { registerRawrRoutes } from "../src/rawr";

const counterAdd = vi.fn();
const histogramRecord = vi.fn();
const spanSetAttribute = vi.fn();
const spanSetStatus = vi.fn();
const spanRecordException = vi.fn();
const spanEnd = vi.fn();
const spanContext = vi.fn();
const startActiveSpan = vi.fn();

async function createTestApp() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-workflow-metrics-"));
  const app = registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });

  return { app, repoRoot };
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
  __resetWorkflowRouteTelemetryForTests();

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
    traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    spanId: "bbbbbbbbbbbbbbbb",
    traceFlags: 1,
  });

  vi.spyOn(otelApi.trace, "getTracer").mockReturnValue({
    startActiveSpan,
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetWorkflowRouteTelemetryForTests();
});

describe("workflow route telemetry", () => {
  it("records published workflow success metrics and a route span", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/workflows/support-example/triage/status", {
          headers: {
            "x-request-id": "workflow-openapi-request-1",
            "x-correlation-id": "workflow-openapi-correlation-1",
          },
        }),
      );

      expect(response.status).toBe(200);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.workflow.surface": "published",
        "rawr.workflow.router": "published",
        "http.response.status_code": 200,
      }));
      expect(histogramRecord).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        "rawr.workflow.surface": "published",
        "rawr.workflow.router": "published",
        "http.response.status_code": 200,
      }));
      expect(startActiveSpan).toHaveBeenCalledWith("rawr.workflow.request", expect.any(Function));
      expect(spanSetAttribute).toHaveBeenCalledWith("rawr.workflow.surface", "published");
      expect(spanSetAttribute).toHaveBeenCalledWith("http.response.status_code", 200);
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("records published workflow 404 metrics on unmatched routes", async () => {
    const { app, repoRoot } = await createTestApp();

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/workflows/unknown/path", {
          headers: {
            "x-request-id": "workflow-openapi-request-404",
            "x-correlation-id": "workflow-openapi-correlation-404",
          },
        }),
      );

      expect(response.status).toBe(404);
      expect(counterAdd).toHaveBeenCalledWith(1, expect.objectContaining({
        "rawr.workflow.surface": "published",
        "rawr.workflow.router": "published",
        "http.response.status_code": 404,
      }));
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });
});
