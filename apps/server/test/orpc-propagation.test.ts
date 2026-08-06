import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  __resetRawrOrpcTelemetryForTests,
  installRawrOrpcTelemetry,
} from "@habitat-ai/rawr-core/telemetry";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { Inngest } from "inngest";
import { afterEach, describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerOrpcRoutes } from "../src/orpc";
import { createTestingRawrHostSeam } from "../src/testing-host";
import { createTestingServerTelemetry } from "./support/process-runtime";

afterEach(async () => {
  delete process.env.OTEL_BSP_SCHEDULE_DELAY;
  delete process.env.OTEL_LOGS_EXPORTER;
  delete process.env.OTEL_METRICS_EXPORTER;
  await __resetRawrOrpcTelemetryForTests();
});

describe("oRPC trace propagation", () => {
  it("continues one inbound W3C chain through the host and native oRPC spans", async () => {
    process.env.OTEL_BSP_SCHEDULE_DELAY = "10";
    process.env.OTEL_LOGS_EXPORTER = "none";
    process.env.OTEL_METRICS_EXPORTER = "none";
    const exported: ReadableSpan[] = [];
    const exporter: SpanExporter = {
      export(spans, resultCallback) {
        exported.push(...spans);
        resultCallback({ code: 0 });
      },
      async forceFlush() {},
      async shutdown() {},
    };
    const telemetry = await installRawrOrpcTelemetry({
      serviceName: "@rawr/server-propagation-test",
      environment: "test",
      traceExporter: exporter,
    });
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-orpc-propagation-"));
    const host = createTestingRawrHostSeam();
    const app = registerOrpcRoutes(createServerApp(), {
      ...createTestingServerTelemetry().effectContext,
      deps: {
        runtime: {},
        inngestClient: {} as Inngest,
        exampleTodo: host.satisfiers.exampleTodo,
      },
      scope: { repoRoot },
      config: { baseUrl: "http://localhost:3000" },
      router: host.realization.orpc.router,
    });
    const remoteTraceId = "11111111111111111111111111111111";
    const remoteSpanId = "2222222222222222";

    const response = await app.handle(
      new Request("http://localhost/rpc/exampleTodo/tasks/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          traceparent: `00-${remoteTraceId}-${remoteSpanId}-01`,
          "x-rawr-caller-surface": "first-party",
          "x-rawr-session-auth": "verified",
        },
        body: JSON.stringify({ json: { title: "Trace the registered host" } }),
      })
    );

    expect(response.status).toBe(200);
    await telemetry.shutdown();

    const hostSpan = exported.find((span) => span.name === "rawr.orpc.rpc.request");
    const nativeRouteSpan = exported.find((span) => span.name === "orpc.exampleTodo/tasks/create");
    expect(hostSpan?.parentSpanContext?.spanId).toBe(remoteSpanId);
    expect(hostSpan?.spanContext().traceId).toBe(remoteTraceId);
    expect(nativeRouteSpan?.parentSpanContext?.spanId).toBe(hostSpan?.spanContext().spanId);
    expect(nativeRouteSpan?.spanContext().traceId).toBe(remoteTraceId);
  });
});
