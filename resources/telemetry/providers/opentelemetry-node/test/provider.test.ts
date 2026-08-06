import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { context, metrics, propagation, trace } from "@opentelemetry/api";
import { type Logger, type LogRecord, logs } from "@opentelemetry/api-logs";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ORPCInstrumentation } from "@orpc/opentelemetry";
import { os } from "@orpc/server";
import { Effect } from "effect";
import { Inngest } from "inngest";
import type { Static } from "typebox";
import Schema from "typebox/schema";

import {
  acquireOpenTelemetryNode,
  type DisabledOpenTelemetryNodeConfig,
  DisabledOpenTelemetryNodeConfigSchema,
  type EnabledOpenTelemetryNodeConfig,
  EnabledOpenTelemetryNodeConfigSchema,
  makeDisabledOpenTelemetryNodeResource,
  type OpenTelemetryNodeConfig,
  OpenTelemetryNodeConfigSchema,
} from "../index";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

const configComesFromTypeBox: Expect<
  Equal<DisabledOpenTelemetryNodeConfig, Static<typeof DisabledOpenTelemetryNodeConfigSchema>>
> = true;
const enabledConfigComesFromTypeBox: Expect<
  Equal<EnabledOpenTelemetryNodeConfig, Static<typeof EnabledOpenTelemetryNodeConfigSchema>>
> = true;
const selectedConfigComesFromTypeBox: Expect<
  Equal<OpenTelemetryNodeConfig, Static<typeof OpenTelemetryNodeConfigSchema>>
> = true;
const configValidator = Schema.Compile(DisabledOpenTelemetryNodeConfigSchema);
const enabledConfigValidator = Schema.Compile(EnabledOpenTelemetryNodeConfigSchema);
const selectedConfigValidator = Schema.Compile(OpenTelemetryNodeConfigSchema);

const config: DisabledOpenTelemetryNodeConfig = Object.freeze({
  enabled: false,
  processIdentity: Object.freeze({
    serviceName: "rawr-hq",
    processRole: "server",
    processInstanceId: "disabled-test",
  }),
});

afterEach(() => {
  mock.restore();
});

describe("disabled OpenTelemetry Node provider", () => {
  test("derives its closed inert configuration from TypeBox", () => {
    expect(configComesFromTypeBox).toBe(true);
    expect(configValidator.Check(config)).toBe(true);
    expect(configValidator.Check({ ...config, enabled: true })).toBe(false);
    expect(configValidator.Check({ ...config, endpoint: "https://collector.test" })).toBe(false);
  });

  test("selects the disabled branch without registering process or telemetry machinery", async () => {
    const processOnce = spyOn(process, "once");
    const tracerRegistration = spyOn(trace, "setGlobalTracerProvider");
    const meterRegistration = spyOn(metrics, "setGlobalMeterProvider");
    const loggerRegistration = spyOn(logs, "setGlobalLoggerProvider");
    const contextRegistration = spyOn(context, "setGlobalContextManager");
    const propagatorRegistration = spyOn(propagation, "setGlobalPropagator");

    const lease = await Effect.runPromise(Effect.scoped(acquireOpenTelemetryNode({ config })));

    expect(lease.telemetry.availability).toBe("disabled");
    expect(processOnce).not.toHaveBeenCalled();
    expect(tracerRegistration).not.toHaveBeenCalled();
    expect(meterRegistration).not.toHaveBeenCalled();
    expect(loggerRegistration).not.toHaveBeenCalled();
    expect(contextRegistration).not.toHaveBeenCalled();
    expect(propagatorRegistration).not.toHaveBeenCalled();
  });

  test("constructs one disabled resource with no provider machinery", () => {
    const resource = makeDisabledOpenTelemetryNodeResource(config);

    expect(resource.processIdentity).toBe(config.processIdentity);
    expect(resource.availability).toBe("disabled");
    expect(Object.keys(resource)).toEqual([
      "processIdentity",
      "availability",
      "beginNativeOperation",
      "emitTechnicalLog",
      "readDiagnostics",
      "flush",
    ]);
  });

  test("settles every inert operation and idempotent scope finalization", async () => {
    const resource = makeDisabledOpenTelemetryNodeResource(config);
    const scope = await Effect.runPromise(
      resource.beginNativeOperation({
        surface: "oclif",
        kind: "command",
        operation: "agent.plugins.sync",
        operationId: "operation-1",
        attributes: { "command.id": "agent:plugins:sync" },
      })
    );

    await Effect.runPromise(scope.enrich({ attributes: { "receipt.id": "receipt-1" } }));
    await Effect.runPromise(scope.finish({ outcome: "succeeded", attributes: {} }));
    await Effect.runPromise(scope.finish({ outcome: "succeeded", attributes: {} }));
    await Effect.runPromise(
      resource.emitTechnicalLog({
        severity: "info",
        eventName: "command.completed",
        message: "command completed",
        attributes: { "operation.id": "operation-1" },
      })
    );

    expect(await Effect.runPromise(resource.readDiagnostics())).toEqual([]);
    expect(
      await Effect.runPromise(resource.flush({ deadlineMonotonicMilliseconds: 1_000 }))
    ).toEqual({ outcome: "flushed", diagnostics: [] });
  });
});

