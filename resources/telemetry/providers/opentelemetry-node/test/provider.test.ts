import { describe, expect, test } from "bun:test";
import { context, metrics, propagation, TraceFlags, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { CompositePropagator } from "@opentelemetry/core";
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  type LogRecordExporter,
} from "@opentelemetry/sdk-logs";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  InstrumentType,
  MeterProvider,
} from "@opentelemetry/sdk-metrics";
import { BasicTracerProvider, InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { Effect } from "effect";

import {
  acquireEnabledOpenTelemetryNode,
  makeOtlpExporters,
  makeOtlpHttpConfiguration,
  type OpenTelemetryNodeExporterSet,
} from "../enabled";
import {
  acquireOpenTelemetryNode,
  decodeOpenTelemetryNodeConfig,
  type EnabledOpenTelemetryNodeConfig,
} from "../index";

const zeroAccounting = Object.freeze({
  traces: Object.freeze({ successItems: 0, failureItems: 0 }),
  metrics: Object.freeze({ successItems: 0, failureItems: 0 }),
  logs: Object.freeze({ successItems: 0, failureItems: 0 }),
});

const hostileEnvironment = Object.freeze({
  OTEL_TRACES_SAMPLER: "always_off",
  OTEL_ATTRIBUTE_COUNT_LIMIT: "1",
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: "1",
  OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: "1",
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: "1",
  OTEL_SPAN_LINK_COUNT_LIMIT: "1",
  OTEL_SPAN_EVENT_COUNT_LIMIT: "1",
  OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT: "1",
  OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT: "1",
  OTEL_BSP_MAX_QUEUE_SIZE: "1",
  OTEL_BSP_MAX_EXPORT_BATCH_SIZE: "1",
  OTEL_BSP_SCHEDULE_DELAY: "1",
  OTEL_BLRP_MAX_QUEUE_SIZE: "1",
  OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: "1",
  OTEL_BLRP_SCHEDULE_DELAY: "1",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://ambient.invalid",
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://ambient.invalid/traces",
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://ambient.invalid/metrics",
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "https://ambient.invalid/logs",
  OTEL_EXPORTER_OTLP_HEADERS: "ambient=general",
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: "ambient=traces",
  OTEL_EXPORTER_OTLP_METRICS_HEADERS: "ambient=metrics",
  OTEL_EXPORTER_OTLP_LOGS_HEADERS: "ambient=logs",
  OTEL_EXPORTER_OTLP_TIMEOUT: "1",
  OTEL_EXPORTER_OTLP_TRACES_TIMEOUT: "1",
  OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: "1",
  OTEL_EXPORTER_OTLP_LOGS_TIMEOUT: "1",
  OTEL_EXPORTER_OTLP_COMPRESSION: "gzip",
  OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: "gzip",
  OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "gzip",
  OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: "gzip",
  OTEL_EXPORTER_OTLP_CERTIFICATE: "/ambient/general-ca.pem",
  OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: "/ambient/traces-ca.pem",
  OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE: "/ambient/metrics-ca.pem",
  OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE: "/ambient/logs-ca.pem",
  OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: "/ambient/general-client.pem",
  OTEL_EXPORTER_OTLP_CLIENT_KEY: "/ambient/general-client.key",
  OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: "/ambient/traces-client.pem",
  OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: "/ambient/traces-client.key",
  OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE: "/ambient/metrics-client.pem",
  OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY: "/ambient/metrics-client.key",
  OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE: "/ambient/logs-client.pem",
  OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY: "/ambient/logs-client.key",
  OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "delta",
});

const enabledConfig = makeEnabledConfig();

function makeEnabledConfig(): EnabledOpenTelemetryNodeConfig {
  const config = decodeOpenTelemetryNodeConfig({
    enabled: true,
    processIdentity: {
      serviceName: "habitat-test",
      serviceVersion: "0.3.1",
      deploymentEnvironment: "test",
      processRole: "provider-conformance",
      processInstanceId: "process-1",
    },
    defaultAttributes: {
      "correlation.id": "correlation-1",
      authorization: "not-exported",
    },
    exportedAttributePaths: ["correlation.id", "authorization"],
    traces: {
      url: "https://telemetry.invalid/v1/traces",
      headers: { "x-habitat-signal": "traces" },
      timeoutMilliseconds: 100,
    },
    metrics: {
      url: "https://telemetry.invalid/v1/metrics",
      headers: { "x-habitat-signal": "metrics" },
      timeoutMilliseconds: 100,
    },
    logs: {
      url: "https://telemetry.invalid/v1/logs",
      headers: { "x-habitat-signal": "logs" },
      timeoutMilliseconds: 100,
    },
    metricExportIntervalMilliseconds: 1_000,
    constructionCleanupTimeoutMilliseconds: 100,
  });
  if (!config.enabled) throw new Error("Expected enabled test configuration");
  return config;
}

function deadline(): { readonly deadlineMonotonicMilliseconds: number } {
  return { deadlineMonotonicMilliseconds: performance.now() + 2_000 };
}

interface MemoryExporterFixture {
  readonly set: OpenTelemetryNodeExporterSet;
  readonly traces: InMemorySpanExporter;
  readonly metrics: InMemoryMetricExporter;
  readonly logs: InMemoryLogRecordExporter;
  readonly traceBatchSizes: number[];
  readonly logBatchSizes: number[];
}

function memoryExporters(): MemoryExporterFixture {
  const traces = new InMemorySpanExporter();
  const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const logExporter = new InMemoryLogRecordExporter();
  const traceBatchSizes: number[] = [];
  const logBatchSizes: number[] = [];
  const set: OpenTelemetryNodeExporterSet = {
    traces: {
      export: (spans, callback) => {
        traceBatchSizes.push(spans.length);
        traces.export(spans, callback);
      },
      forceFlush: () => traces.forceFlush(),
      shutdown: () => traces.shutdown(),
    },
    metrics: metricExporter,
    logs: {
      export: (records, callback) => {
        logBatchSizes.push(records.length);
        logExporter.export(records, callback);
      },
      shutdown: () => logExporter.shutdown(),
    },
  };
  return {
    set,
    traces,
    metrics: metricExporter,
    logs: logExporter,
    traceBatchSizes,
    logBatchSizes,
  };
}

function deferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function withEnvironment(
  environment: Readonly<Record<string, string>>,
  run: () => Promise<void>
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(environment)) {
    previous.set(name, process.env[name]);
    process.env[name] = value;
  }
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

async function emitTechnicalLog(
  lease: Awaited<ReturnType<typeof acquireEnabledOpenTelemetryNode>>,
  eventName: string
): Promise<void> {
  await Effect.runPromise(
    lease.telemetry.emitTechnicalLog({
      severity: "info",
      eventName,
      message: "Provider conformance completed",
      attributes: { "correlation.id": "correlation-1" },
    })
  );
}

describe("OpenTelemetry Node provider", () => {
  test("decodes only explicit HTTP(S) endpoint configuration", () => {
    expect(enabledConfig.enabled).toBe(true);
    expect(() =>
      decodeOpenTelemetryNodeConfig({
        ...enabledConfig,
        traces: { ...enabledConfig.traces, url: "grpc://collector.invalid/v1/traces" },
      })
    ).toThrow();
    expect(() =>
      decodeOpenTelemetryNodeConfig({
        ...enabledConfig,
        metrics: { headers: {}, timeoutMilliseconds: 100 },
      })
    ).toThrow();
  });

  test("constructs zero vendor topology and records zero callback items while disabled", async () => {
    const lease = await Effect.runPromise(
      acquireOpenTelemetryNode({
        config: decodeOpenTelemetryNodeConfig({
          enabled: false,
          processIdentity: enabledConfig.processIdentity,
        }),
      })
    );
    await Effect.runPromise(
      lease.telemetry.emitTechnicalLog({
        severity: "info",
        eventName: "disabled.noop",
        message: "Disabled telemetry stays inert",
        attributes: {},
      })
    );

    expect(lease.telemetry.availability).toBe("disabled");
    expect(await Effect.runPromise(lease.telemetry.readExportCallbackAccounting())).toEqual(
      zeroAccounting
    );
    expect(await Effect.runPromise(lease.telemetry.readDiagnostics())).toEqual([]);
    expect(await Effect.runPromise(lease.release(deadline()))).toEqual({
      outcome: "flushed",
      accounting: zeroAccounting,
      diagnostics: [],
    });
  });

  test("ignores a hostile OTEL environment across native defaults and OTLP HTTP settings", async () => {
    await withEnvironment(hostileEnvironment, async () => {
      const configurations = [enabledConfig.traces, enabledConfig.metrics, enabledConfig.logs];
      for (const configured of configurations) {
        const exact = makeOtlpHttpConfiguration(configured);
        expect(exact.url).toBe(configured.url);
        expect(await exact.headers()).toEqual({
          "x-habitat-signal": configured.headers["x-habitat-signal"],
          "Content-Type": "application/json",
        });
        expect(exact.timeoutMillis).toBe(configured.timeoutMilliseconds);
        expect(exact.concurrencyLimit).toBe(30);
        expect(exact.compression).toBe("none");
        const agent = await exact.agentFactory("https:");
        expect(agent.options.keepAlive).toBe(true);
        expect(agent.options).not.toHaveProperty("ca");
        expect(agent.options).not.toHaveProperty("cert");
        expect(agent.options).not.toHaveProperty("key");
        agent.destroy();
      }

      const otlpExporters = makeOtlpExporters(enabledConfig);
      try {
        expect(otlpExporters.metrics.selectAggregationTemporality?.(InstrumentType.COUNTER)).toBe(
          AggregationTemporality.CUMULATIVE
        );
      } finally {
        await Promise.all([
          otlpExporters.logs.shutdown(),
          otlpExporters.metrics.shutdown(),
          otlpExporters.traces.shutdown(),
        ]);
      }

      const exporters = memoryExporters();
      const lease = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);
      expect(lease.telemetry.availability).toBe("available");
      const tracer = trace.getTracer("hostile-environment");
      const first = tracer.startSpan("first", {
        attributes: { first: "not-truncated", second: "also-retained" },
        links: [
          {
            context: {
              traceId: "1".repeat(32),
              spanId: "1".repeat(16),
              traceFlags: TraceFlags.SAMPLED,
            },
            attributes: { first: 1, second: 2 },
          },
          {
            context: {
              traceId: "2".repeat(32),
              spanId: "2".repeat(16),
              traceFlags: TraceFlags.SAMPLED,
            },
            attributes: { first: 1, second: 2 },
          },
        ],
      });
      first.addEvent("first-event", { first: 1, second: 2 });
      first.addEvent("second-event", { first: 1, second: 2 });
      first.end();
      tracer.startSpan("second").end();
      await emitTechnicalLog(lease, "hostile.first");
      await emitTechnicalLog(lease, "hostile.second");

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(exporters.traceBatchSizes).toEqual([]);
      expect(exporters.logBatchSizes).toEqual([]);

      await Effect.runPromise(lease.telemetry.flush(deadline()));
      const exportedFirst = exporters.traces
        .getFinishedSpans()
        .find((span) => span.name === "first");
      expect(exportedFirst?.attributes).toEqual({
        first: "not-truncated",
        second: "also-retained",
      });
      expect(exportedFirst?.events).toHaveLength(2);
      expect(exportedFirst?.events[0]?.attributes).toEqual({ first: 1, second: 2 });
      expect(exportedFirst?.links).toHaveLength(2);
      expect(exportedFirst?.links[0]?.attributes).toEqual({ first: 1, second: 2 });
      expect(exporters.traceBatchSizes).toEqual([2]);
      expect(exporters.logBatchSizes).toEqual([2]);
      await Effect.runPromise(lease.release(deadline()));
    });
  });

  test("exports correlated native signals and counts every cumulative callback presentation", async () => {
    const exporters = memoryExporters();
    const lease = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);
    expect(lease.telemetry.availability).toBe("available");

    const tracer = trace.getTracer("provider-conformance");
    const counter = metrics.getMeter("provider-conformance").createCounter("provider.operations");
    await tracer.startActiveSpan("parent", async (parent) => {
      parent.addEvent("native-event", { "correlation.id": "correlation-1" });
      await Promise.resolve();
      tracer.startActiveSpan("child", (child) => child.end());
      counter.add(1, { "correlation.id": "correlation-1" });
      await Effect.runPromise(
        lease.telemetry.emitTechnicalLog({
          severity: "info",
          eventName: "provider.completed",
          message: "Provider conformance completed",
          attributes: {
            "correlation.id": "correlation-1",
            authorization: "must-not-export",
          },
        })
      );
      parent.end();
    });

    const firstFlush = await Effect.runPromise(lease.telemetry.flush(deadline()));
    const spans = exporters.traces.getFinishedSpans();
    const parent = spans.find((span) => span.name === "parent");
    const child = spans.find((span) => span.name === "child");
    const records = exporters.logs.getFinishedLogRecords();

    expect(spans).toHaveLength(2);
    expect(parent?.events.map((event) => event.name)).toContain("native-event");
    expect(child?.parentSpanContext?.spanId).toBe(parent?.spanContext().spanId);
    expect(records).toHaveLength(1);
    expect(records[0]?.instrumentationScope.name).toBe("@habitat-ai/sdk/telemetry");
    expect(records[0]?.spanContext?.traceId).toBe(parent?.spanContext().traceId);
    expect(records[0]?.attributes["correlation.id"]).toBe("correlation-1");
    expect(records[0]?.attributes.authorization).toBeUndefined();
    expect(exporters.metrics.getMetrics()).toHaveLength(1);
    expect(firstFlush.accounting).toEqual({
      traces: { successItems: 2, failureItems: 0 },
      metrics: { successItems: 1, failureItems: 0 },
      logs: { successItems: 1, failureItems: 0 },
    });

    const secondFlush = await Effect.runPromise(lease.telemetry.flush(deadline()));
    expect(secondFlush.accounting).toEqual({
      traces: { successItems: 2, failureItems: 0 },
      metrics: { successItems: 2, failureItems: 0 },
      logs: { successItems: 1, failureItems: 0 },
    });
    await Effect.runPromise(lease.release(deadline()));
  });

  test("groups callback items under exporter failure without changing observed work", async () => {
    const exporters = memoryExporters();
    await Promise.all([
      exporters.traces.shutdown(),
      exporters.metrics.shutdown(),
      exporters.logs.shutdown(),
    ]);
    const lease = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);
    expect(lease.telemetry.availability).toBe("available");

    trace.getTracer("provider-failure").startActiveSpan("still-succeeds", (span) => span.end());
    metrics.getMeter("provider-failure").createCounter("provider.failures").add(1);
    await emitTechnicalLog(lease, "export.failed");

    const flush = await Effect.runPromise(lease.telemetry.flush(deadline()));
    expect(flush.outcome).toBe("degraded");
    expect(flush.accounting).toEqual({
      traces: { successItems: 0, failureItems: 1 },
      metrics: { successItems: 0, failureItems: 1 },
      logs: { successItems: 0, failureItems: 1 },
    });
    expect(flush.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["LOG_EXPORT_FAILED", "METRIC_EXPORT_FAILED", "TRACE_EXPORT_FAILED"])
    );
    await Effect.runPromise(lease.release(deadline()));
  });

  test("refuses duplicate acquisition before construction and keeps degraded intake uncounted", async () => {
    const exporters = memoryExporters();
    const first = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);
    let duplicateFactoryCalls = 0;
    const duplicate = await acquireEnabledOpenTelemetryNode(enabledConfig, () => {
      duplicateFactoryCalls += 1;
      return memoryExporters().set;
    });
    await emitTechnicalLog(duplicate, "degraded.noop");

    expect(first.telemetry.availability).toBe("available");
    expect(duplicate.telemetry.availability).toBe("degraded");
    expect(duplicateFactoryCalls).toBe(0);
    expect(await Effect.runPromise(duplicate.telemetry.readExportCallbackAccounting())).toEqual(
      zeroAccounting
    );
    expect((await Effect.runPromise(duplicate.telemetry.readDiagnostics()))[0]?.code).toBe(
      "PROVIDER_ALREADY_ACQUIRED"
    );
    await Effect.runPromise(duplicate.release(deadline()));
    await Effect.runPromise(first.release(deadline()));
  });

  test("releases every incomplete constructor owner", async () => {
    let traceShutdowns = 0;
    let metricShutdowns = 0;
    const partialTrace = new InMemorySpanExporter();
    const partialMetric = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const traceShutdown = partialTrace.shutdown.bind(partialTrace);
    const metricShutdown = partialMetric.shutdown.bind(partialMetric);
    partialTrace.shutdown = async () => {
      traceShutdowns += 1;
      await traceShutdown();
    };
    partialMetric.shutdown = async () => {
      metricShutdowns += 1;
      await metricShutdown();
    };
    const partial = await acquireEnabledOpenTelemetryNode(enabledConfig, () => {
      const candidate: OpenTelemetryNodeExporterSet = {
        traces: partialTrace,
        metrics: partialMetric,
        get logs(): LogRecordExporter {
          throw new Error("construction fixture");
        },
      };
      return candidate;
    });

    expect(partial.telemetry.availability).toBe("degraded");
    expect(traceShutdowns).toBe(1);
    expect(metricShutdowns).toBe(1);
    await Effect.runPromise(partial.release(deadline()));
  });

  test("rolls back a late global conflict before gated cleanup can yield", async () => {
    const foreignLoggerProvider = new LoggerProvider();
    expect(logs.setGlobalLoggerProvider(foreignLoggerProvider)).toBe(foreignLoggerProvider);
    const exporters = memoryExporters();
    const cleanupStarted = deferred();
    const cleanupGate = deferred();
    const logShutdown = exporters.logs.shutdown.bind(exporters.logs);
    exporters.logs.shutdown = () => {
      cleanupStarted.resolve();
      return cleanupGate.promise.then(logShutdown);
    };

    const acquisition = acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);
    await cleanupStarted.promise;

    const replacementContext = new AsyncLocalStorageContextManager().enable();
    const replacementPropagator = new CompositePropagator({ propagators: [] });
    const replacementTracerProvider = new BasicTracerProvider();
    const replacementMeterProvider = new MeterProvider();
    expect(context.setGlobalContextManager(replacementContext)).toBe(true);
    expect(propagation.setGlobalPropagator(replacementPropagator)).toBe(true);
    expect(trace.setGlobalTracerProvider(replacementTracerProvider)).toBe(true);
    const replacementGlobalTracerProvider = trace.getTracerProvider();
    expect(metrics.setGlobalMeterProvider(replacementMeterProvider)).toBe(true);

    cleanupGate.resolve();
    const lease = await acquisition;
    expect(lease.telemetry.availability).toBe("degraded");
    expect((await Effect.runPromise(lease.telemetry.readDiagnostics()))[0]?.code).toBe(
      "GLOBAL_TELEMETRY_OWNER_PRESENT"
    );
    expect(trace.getTracerProvider()).toBe(replacementGlobalTracerProvider);
    expect(metrics.getMeterProvider()).toBe(replacementMeterProvider);
    expect(context.setGlobalContextManager(replacementContext)).toBe(false);
    expect(propagation.setGlobalPropagator(replacementPropagator)).toBe(false);

    await Effect.runPromise(lease.release(deadline()));
    metrics.disable();
    await replacementMeterProvider.shutdown();
    trace.disable();
    await replacementTracerProvider.shutdown();
    propagation.disable();
    context.disable();
    logs.disable();
    await foreignLoggerProvider.shutdown();
  });

  test("unregisters at release start so a replacement survives stalled old work", async () => {
    const firstExporters = memoryExporters();
    const shutdownStarted = deferred();
    const shutdownGate = deferred();
    const logShutdown = firstExporters.logs.shutdown.bind(firstExporters.logs);
    firstExporters.logs.shutdown = () => {
      shutdownStarted.resolve();
      return shutdownGate.promise.then(logShutdown);
    };
    const first = await acquireEnabledOpenTelemetryNode(enabledConfig, () => firstExporters.set);

    const releasing = Effect.runPromise(first.release(deadline()));
    await shutdownStarted.promise;
    const replacementExporters = memoryExporters();
    const replacement = await acquireEnabledOpenTelemetryNode(
      enabledConfig,
      () => replacementExporters.set
    );
    expect(replacement.telemetry.availability).toBe("available");
    await emitTechnicalLog(first, "closed.noop");
    expect(await Effect.runPromise(first.telemetry.readExportCallbackAccounting())).toEqual(
      zeroAccounting
    );

    shutdownGate.resolve();
    await releasing;
    trace.getTracer("replacement").startSpan("replacement-survives").end();
    await Effect.runPromise(replacement.telemetry.flush(deadline()));
    expect(replacementExporters.traces.getFinishedSpans().map((span) => span.name)).toEqual([
      "replacement-survives",
    ]);
    await Effect.runPromise(replacement.release(deadline()));
  });

  test("releases signal providers in reverse order exactly once", async () => {
    const exporters = memoryExporters();
    const shutdowns: string[] = [];
    const wrapShutdown = <Exporter extends { shutdown(): Promise<void> }>(
      name: string,
      exporter: Exporter
    ): void => {
      const shutdown = exporter.shutdown.bind(exporter);
      exporter.shutdown = async () => {
        shutdowns.push(name);
        await shutdown();
      };
    };
    wrapShutdown("trace", exporters.traces);
    wrapShutdown("metric", exporters.metrics);
    wrapShutdown("log", exporters.logs);
    const lease = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);

    const first = await Effect.runPromise(lease.release(deadline()));
    const second = await Effect.runPromise(lease.release(deadline()));

    expect(first.outcome).toBe("flushed");
    expect(second).toBe(first);
    expect(shutdowns).toEqual(["log", "metric", "trace"]);
  });

  test("shares the first release deadline while attempting every shutdown", async () => {
    const exporters = memoryExporters();
    const shutdowns: string[] = [];
    const wrapShutdown = <Exporter extends { shutdown(): Promise<void> }>(
      name: string,
      exporter: Exporter
    ): void => {
      const shutdown = exporter.shutdown.bind(exporter);
      exporter.shutdown = async () => {
        shutdowns.push(name);
        await shutdown();
      };
    };
    wrapShutdown("trace", exporters.traces);
    wrapShutdown("metric", exporters.metrics);
    wrapShutdown("log", exporters.logs);
    const lease = await acquireEnabledOpenTelemetryNode(enabledConfig, () => exporters.set);

    const first = await Effect.runPromise(
      lease.release({ deadlineMonotonicMilliseconds: performance.now() - 1 })
    );
    const second = await Effect.runPromise(lease.release(deadline()));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(first.outcome).toBe("deadline-exceeded");
    expect(second).toBe(first);
    expect(shutdowns.sort()).toEqual(["log", "metric", "trace"]);
  });
});
