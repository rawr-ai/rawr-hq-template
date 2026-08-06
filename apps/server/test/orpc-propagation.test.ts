import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import type { EnabledOpenTelemetryNodeConfig } from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
import type { SpanContext } from "@opentelemetry/api";
import * as otelApi from "@opentelemetry/api";
import { BatchSpanProcessor, type ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { handlerGen } from "@orpc/experimental-effect";
import { os as orpc, type Router } from "@orpc/server";
import { Effect } from "effect";
import { Inngest } from "inngest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerApp } from "../src/app";
import {
  __configureHostLoggerForTests,
  __flushHostLoggerForTests,
  __resetHostLoggerForTests,
  createHostLoggerAdapter,
} from "../src/logging";
import { type RawrOrpcContext, registerOrpcRoutes } from "../src/orpc";
import { registerRawrRoutes } from "../src/rawr";
import { acquireServerTelemetry, type ServerTelemetryLifecycle } from "../src/telemetry";
import { createTestingRawrHostSeam } from "../src/testing-host";
import { createTestingServerTelemetry } from "./support/process-runtime";

const FIRST_PARTY_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

let activeTelemetry: ServerTelemetryLifecycle | undefined;
let stopReceiver: (() => Promise<void>) | undefined;

afterEach(async () => {
  await activeTelemetry?.shutdown();
  activeTelemetry = undefined;
  await stopReceiver?.();
  stopReceiver = undefined;
  __resetHostLoggerForTests();
  vi.restoreAllMocks();
});

function endpoint(url: string): EnabledOpenTelemetryNodeConfig["traces"] {
  return Object.freeze({
    url,
    headers: Object.freeze({}),
    timeoutMilliseconds: 2_000,
  });
}

function telemetryConfig(origin: string): EnabledOpenTelemetryNodeConfig {
  return Object.freeze({
    enabled: true,
    processIdentity: Object.freeze({
      serviceName: "@rawr/server-propagation-test",
      serviceVersion: "0.1.0",
      deploymentEnvironment: "test",
      processRole: "server-test",
      processInstanceId: "server-propagation-test-1",
    }),
    defaultAttributes: Object.freeze({}),
    exportedAttributePaths: Object.freeze([]),
    traces: endpoint(`${origin}/v1/traces`),
    metrics: endpoint(`${origin}/v1/metrics`),
    logs: endpoint(`${origin}/v1/logs`),
    metricExportIntervalMilliseconds: 60_000,
    shutdownFallbackMilliseconds: 5_000,
  });
}

async function acquireObservedTelemetry(exported: ReadableSpan[]) {
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("test OTLP receiver did not bind a TCP port");
  }
  stopReceiver = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
      server.closeAllConnections();
    });
  const onEnd = BatchSpanProcessor.prototype.onEnd;
  vi.spyOn(BatchSpanProcessor.prototype, "onEnd").mockImplementation(function (
    this: BatchSpanProcessor,
    span
  ) {
    exported.push(span);
    onEnd.call(this, span);
  });
  const inngestClient = new Inngest({ id: "rawr-server-propagation-test" });
  activeTelemetry = await acquireServerTelemetry({
    config: telemetryConfig(`http://127.0.0.1:${address.port}`),
    inngestClient,
  });
  expect(activeTelemetry.telemetry.availability).toBe("available");
  return { inngestClient, telemetry: activeTelemetry };
}

function requireSpan(
  spans: ReadableSpan[],
  predicate: (span: ReadableSpan) => boolean
): ReadableSpan {
  const span = spans.find(predicate);
  if (span === undefined) throw new Error("required telemetry span was not exported");
  return span;
}

function requireSpanContext(spanContext: SpanContext | undefined): SpanContext {
  if (spanContext === undefined) throw new Error("required active span context was not observed");
  return spanContext;
}

function hasAncestor(spans: ReadableSpan[], span: ReadableSpan, ancestorSpanId: string): boolean {
  const spansById = new Map(spans.map((candidate) => [candidate.spanContext().spanId, candidate]));
  let parentSpanId = span.parentSpanContext?.spanId;

  while (parentSpanId !== undefined) {
    if (parentSpanId === ancestorSpanId) return true;
    parentSpanId = spansById.get(parentSpanId)?.parentSpanContext?.spanId;
  }

  return false;
}