describe("enabled OpenTelemetry Node provider", () => {
  test("derives one closed serializable topology configuration from TypeBox", () => {
    const candidate = enabledConfig("http://127.0.0.1:4318");

    expect([enabledConfigComesFromTypeBox, selectedConfigComesFromTypeBox]).toEqual([true, true]);
    expect(enabledConfigValidator.Check(candidate)).toBe(true);
    expect(selectedConfigValidator.Check(candidate)).toBe(true);
    expect(enabledConfigValidator.Check({ ...candidate, client: {} })).toBe(false);
    expect(
      enabledConfigValidator.Check({
        ...candidate,
        traces: { ...candidate.traces, url: "file:///tmp/traces" },
      })
    ).toBe(true);
    expect(
      enabledConfigValidator.Check({
        ...candidate,
        metricExportIntervalMilliseconds: 1_000,
        metrics: { ...candidate.metrics, timeoutMilliseconds: 2_000 },
      })
    ).toBe(false);
  });

  test.serial("registers one native provider topology and exports all three signals", async () => {
    const requests: string[] = [];
    const receiver = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        requests.push(new URL(request.url).pathname);
        await request.arrayBuffer();
        return new Response(null, { status: 200 });
      },
    });
    const tracerRegistration = spyOn(trace, "setGlobalTracerProvider");
    const meterRegistration = spyOn(metrics, "setGlobalMeterProvider");
    const loggerRegistration = spyOn(logs, "setGlobalLoggerProvider");
    const contextRegistration = spyOn(context, "setGlobalContextManager");
    const propagatorRegistration = spyOn(propagation, "setGlobalPropagator");
    const processOnce = spyOn(process, "once");
    const inngestClient = new Inngest({ id: "telemetry-provider-test", isDev: true });
    const procedure = os.handler(() => undefined);

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const lease = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
              inngestClient,
            });
            expect(lease.telemetry.availability).toBe("available");

            const wrap = lease.effectContext["effect/wrap"];
            if (wrap === undefined)
              throw new Error("Enabled provider did not expose Effect tracing");
            yield* wrap(Effect.void.pipe(Effect.withSpan("telemetry.provider.effect")), {
              path: ["telemetry", "provider"],
              procedure,
            });
            metrics
              .getMeter("telemetry-provider-test")
              .createCounter("telemetry.provider.test")
              .add(1, { "test.signal": "metrics" });
            yield* lease.telemetry.emitTechnicalLog({
              severity: "info",
              eventName: "telemetry.provider.test",
              message: "provider topology test",
              attributes: { "test.signal": "logs" },
            });
            const result = yield* lease.telemetry.flush({
              deadlineMonotonicMilliseconds: performance.now() + 5_000,
            });
            expect(result.outcome).toBe("flushed");
            const shutdown = yield* lease.shutdown({
              deadlineMonotonicMilliseconds: performance.now() + 5_000,
            });
            expect(shutdown.outcome).toBe("flushed");
          })
        )
      );

      expect(tracerRegistration).toHaveBeenCalledTimes(1);
      expect(meterRegistration).toHaveBeenCalledTimes(1);
      expect(loggerRegistration).toHaveBeenCalledTimes(1);
      expect(contextRegistration).toHaveBeenCalledTimes(1);
      expect(propagatorRegistration).toHaveBeenCalledTimes(1);
      expect(propagation.fields().sort()).toEqual([]);
      expect(processOnce).not.toHaveBeenCalled();
      expect(requests).toContain("/v1/traces");
      expect(requests).toContain("/v1/metrics");
      expect(requests).toContain("/v1/logs");
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("contains partial provider construction failure as a degraded value", async () => {
    const tracerRegistration = spyOn(trace, "setGlobalTracerProvider").mockImplementation(() => {
      throw new Error("controlled registration failure");
    });
    const diagnostics: string[] = [];
    const instrumentationDisable = spyOn(ORPCInstrumentation.prototype, "disable");
    const lease = await Effect.runPromise(
      Effect.scoped(
        acquireOpenTelemetryNode({
          config: enabledConfig("http://127.0.0.1:4318"),
          reportDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
        })
      )
    );

    expect(tracerRegistration).toHaveBeenCalledTimes(1);
    expect(instrumentationDisable).toHaveBeenCalledTimes(1);
    expect(lease.telemetry.availability).toBe("degraded");
    expect(diagnostics).toEqual(["PROVIDER_CONSTRUCTION_FAILED"]);
    expect(await Effect.runPromise(lease.telemetry.readDiagnostics())).toEqual([
      expect.objectContaining({ code: "PROVIDER_CONSTRUCTION_FAILED" }),
    ]);
  });

  test.serial("bounds cleanup after a late provider-construction failure", async () => {
    spyOn(AsyncLocalStorageContextManager.prototype, "enable").mockImplementation(() => {
      throw new Error("controlled late construction failure");
    });
    spyOn(BatchSpanProcessor.prototype, "shutdown").mockImplementation(
      () => new Promise<void>(() => {})
    );
    const metricShutdown = spyOn(MeterProvider.prototype, "shutdown");
    const metricReaderShutdown = spyOn(PeriodicExportingMetricReader.prototype, "shutdown");
    const logProcessorShutdown = spyOn(BatchLogRecordProcessor.prototype, "shutdown");
    const config = Object.freeze({
      ...enabledConfig("http://127.0.0.1:4318"),
      shutdownFallbackMilliseconds: 100,
    });

    const lease = await Promise.race([
      Effect.runPromise(Effect.scoped(acquireOpenTelemetryNode({ config }))),
      Bun.sleep(500).then(() => {
        throw new Error("construction cleanup exceeded its fallback deadline");
      }),
    ]);

    expect(lease.telemetry.availability).toBe("degraded");
    expect(metricShutdown).not.toHaveBeenCalled();
    expect(metricReaderShutdown).toHaveBeenCalledTimes(1);
    expect(logProcessorShutdown).toHaveBeenCalledTimes(1);
  });

  test.serial("does not release a global slot whose registration was rejected", async () => {
    const tracerRegistration = spyOn(trace, "setGlobalTracerProvider").mockImplementation(
      () => false
    );
    const tracerRelease = spyOn(trace, "disable");
    const instrumentationDisable = spyOn(ORPCInstrumentation.prototype, "disable");
    const diagnostics: string[] = [];

    const lease = await Effect.runPromise(
      Effect.scoped(
        acquireOpenTelemetryNode({
          config: enabledConfig("http://127.0.0.1:4318"),
          reportDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
        })
      )
    );

    expect(tracerRegistration).toHaveBeenCalledTimes(1);
    expect(tracerRelease).not.toHaveBeenCalled();
    expect(instrumentationDisable).toHaveBeenCalledTimes(1);
    expect(lease.telemetry.availability).toBe("degraded");
    expect(diagnostics).toEqual(["GLOBAL_TELEMETRY_OWNER_PRESENT"]);
  });

  test.serial("rejects a second active acquisition without touching the first owner", async () => {
    const receiver = testReceiver();
    const tracerRegistration = spyOn(trace, "setGlobalTracerProvider");
    const meterRegistration = spyOn(metrics, "setGlobalMeterProvider");
    const loggerRegistration = spyOn(logs, "setGlobalLoggerProvider");

    try {
      const availability = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const first = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            const second = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            return [first.telemetry.availability, second.telemetry.availability];
          })
        )
      );

      expect(availability).toEqual(["available", "degraded"]);
      expect(tracerRegistration).toHaveBeenCalledTimes(1);
      expect(meterRegistration).toHaveBeenCalledTimes(1);
      expect(loggerRegistration).toHaveBeenCalledTimes(1);
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("keeps the first acquisition claim after a nested duplicate closes", async () => {
    const receiver = testReceiver();
    const contextRegistration = spyOn(context, "setGlobalContextManager");
    const secondDiagnostics: string[] = [];
    const thirdDiagnostics: string[] = [];

    try {
      const availability = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const first = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            const second = yield* Effect.scoped(
              acquireOpenTelemetryNode({
                config: enabledConfig(receiver.url.origin),
                reportDiagnostic: (diagnostic) => secondDiagnostics.push(diagnostic.code),
              })
            );
            const third = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
              reportDiagnostic: (diagnostic) => thirdDiagnostics.push(diagnostic.code),
            });
            return [
              first.telemetry.availability,
              second.telemetry.availability,
              third.telemetry.availability,
            ];
          })
        )
      );

      expect(availability).toEqual(["available", "degraded", "degraded"]);
      expect(secondDiagnostics).toEqual(["PROVIDER_ALREADY_ACQUIRED"]);
      expect(thirdDiagnostics).toEqual(["PROVIDER_ALREADY_ACQUIRED"]);
      expect(contextRegistration).toHaveBeenCalledTimes(1);
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("allowlists records and preserves provider-owned classification", async () => {
    const receiver = testReceiver();
    const records: LogRecord[] = [];
    const logger: Logger = { emit: (record) => records.push(record) };
    spyOn(logs, "getLogger").mockReturnValue(logger);

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const lease = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            const operation = yield* lease.telemetry.beginNativeOperation({
              surface: "oclif",
              kind: "command",
              operation: "agent.plugins.sync",
              operationId: "operation-1",
              attributes: {
                "record.kind": "forged",
                "service.name": "forged",
                token: "secret",
                "test.signal": "native",
              },
            });
            yield* operation.enrich({
              attributes: {
                "operation.outcome": "forged",
                "request.id": "request-1",
              },
            });
            yield* operation.finish({
              outcome: "succeeded",
              attributes: { "test.fixture": "operation" },
            });
            yield* operation.finish({ outcome: "failed", attributes: {} });
            yield* lease.telemetry.emitTechnicalLog({
              severity: "info",
              eventName: "provider.technical",
              message: "technical record",
              attributes: { token: "secret", "test.signal": "technical" },
            });
            yield* Effect.promise(() =>
              lease.evlogDrain({
                event: {
                  timestamp: new Date(0).toISOString(),
                  level: "info",
                  service: "rawr-hq",
                  environment: "test",
                  rpc: { method: "vendors.update" },
                  result: "updated",
                  token: "secret",
                  api_key: "secret",
                  "x-api-key": "secret",
                  oversized: "x".repeat(1_025),
                  nested: { value: "not-flat" },
                  unlisted: "not-allowed",
                  "record.kind": "forged",
                  operation: {
                    id: "operation-2",
                    name: "vendors.update",
                    outcome: "succeeded",
                  },
                },
                request: { requestId: "request-2" },
              })
            );
          })
        )
      );

      expect(records).toHaveLength(3);
      expect(records[0]?.attributes).toMatchObject({
        "record.kind": "product-event",
        "operation.outcome": "succeeded",
        "request.id": "request-1",
        "test.fixture": "operation",
        "test.signal": "native",
      });
      expect(records[0]?.attributes).not.toHaveProperty("service.name");
      expect(records[0]?.attributes).not.toHaveProperty("token");
      expect(records[1]?.attributes).toMatchObject({
        "record.kind": "technical-log",
        "test.fixture": "provider",
        "test.signal": "technical",
      });
      expect(records[1]?.attributes).not.toHaveProperty("token");
      expect(records[2]?.attributes).toMatchObject({
        "record.kind": "product-event",
        "operation.surface": "orpc",
        "operation.id": "operation-2",
        "operation.name": "vendors.update",
        "operation.outcome": "succeeded",
        "request.id": "request-2",
        "rpc.method": "vendors.update",
      });
      expect(records[2]?.attributes).not.toHaveProperty("token");
      expect(records[2]?.attributes).not.toHaveProperty("api_key");
      expect(records[2]?.attributes).not.toHaveProperty("x-api-key");
      expect(records[2]?.attributes).not.toHaveProperty("oversized");
      expect(records[2]?.attributes).not.toHaveProperty("nested");
      expect(records[2]?.attributes).not.toHaveProperty("unlisted");
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("reserves bounded record space for provider-owned classification", async () => {
    const receiver = testReceiver();
    const records: LogRecord[] = [];
    spyOn(logs, "getLogger").mockReturnValue({ emit: (record) => records.push(record) });
    const exportedAttributePaths = Object.freeze(
      Array.from({ length: 32 }, (_value, index) => `test.key${index}`)
    );
    const defaultAttributes: Record<string, string> = {};
    for (const path of exportedAttributePaths.slice(0, 26)) defaultAttributes[path] = "old";
    const attributes: Record<string, string> = { "test.key0": "new" };
    for (const path of exportedAttributePaths.slice(26)) attributes[path] = path;

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const lease = yield* acquireOpenTelemetryNode({
              config: Object.freeze({
                ...enabledConfig(receiver.url.origin),
                defaultAttributes: Object.freeze(defaultAttributes),
                exportedAttributePaths,
              }),
            });
            const operation = yield* lease.telemetry.beginNativeOperation({
              surface: "oclif",
              kind: "command",
              operation: "agent.plugins.sync",
              operationId: "operation-wide",
              attributes,
            });
            yield* operation.finish({ outcome: "succeeded", attributes: {} });
          })
        )
      );

      expect(Object.keys(records[0]?.attributes ?? {})).toHaveLength(32);
      expect(records[0]?.attributes).toMatchObject({
        "record.kind": "product-event",
        "operation.id": "operation-wide",
        "operation.name": "agent.plugins.sync",
        "operation.outcome": "succeeded",
        "test.key0": "new",
      });
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("contains native event emission failure at the provider boundary", async () => {
    const receiver = testReceiver();
    spyOn(logs, "getLogger").mockReturnValue({
      emit: () => {
        throw new Error("controlled logger failure");
      },
    });

    try {
      const diagnostics = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const lease = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            const operation = yield* lease.telemetry.beginNativeOperation({
              surface: "oclif",
              kind: "command",
              operation: "agent.plugins.sync",
              operationId: "operation-failed-log",
              attributes: {},
            });
            yield* operation.finish({ outcome: "succeeded", attributes: {} });
            return yield* lease.telemetry.readDiagnostics();
          })
        )
      );

      expect(diagnostics).toEqual([
        expect.objectContaining({ code: "NATIVE_OPERATION_EMIT_FAILED" }),
      ]);
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial("keeps exporter refusal outside product and flush completion", async () => {
    let requests = 0;
    const receiver = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        requests += 1;
        await request.arrayBuffer();
        return new Response(null, { status: 503 });
      },
    });

    try {
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const lease = yield* acquireOpenTelemetryNode({
              config: enabledConfig(receiver.url.origin),
            });
            yield* lease.telemetry.emitTechnicalLog({
              severity: "info",
              eventName: "product.completed",
              message: "product outcome remains complete",
              attributes: { "test.signal": "logs" },
            });
            return yield* lease.telemetry.flush({
              deadlineMonotonicMilliseconds: performance.now() + 5_000,
            });
          })
        )
      );

      expect(result.outcome).toBe("flushed");
      expect(requests).toBeGreaterThan(0);
    } finally {
      await receiver.stop(true);
    }
  });

  test.serial(
    "starts every provider shutdown when the shared deadline is already spent",
    async () => {
      const receiver = testReceiver();
      const traceShutdown = spyOn(NodeTracerProvider.prototype, "shutdown");
      const metricShutdown = spyOn(MeterProvider.prototype, "shutdown");
      const logShutdown = spyOn(LoggerProvider.prototype, "shutdown");

      try {
        const outcome = await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const lease = yield* acquireOpenTelemetryNode({
                config: enabledConfig(receiver.url.origin),
              });
              const result = yield* lease.shutdown({
                deadlineMonotonicMilliseconds: performance.now() - 1,
              });
              yield* Effect.promise(() => Bun.sleep(0));
              return result.outcome;
            })
          )
        );

        expect(outcome).toBe("deadline-exceeded");
        expect(traceShutdown).toHaveBeenCalledTimes(1);
        expect(metricShutdown).toHaveBeenCalledTimes(1);
        expect(logShutdown).toHaveBeenCalledTimes(1);
      } finally {
        await receiver.stop(true);
      }
    }
  );
});

function enabledConfig(origin: string): EnabledOpenTelemetryNodeConfig {
  return Object.freeze({
    enabled: true,
    processIdentity: Object.freeze({
      serviceName: "rawr-hq",
      serviceVersion: "0.1.0",
      deploymentEnvironment: "test",
      processRole: "provider-test",
      processInstanceId: "provider-test-1",
    }),
    defaultAttributes: Object.freeze({ "test.fixture": "provider" }),
    exportedAttributePaths: Object.freeze([
      "request.id",
      "record.kind",
      "result",
      "rpc.method",
      "service.name",
      "test.fixture",
      "test.signal",
      "token",
      "operation.outcome",
      "operation.id",
      "operation.name",
      "api_key",
      "x-api-key",
      "oversized",
      "nested",
    ]),
    traces: endpoint(`${origin}/v1/traces`),
    metrics: endpoint(`${origin}/v1/metrics`),
    logs: endpoint(`${origin}/v1/logs`),
    metricExportIntervalMilliseconds: 60_000,
    shutdownFallbackMilliseconds: 5_000,
  });
}

function testReceiver(): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      await request.arrayBuffer();
      return new Response(null, { status: 200 });
    },
  });
}

function endpoint(url: string): EnabledOpenTelemetryNodeConfig["traces"] {
  return Object.freeze({
    url,
    headers: Object.freeze({}),
    timeoutMilliseconds: 2_000,
  });
}