describe.sequential("oRPC trace propagation", () => {
  it("continues remote -> host -> native oRPC -> Effect ancestry from production telemetry", async () => {
    const exported: ReadableSpan[] = [];
    const pinoLines: string[] = [];
    const extract = vi.spyOn(otelApi.propagation, "extract");
    const { inngestClient, telemetry } = await acquireObservedTelemetry(exported);
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-orpc-propagation-"));
    const host = createTestingRawrHostSeam();
    let activeNativeSpanContextBeforeEffect: SpanContext | undefined;
    let activeEffectSpanContext: SpanContext | undefined;
    let activeNativeSpanContextAfterEffect: SpanContext | undefined;

    __configureHostLoggerForTests({
      destination: {
        write(line: string) {
          pinoLines.push(line);
        },
      },
    });
    const logger = createHostLoggerAdapter(telemetry.telemetry);
    const effectProcedure = orpc.$context<RawrOrpcContext>().handler(
      handlerGen(function* () {
        activeNativeSpanContextBeforeEffect = yield* Effect.sync(() =>
          otelApi.trace.getActiveSpan()?.spanContext()
        );
        yield* Effect.sync(() => logger.info("telemetry.effect.before"));
        yield* Effect.sync(() => {
          activeEffectSpanContext = otelApi.trace.getActiveSpan()?.spanContext();
          logger.info("telemetry.effect.inside");
        }).pipe(Effect.withSpan("test.effect.handler"));
        activeNativeSpanContextAfterEffect = yield* Effect.sync(() =>
          otelApi.trace.getActiveSpan()?.spanContext()
        );
        yield* Effect.sync(() => logger.info("telemetry.effect.after"));
        return { ok: true };
      })
    );
    const router = {
      telemetry: { effect: effectProcedure },
    } satisfies Router<RawrOrpcContext>;
    const app = registerOrpcRoutes(createServerApp(), {
      ...telemetry.effectContext,
      deps: {
        runtime: {},
        inngestClient,
        exampleTodo: host.satisfiers.exampleTodo,
      },
      scope: { repoRoot },
      config: { baseUrl: "http://localhost:3000" },
      router,
      openApiRouter: host.realization.orpc.published.router,
    });
    const remoteTraceId = "11111111111111111111111111111111";
    const remoteSpanId = "2222222222222222";

    try {
      const response = await app.handle(
        new Request("http://localhost/rpc/telemetry/effect", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_HEADERS,
            traceparent: `00-${remoteTraceId}-${remoteSpanId}-01`,
          },
          body: JSON.stringify({ json: {} }),
        })
      );

      expect(response.status).toBe(200);
      expect(extract).toHaveBeenCalledTimes(1);
      __flushHostLoggerForTests();
      await telemetry.shutdown();

      const hostSpan = requireSpan(exported, (span) => span.name === "rawr.orpc.rpc.request");
      const nativeRouteSpan = requireSpan(
        exported,
        (span) => span.name === "orpc.telemetry/effect"
      );
      const effectSpan = requireSpan(exported, (span) => span.name === "test.effect.handler");
      const observedNativeSpanContextBeforeEffect = requireSpanContext(
        activeNativeSpanContextBeforeEffect
      );
      const observedEffectSpanContext = requireSpanContext(activeEffectSpanContext);
      const observedNativeSpanContextAfterEffect = requireSpanContext(
        activeNativeSpanContextAfterEffect
      );
      const nativeActiveSpan = requireSpan(
        exported,
        (span) => span.spanContext().spanId === observedNativeSpanContextBeforeEffect.spanId
      );

      expect(hostSpan.parentSpanContext?.spanId).toBe(remoteSpanId);
      expect(hostSpan.spanContext().traceId).toBe(remoteTraceId);
      expect(nativeRouteSpan.parentSpanContext?.spanId).toBe(hostSpan.spanContext().spanId);
      expect(nativeRouteSpan.spanContext().traceId).toBe(remoteTraceId);
      expect(nativeActiveSpan.instrumentationScope.name).toBe("@orpc/opentelemetry");
      expect(hasAncestor(exported, nativeActiveSpan, nativeRouteSpan.spanContext().spanId)).toBe(
        true
      );
      expect(effectSpan.spanContext()).toMatchObject(observedEffectSpanContext);
      expect(effectSpan.parentSpanContext?.spanId).toBe(nativeActiveSpan.spanContext().spanId);
      expect(effectSpan.spanContext().traceId).toBe(remoteTraceId);
      expect(observedNativeSpanContextAfterEffect).toMatchObject(
        observedNativeSpanContextBeforeEffect
      );

      expect(pinoLines).toHaveLength(3);
      const pinoRecords = pinoLines.map((line) => JSON.parse(line) as Record<string, unknown>);
      expect(pinoRecords).toEqual([
        expect.objectContaining({
          event: "telemetry.effect.before",
          traceId: observedNativeSpanContextBeforeEffect.traceId,
          spanId: observedNativeSpanContextBeforeEffect.spanId,
        }),
        expect.objectContaining({
          event: "telemetry.effect.inside",
          traceId: observedEffectSpanContext.traceId,
          spanId: observedEffectSpanContext.spanId,
        }),
        expect.objectContaining({
          event: "telemetry.effect.after",
          traceId: observedNativeSpanContextAfterEffect.traceId,
          spanId: observedNativeSpanContextAfterEffect.spanId,
        }),
      ]);
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("extracts W3C context exactly once at OpenAPI and workflow physical ingress", async () => {
    const exported: ReadableSpan[] = [];
    const extract = vi.spyOn(otelApi.propagation, "extract");
    const { inngestClient, telemetry } = await acquireObservedTelemetry(exported);
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-ingress-propagation-"));
    const host = createTestingRawrHostSeam();
    const orpcApp = registerOrpcRoutes(createServerApp(), {
      ...telemetry.effectContext,
      deps: {
        runtime: {},
        inngestClient,
        exampleTodo: host.satisfiers.exampleTodo,
      },
      scope: { repoRoot },
      config: { baseUrl: "http://localhost:3000" },
      router: host.realization.orpc.router,
      openApiRouter: host.realization.orpc.published.router,
    });
    const workflowApp = registerRawrRoutes(createServerApp(), {
      inngestClient,
      telemetry,
      repoRoot,
      baseUrl: "http://localhost:3000",
      hostComposition: host,
    });
    const traceparent = "00-33333333333333333333333333333333-4444444444444444-01";

    try {
      const openApiResponse = await orpcApp.handle(
        new Request("http://localhost/api/orpc/exampleTodo/tasks/create", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            traceparent,
            "x-rawr-caller-surface": "external",
          },
          body: JSON.stringify({ title: "Trace OpenAPI ingress" }),
        })
      );
      expect(openApiResponse.status).toBe(200);
      expect(extract).toHaveBeenCalledTimes(1);

      extract.mockClear();
      const workflowResponse = await workflowApp.handle(
        new Request("http://localhost/api/workflows/exampleTodo/missing", {
          headers: { traceparent },
        })
      );
      expect(workflowResponse.status).toBe(404);
      expect(extract).toHaveBeenCalledTimes(1);

      await telemetry.shutdown();
      const workflowHostSpan = requireSpan(
        exported,
        (span) => span.name === "rawr.workflow.request"
      );
      expect(workflowHostSpan.parentSpanContext?.spanId).toBe("4444444444444444");
      expect(workflowHostSpan.spanContext().traceId).toBe("33333333333333333333333333333333");
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("keeps disabled-provider route logs free of synthetic or stale span correlation", async () => {
    const pinoLines: string[] = [];
    const extract = vi.spyOn(otelApi.propagation, "extract");
    const telemetry = createTestingServerTelemetry();
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-disabled-propagation-"));
    const host = createTestingRawrHostSeam();
    const inngestClient = new Inngest({ id: "rawr-server-disabled-propagation-test" });

    __configureHostLoggerForTests({
      destination: {
        write(line: string) {
          pinoLines.push(line);
        },
      },
    });
    const logger = createHostLoggerAdapter(telemetry.telemetry);
    const effectProcedure = orpc.$context<RawrOrpcContext>().handler(
      handlerGen(function* () {
        yield* Effect.sync(() => logger.info("telemetry.disabled.handler"));
        return { ok: true };
      })
    );
    const router = {
      telemetry: { disabled: effectProcedure },
    } satisfies Router<RawrOrpcContext>;
    const app = registerOrpcRoutes(createServerApp(), {
      ...telemetry.effectContext,
      deps: {
        runtime: {},
        inngestClient,
        exampleTodo: host.satisfiers.exampleTodo,
      },
      scope: { repoRoot },
      config: { baseUrl: "http://localhost:3000" },
      router,
    });

    try {
      const response = await app.handle(
        new Request("http://localhost/rpc/telemetry/disabled", {
          method: "POST",
          headers: {
            ...FIRST_PARTY_HEADERS,
            traceparent: "00-55555555555555555555555555555555-6666666666666666-01",
          },
          body: JSON.stringify({ json: {} }),
        })
      );

      expect(response.status).toBe(200);
      expect(extract).toHaveBeenCalledTimes(1);
      __flushHostLoggerForTests();
      expect(pinoLines).toHaveLength(1);
      const record = JSON.parse(pinoLines[0] ?? "{}") as Record<string, unknown>;
      expect(record).toMatchObject({ event: "telemetry.disabled.handler" });
      expect(record).not.toHaveProperty("traceId");
      expect(record).not.toHaveProperty("spanId");
    } finally {
      await fs.rm(repoRoot, { recursive: true, force: true });
    }
  });
});
