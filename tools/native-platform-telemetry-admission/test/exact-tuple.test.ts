import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createRequire } from "node:module";
import { OtelTracer, Resource } from "@effect/opentelemetry";
import {
  context,
  metrics,
  propagation,
  ROOT_CONTEXT,
  type SpanContext,
  TraceFlags,
  type TracerProvider,
  trace,
} from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { EvlogHandlerPlugin, getLogger, type LoggerContext } from "@orpc/evlog";
import { handlerGen, type WithEffectContext } from "@orpc/experimental-effect";
import { ORPCInstrumentation } from "@orpc/opentelemetry";
import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { Effect, Context as EffectContext, Layer } from "effect";
import { type DrainContext, initLogger, type WideEvent } from "evlog";
import { Inngest } from "inngest";
import { serve } from "inngest/bun";
import { InngestSpanProcessor } from "inngest/experimental";
import { Type } from "typebox";
import { Value } from "typebox/value";

const require = createRequire(import.meta.url);
const requireFromInngest = createRequire(require.resolve("inngest"));

const EXACT_RUNTIME_TUPLE = {
  "@effect/opentelemetry": "4.0.0-beta.101",
  "@opentelemetry/api": "1.9.0",
  "@opentelemetry/api-logs": "0.213.0",
  "@opentelemetry/core": "2.6.0",
  "@opentelemetry/exporter-logs-otlp-http": "0.213.0",
  "@opentelemetry/exporter-metrics-otlp-http": "0.213.0",
  "@opentelemetry/exporter-trace-otlp-http": "0.213.0",
  "@opentelemetry/instrumentation": "0.213.0",
  "@opentelemetry/resources": "2.6.0",
  "@opentelemetry/sdk-logs": "0.213.0",
  "@opentelemetry/sdk-metrics": "2.6.0",
  "@opentelemetry/sdk-node": "0.213.0",
  "@opentelemetry/sdk-trace-base": "2.6.0",
  "@opentelemetry/sdk-trace-node": "2.6.0",
  "@opentelemetry/semantic-conventions": "1.40.0",
  "@orpc/client": "2.0.0-beta.23",
  "@orpc/contract": "2.0.0-beta.23",
  "@orpc/evlog": "2.0.0-beta.23",
  "@orpc/experimental-effect": "2.0.0-beta.23",
  "@orpc/json-schema": "2.0.0-beta.23",
  "@orpc/openapi": "2.0.0-beta.23",
  "@orpc/opentelemetry": "2.0.0-beta.23",
  "@orpc/server": "2.0.0-beta.23",
  effect: "4.0.0-beta.101",
  evlog: "2.24.0",
  inngest: "3.51.0",
} as const;

const INNGEST_OTEL_TUPLE = {
  "@opentelemetry/exporter-trace-otlp-http": "0.211.0",
  "@opentelemetry/resources": "2.5.0",
  "@opentelemetry/sdk-trace-base": "2.5.0",
} as const;

const OtlpAttributeSchema = Type.Object(
  {
    key: Type.String({ description: "OpenTelemetry attribute key." }),
    value: Type.Object(
      {
        stringValue: Type.Optional(
          Type.String({ description: "String-valued OpenTelemetry attribute payload." })
        ),
      },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

const OtlpSpanSchema = Type.Object(
  {
    traceId: Type.String({ description: "Hexadecimal OpenTelemetry trace identity." }),
    spanId: Type.String({ description: "Hexadecimal OpenTelemetry span identity." }),
    parentSpanId: Type.String({ description: "Hexadecimal parent span identity." }),
    name: Type.String({ description: "Exported span operation name." }),
    attributes: Type.Array(OtlpAttributeSchema, {
      description: "Attributes exported with the span.",
    }),
  },
  { additionalProperties: true }
);

const OtlpExportSchema = Type.Object(
  {
    resourceSpans: Type.Array(
      Type.Object(
        {
          scopeSpans: Type.Array(
            Type.Object(
              {
                scope: Type.Object(
                  {
                    name: Type.String({ description: "Instrumentation scope name." }),
                    version: Type.String({ description: "Instrumentation scope version." }),
                  },
                  { additionalProperties: true }
                ),
                spans: Type.Array(OtlpSpanSchema, {
                  description: "Spans emitted by this instrumentation scope.",
                }),
              },
              { additionalProperties: true }
            ),
            { description: "Instrumentation scopes included in this resource batch." }
          ),
        },
        { additionalProperties: true }
      ),
      { description: "Resource batches in the OTLP trace request." }
    ),
  },
  { additionalProperties: true }
);

const RECEIPT_ID = "receipt-native-telemetry-001";
const SECRET = "do-not-export-this-secret";
const REDACTED = "[REDACTED]";
const TIMEOUT_MS = 10_000;

const RPC_REMOTE_REQUESTS = {
  unaryMatched: {
    requestId: "rpc-unary-matched",
    traceId: "11111111111111111111111111111111",
    parentSpanId: "aaaaaaaaaaaaaaaa",
  },
  unaryUnmatched: {
    requestId: "rpc-unary-unmatched",
    traceId: "22222222222222222222222222222222",
    parentSpanId: "bbbbbbbbbbbbbbbb",
  },
  batch: {
    requestId: "rpc-batch",
    traceId: "33333333333333333333333333333333",
    parentSpanId: "cccccccccccccccc",
  },
} as const;

const INNGEST_REMOTE = {
  traceId: "44444444444444444444444444444444",
  parentSpanId: "dddddddddddddddd",
  traceparent: "00-44444444444444444444444444444444-dddddddddddddddd-01",
} as const;

type TelemetryContext = LoggerContext & WithEffectContext<never>;

interface VersionedPackage {
  version: string;
}

function packageVersion(name: string): string {
  return (require(`${name}/package.json`) as VersionedPackage).version;
}

function inngestPackageVersion(name: string): string {
  return (requireFromInngest(`${name}/package.json`) as VersionedPackage).version;
}

function otlpStringAttribute(
  attributes: Array<{ key: string; value: { stringValue?: string } }>,
  key: string
): string | undefined {
  return attributes.find((attribute) => attribute.key === key)?.value.stringValue;
}

function remainingBudget(deadline: number, label: string): number {
  const remaining = Math.floor(deadline - performance.now());
  if (remaining <= 0) {
    throw new Error(`${label} exceeded the shared ${TIMEOUT_MS}ms deadline`);
  }

  return remaining;
}

async function bounded<T>(deadline: number, label: string, promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const remaining = remainingBudget(deadline, label);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} exceeded the shared ${TIMEOUT_MS}ms deadline`)),
      remaining
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function spanContextFromEvent(event: WideEvent): SpanContext {
  const traceId = event.traceId;
  const spanId = event.spanId;

  if (typeof traceId !== "string" || typeof spanId !== "string") {
    throw new Error("Product event is missing oRPC trace correlation");
  }

  return {
    traceId,
    spanId,
    traceFlags: TraceFlags.SAMPLED,
  };
}

function requestBody(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function rpcMethod(event: WideEvent): string | undefined {
  const rpc = event.rpc;
  if (typeof rpc !== "object" || rpc === null || !("method" in rpc)) {
    return undefined;
  }

  return typeof rpc.method === "string" ? rpc.method : undefined;
}

function requestIdFromEvent(event: WideEvent): string {
  if (typeof event.requestId !== "string") {
    throw new Error("Product event is missing its physical request ID");
  }

  return event.requestId;
}

function resolvedTracerProvider(provider: TracerProvider): TracerProvider {
  if ("getDelegate" in provider && typeof provider.getDelegate === "function") {
    return provider.getDelegate();
  }

  return provider;
}

afterEach(() => {
  mock.restore();
});

describe("native platform telemetry exact-tuple admission", () => {
  it.serial(
    "admits the pinned public APIs and one correlated runtime topology",
    async () => {
      const deadline = performance.now() + TIMEOUT_MS;

      expect(
        Object.fromEntries(
          Object.keys(EXACT_RUNTIME_TUPLE).map((name) => [name, packageVersion(name)])
        )
      ).toEqual(EXACT_RUNTIME_TUPLE);
      expect(
        Object.fromEntries(
          Object.keys(INNGEST_OTEL_TUPLE).map((name) => [name, inngestPackageVersion(name)])
        )
      ).toEqual(INNGEST_OTEL_TUPLE);

      const silentModeWarning = spyOn(console, "warn").mockImplementation(() => undefined);
      initLogger({ silent: true });
      silentModeWarning.mockRestore();

      const inngestOtlpRequests: Array<{
        method: string;
        path: string;
        contentType: string | null;
        body: Uint8Array;
      }> = [];
      const inngestOtlpReceiver = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        async fetch(request) {
          const url = new URL(request.url);
          inngestOtlpRequests.push({
            method: request.method,
            path: url.pathname,
            contentType: request.headers.get("content-type"),
            body: new Uint8Array(await request.arrayBuffer()),
          });

          return new Response(null, {
            status: url.pathname === "/v1/traces/userland" ? 200 : 404,
          });
        },
      });
      let sdk: NodeSDK | undefined;
      let sdkNeedsShutdown = false;
      let orpcInstrumentation: ORPCInstrumentation | undefined;
      const cleanupErrors: unknown[] = [];

      try {
        const spanExporter = new InMemorySpanExporter();
        const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
        const logExporter = new InMemoryLogRecordExporter();
        const spanProcessor = new SimpleSpanProcessor(spanExporter);
        const metricReader = new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 60_000,
        });
        const logProcessor = new SimpleLogRecordProcessor(logExporter);

        const inngestClient = new Inngest({
          id: "telemetry-admission",
          isDev: true,
          baseUrl: inngestOtlpReceiver.url.origin,
        });
        const inngestProcessor = new InngestSpanProcessor(inngestClient);
        const declareStartingSpan = spyOn(inngestProcessor, "declareStartingSpan");
        orpcInstrumentation = new ORPCInstrumentation({
          propagationEnabled: false,
        });
        const appResource = resourceFromAttributes({
          [ATTR_SERVICE_NAME]: "native-platform-telemetry-admission",
        });
        sdk = new NodeSDK({
          autoDetectResources: false,
          resource: appResource,
          spanProcessors: [spanProcessor, inngestProcessor],
          metricReaders: [metricReader],
          logRecordProcessors: [logProcessor],
          instrumentations: [orpcInstrumentation],
          textMapPropagator: new CompositePropagator({
            propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
          }),
        });

        const tracerProviderRegistration = spyOn(trace, "setGlobalTracerProvider");
        const meterProviderRegistration = spyOn(metrics, "setGlobalMeterProvider");
        const loggerProviderRegistration = spyOn(logs, "setGlobalLoggerProvider");
        const contextManagerRegistration = spyOn(context, "setGlobalContextManager");
        const propagatorRegistration = spyOn(propagation, "setGlobalPropagator");

        sdkNeedsShutdown = true;
        sdk.start();

        expect(tracerProviderRegistration).toHaveBeenCalledTimes(1);
        expect(meterProviderRegistration).toHaveBeenCalledTimes(1);
        expect(loggerProviderRegistration).toHaveBeenCalledTimes(1);
        expect(contextManagerRegistration).toHaveBeenCalledTimes(1);
        expect(propagatorRegistration).toHaveBeenCalledTimes(1);

        const registeredTracerProvider = tracerProviderRegistration.mock.calls[0]?.[0];
        const registeredMeterProvider = meterProviderRegistration.mock.calls[0]?.[0];
        const registeredLoggerProvider = loggerProviderRegistration.mock.calls[0]?.[0];
        const registeredContextManager = contextManagerRegistration.mock.calls[0]?.[0];
        const registeredPropagator = propagatorRegistration.mock.calls[0]?.[0];
        if (
          registeredTracerProvider === undefined ||
          registeredMeterProvider === undefined ||
          registeredLoggerProvider === undefined ||
          registeredContextManager === undefined ||
          registeredPropagator === undefined
        ) {
          throw new Error("NodeSDK did not expose the complete registered OTel topology");
        }

        expect(resolvedTracerProvider(trace.getTracerProvider())).toBe(registeredTracerProvider);
        expect(metrics.getMeterProvider()).toBe(registeredMeterProvider);
        expect(logs.getLoggerProvider()).toBe(registeredLoggerProvider);

        expect(context.active()).toBe(ROOT_CONTEXT);
        expect(propagation.fields().sort()).toEqual(["baggage", "traceparent", "tracestate"]);
        const globalExtract = spyOn(propagation, "extract");
        expect(orpcInstrumentation.getConfig()).toMatchObject({
          propagationEnabled: false,
        });

        const productEvents: DrainContext[] = [];
        const productLogger = logs.getLogger("telemetry-admission.product");

        const effectTelemetry = OtelTracer.layerGlobal.pipe(
          Layer.provide(
            Resource.layer({
              serviceName: "native-platform-telemetry-admission",
            })
          )
        );
        const effectContext: TelemetryContext = {
          "effect/context": EffectContext.empty(),
          "effect/wrap": (effect) => {
            const activeSpanContext = trace.getActiveSpan()?.spanContext();
            if (activeSpanContext === undefined) {
              throw new Error("Effect wrapper is outside its oRPC parent span");
            }

            return effect.pipe(
              OtelTracer.withSpanContext(activeSpanContext),
              Effect.provide(effectTelemetry)
            );
          },
        };

        const base = os.$context<TelemetryContext>();
        const observe = base.handler(
          handlerGen(function* ({ context: procedureContext }, input: unknown) {
            const activeSpan = trace.getActiveSpan()?.spanContext();
            const productLogger = getLogger(procedureContext);

            if (productLogger === undefined || activeSpan === undefined) {
              throw new Error("oRPC product logger is outside its active span");
            }

            productLogger.set({
              receiptId: RECEIPT_ID,
              secret: SECRET,
            });

            const emitTechnicalSignals =
              typeof input === "object" &&
              input !== null &&
              "emitTechnicalSignals" in input &&
              input.emitTechnicalSignals === true;

            return yield* Effect.sync(() => {
              if (!emitTechnicalSignals) {
                return { observed: true };
              }

              const effectSpan = trace.getActiveSpan()?.spanContext();
              if (effectSpan === undefined) {
                throw new Error("Effect span did not reach the OTel global provider");
              }

              logs.getLogger("telemetry-admission.technical").emit({
                body: "technical operation log",
                attributes: {
                  "record.kind": "technical-log",
                  "receipt.id": RECEIPT_ID,
                },
              });
              metrics
                .getMeter("telemetry-admission")
                .createCounter("telemetry.operation.attempts")
                .add(1, { "receipt.id": RECEIPT_ID });

              return {
                observed: true,
                effectTraceId: effectSpan.traceId,
                effectSpanId: effectSpan.spanId,
              };
            }).pipe(Effect.withSpan("fixture.effect.operation"));
          })
        );

        const rpcHandler = new RPCHandler(
          { observe },
          {
            plugins: [
              new EvlogHandlerPlugin<TelemetryContext>({
                redact: {
                  paths: ["secret"],
                  builtins: false,
                },
                enrich: ({ event }) => {
                  const activeSpan = trace.getActiveSpan()?.spanContext();
                  if (activeSpan === undefined) {
                    throw new Error("Finalized product event is outside its oRPC operation span");
                  }

                  event.receiptId ??= RECEIPT_ID;
                  event.traceId = activeSpan.traceId;
                  event.spanId = activeSpan.spanId;
                },
                drain: (drainContext) => {
                  const { event } = drainContext;
                  const eventSpanContext = spanContextFromEvent(event);
                  productEvents.push(drainContext);
                  productLogger.emit({
                    body: String(event.message ?? "oRPC operation"),
                    attributes: {
                      "record.kind": "product-event",
                      "receipt.id": String(event.receiptId),
                      "request.id": requestIdFromEvent(event),
                      "rpc.method": rpcMethod(event) ?? "unmatched",
                    },
                    context: trace.setSpanContext(ROOT_CONTEXT, eventSpanContext),
                  });
                },
              }),
              new BatchHandlerPlugin<TelemetryContext>(),
            ],
          }
        );

        const physicalRpcRequests: Array<{
          headers: Headers;
          body: unknown;
          remoteSpanContext: SpanContext;
        }> = [];
        const rpcFetch = async (
          input: string | URL | Request,
          init?: RequestInit
        ): Promise<Response> => {
          const request = new Request(input, init);
          const extractedContext = propagation.extract(ROOT_CONTEXT, request.headers, {
            get: (carrier, key) => carrier.get(key) ?? undefined,
            keys: (carrier) => {
              const keys: string[] = [];
              carrier.forEach((_value, key) => keys.push(key));
              return keys;
            },
          });
          const remoteSpanContext = trace.getSpanContext(extractedContext);
          if (remoteSpanContext === undefined) {
            throw new Error("RPC edge did not extract its W3C remote parent");
          }

          physicalRpcRequests.push({
            headers: request.headers,
            body: requestBody(init),
            remoteSpanContext,
          });
          return context.with(extractedContext, async () => {
            const handled = await rpcHandler.handle(request, {
              prefix: "/rpc",
              context: effectContext,
            });
            return handled.matched ? handled.response : new Response("Not found", { status: 404 });
          });
        };

        const unaryLink = new RPCLink({
          origin: "http://telemetry.test",
          url: "/rpc",
          fetch: rpcFetch,
          headers: (_options, path) => {
            const remote =
              path[0] === "observe"
                ? RPC_REMOTE_REQUESTS.unaryMatched
                : RPC_REMOTE_REQUESTS.unaryUnmatched;
            return {
              "x-request-id": remote.requestId,
              traceparent: `00-${remote.traceId}-${remote.parentSpanId}-01`,
            };
          },
        });
        const unaryResult = await bounded(
          deadline,
          "matched unary RPC",
          unaryLink.call(["observe"], { emitTechnicalSignals: true }, { context: {} })
        );
        expect(unaryResult).toMatchObject({ observed: true });
        await expect(
          bounded(deadline, "unmatched unary RPC", unaryLink.call(["missing"], {}, { context: {} }))
        ).rejects.toBeInstanceOf(ORPCError);

        const batchLink = new RPCLink({
          origin: "http://telemetry.test",
          url: "/rpc",
          fetch: rpcFetch,
          headers: {
            "x-request-id": RPC_REMOTE_REQUESTS.batch.requestId,
            traceparent: `00-${RPC_REMOTE_REQUESTS.batch.traceId}-${RPC_REMOTE_REQUESTS.batch.parentSpanId}-01`,
          },
          plugins: [
            new BatchLinkPlugin({
              groups: [{ condition: true, context: {}, path: [] }],
              mode: "buffered",
            }),
          ],
        });
        const batchResults = await bounded(
          deadline,
          "batched RPC",
          Promise.allSettled([
            batchLink.call(["observe"], { emitTechnicalSignals: false }, { context: {} }),
            batchLink.call(["missing"], {}, { context: {} }),
          ])
        );
        expect(batchResults.map(({ status }) => status)).toEqual(["fulfilled", "rejected"]);

        expect(physicalRpcRequests).toHaveLength(3);
        expect(physicalRpcRequests[2]?.headers.get("orpc-batch")).toBe("buffered");
        expect(Array.isArray(physicalRpcRequests[2]?.body)).toBe(true);
        expect(globalExtract).toHaveBeenCalledTimes(3);
        expect(
          physicalRpcRequests.map(({ headers, remoteSpanContext }) => ({
            requestId: headers.get("x-request-id"),
            traceId: remoteSpanContext.traceId,
            parentSpanId: remoteSpanContext.spanId,
            isRemote: remoteSpanContext.isRemote,
          }))
        ).toEqual(
          Object.values(RPC_REMOTE_REQUESTS).map(({ requestId, traceId, parentSpanId }) => ({
            requestId,
            traceId,
            parentSpanId,
            isRemote: true,
          }))
        );
        expect(productEvents).toHaveLength(4);
        const unaryMatchedEvents = productEvents.filter(
          ({ event }) => requestIdFromEvent(event) === RPC_REMOTE_REQUESTS.unaryMatched.requestId
        );
        const unaryUnmatchedEvents = productEvents.filter(
          ({ event }) => requestIdFromEvent(event) === RPC_REMOTE_REQUESTS.unaryUnmatched.requestId
        );
        const batchEvents = productEvents.filter(
          ({ event }) => requestIdFromEvent(event) === RPC_REMOTE_REQUESTS.batch.requestId
        );
        expect(unaryMatchedEvents).toHaveLength(1);
        expect(
          unaryMatchedEvents.filter(({ event }) => rpcMethod(event) === "observe")
        ).toHaveLength(1);
        expect(unaryUnmatchedEvents).toHaveLength(1);
        expect(
          unaryUnmatchedEvents.filter(({ event }) => event.message === "No procedure matched")
        ).toHaveLength(1);
        expect(batchEvents).toHaveLength(2);
        expect(batchEvents.filter(({ event }) => rpcMethod(event) === "observe")).toHaveLength(1);
        expect(
          batchEvents.filter(({ event }) => event.message === "No procedure matched")
        ).toHaveLength(1);
        expect(productEvents.filter(({ event }) => event.secret === REDACTED)).toHaveLength(2);
        expect(productEvents.some(({ event }) => event.secret === SECRET)).toBe(false);
        expect(new Set(productEvents.map(({ event }) => event.receiptId))).toEqual(
          new Set([RECEIPT_ID])
        );

        let inngestExecutions = 0;
        const inngestFunction = inngestClient.createFunction(
          { id: "native-execution" },
          { event: "telemetry/native.execute" },
          async () => {
            inngestExecutions += 1;
            return { admitted: true };
          }
        );
        const inngestHandler = serve({
          client: inngestClient,
          functions: [inngestFunction],
          logLevel: "silent",
        });
        const event = {
          id: "event-native-platform-telemetry",
          name: "telemetry/native.execute",
          data: { receiptId: RECEIPT_ID },
          ts: Date.now(),
        };
        const inngestRequest = new Request(
          `http://telemetry.test/api/inngest?fnId=${encodeURIComponent(
            inngestFunction.id(inngestClient.id)
          )}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              host: "telemetry.test",
              traceparent: INNGEST_REMOTE.traceparent,
            },
            body: JSON.stringify({
              event,
              events: [event],
              steps: {},
              version: 1,
              ctx: {
                run_id: "run-native-platform-telemetry",
                attempt: 0,
                max_attempts: 1,
                disable_immediate_execution: false,
                use_api: false,
                stack: { stack: [], current: 0 },
              },
            }),
          }
        );
        const inngestRemoteContext = propagation.extract(ROOT_CONTEXT, inngestRequest.headers, {
          get: (carrier, key) => carrier.get(key) ?? undefined,
          keys: (carrier) => {
            const keys: string[] = [];
            carrier.forEach((_value, key) => keys.push(key));
            return keys;
          },
        });
        const inngestRemoteSpanContext = trace.getSpanContext(inngestRemoteContext);
        if (inngestRemoteSpanContext === undefined) {
          throw new Error("Inngest edge did not extract its W3C remote parent");
        }
        const inngestResponse = await bounded(
          deadline,
          "Inngest native execution",
          context.with(inngestRemoteContext, () => inngestHandler(inngestRequest))
        );
        expect(inngestResponse.status).toBe(200);
        expect(inngestExecutions).toBe(1);
        expect(globalExtract).toHaveBeenCalledTimes(4);
        expect(inngestRemoteSpanContext).toMatchObject({
          traceId: INNGEST_REMOTE.traceId,
          spanId: INNGEST_REMOTE.parentSpanId,
          isRemote: true,
        });
        expect(declareStartingSpan).toHaveBeenCalledTimes(1);
        expect(declareStartingSpan).toHaveBeenCalledWith(
          expect.objectContaining({
            runId: "run-native-platform-telemetry",
            traceparent: INNGEST_REMOTE.traceparent,
          })
        );

        await bounded(deadline, "Inngest OTLP force flush", inngestProcessor.forceFlush());
        expect(inngestOtlpRequests).toHaveLength(1);
        const inngestOtlpRequest = inngestOtlpRequests[0];
        expect(inngestOtlpRequest).toMatchObject({
          method: "POST",
          path: "/v1/traces/userland",
          contentType: "application/json",
        });
        expect(inngestOtlpRequest?.body.byteLength).toBeGreaterThan(0);
        const inngestOtlpExport = Value.Parse(
          OtlpExportSchema,
          JSON.parse(new TextDecoder().decode(inngestOtlpRequest?.body))
        );
        const inngestOtlpScopeSpans = inngestOtlpExport.resourceSpans.flatMap(
          ({ scopeSpans }) => scopeSpans
        );
        const inngestOtlpSpans = inngestOtlpScopeSpans
          .flatMap(({ scope, spans }) => spans.map((span) => ({ scope, span })))
          .filter(({ span }) => span.name === "inngest.execution");
        expect(inngestOtlpSpans).toHaveLength(1);
        const inngestOtlpSpan = inngestOtlpSpans[0];
        if (inngestOtlpSpan === undefined) {
          throw new Error("Inngest OTLP export did not contain its execution span");
        }
        expect(inngestOtlpSpan.scope).toMatchObject({
          name: "inngest",
          version: EXACT_RUNTIME_TUPLE.inngest,
        });
        expect(inngestOtlpSpan.span).toMatchObject({
          traceId: INNGEST_REMOTE.traceId,
          parentSpanId: INNGEST_REMOTE.parentSpanId,
          name: "inngest.execution",
        });
        expect(otlpStringAttribute(inngestOtlpSpan.span.attributes, "inngest.traceparent")).toBe(
          INNGEST_REMOTE.traceparent
        );
        expect(otlpStringAttribute(inngestOtlpSpan.span.attributes, "sdk.run.id")).toBe(
          "run-native-platform-telemetry"
        );

        await bounded(
          deadline,
          "telemetry provider flush",
          Promise.all([
            spanProcessor.forceFlush(),
            metricReader.forceFlush(),
            logProcessor.forceFlush(),
          ]).then(() => undefined)
        );

        const spans = spanExporter.getFinishedSpans();
        const exactlyOneSpan = (label: string, candidates: typeof spans) => {
          expect(candidates, label).toHaveLength(1);
          const candidate = candidates[0];
          if (candidate === undefined) {
            throw new Error(`${label} was not exported`);
          }

          return candidate;
        };
        const orpcSpans = spans.filter(
          ({ instrumentationScope }) => instrumentationScope.name === "@orpc/opentelemetry"
        );
        const effectSpans = spans.filter(({ name }) => name === "fixture.effect.operation");
        const spansByIdentity = new Map(
          spans.map((span) => [`${span.spanContext().traceId}:${span.spanContext().spanId}`, span])
        );
        const hasAncestor = (
          descendant: (typeof spans)[number],
          ancestor: (typeof spans)[number]
        ): boolean => {
          let parent = descendant.parentSpanContext;
          while (parent !== undefined) {
            if (
              parent.traceId === ancestor.spanContext().traceId &&
              parent.spanId === ancestor.spanContext().spanId
            ) {
              return true;
            }

            parent = spansByIdentity.get(`${parent.traceId}:${parent.spanId}`)?.parentSpanContext;
          }

          return false;
        };
        expect(effectSpans).toHaveLength(2);

        for (const [key, remote] of Object.entries(RPC_REMOTE_REQUESTS)) {
          const operationSpans = orpcSpans.filter(
            (span) =>
              span.spanContext().traceId === remote.traceId &&
              span.parentSpanContext?.spanId === remote.parentSpanId &&
              (span.name === "orpc.observe" || span.name === "orpc_no_match")
          );
          expect(operationSpans, `${key} remote operation roots`).toHaveLength(
            key === "batch" ? 2 : 1
          );
          expect(operationSpans.every(({ parentSpanContext }) => parentSpanContext?.isRemote)).toBe(
            true
          );
        }

        for (const remote of [RPC_REMOTE_REQUESTS.unaryMatched, RPC_REMOTE_REQUESTS.batch]) {
          const operationSpan = exactlyOneSpan(
            `${remote.requestId} matched oRPC operation`,
            orpcSpans.filter(
              (span) =>
                span.name === "orpc.observe" &&
                span.spanContext().traceId === remote.traceId &&
                span.parentSpanContext?.spanId === remote.parentSpanId
            )
          );
          const effectSpan = exactlyOneSpan(
            `${remote.requestId} Effect operation`,
            effectSpans.filter((span) => span.spanContext().traceId === remote.traceId)
          );
          expect(hasAncestor(effectSpan, operationSpan)).toBe(true);
        }

        const inngestSpan = exactlyOneSpan(
          "native Inngest execution",
          spans.filter(({ name }) => name === "inngest.execution")
        );
        expect(inngestSpan.spanContext().traceId).toBe(INNGEST_REMOTE.traceId);
        expect(inngestSpan.parentSpanContext).toMatchObject({
          traceId: INNGEST_REMOTE.traceId,
          spanId: INNGEST_REMOTE.parentSpanId,
          isRemote: true,
        });
        expect(inngestSpan.attributes).toMatchObject({
          "inngest.traceparent": INNGEST_REMOTE.traceparent,
          "sdk.run.id": "run-native-platform-telemetry",
        });
        const declaredInngestSpan = declareStartingSpan.mock.calls[0]?.[0]?.span;
        expect(declaredInngestSpan?.spanContext()).toEqual(inngestSpan.spanContext());
        expect(inngestOtlpSpan.span.spanId).toBe(inngestSpan.spanContext().spanId);

        const exportedLogs = logExporter.getFinishedLogRecords();
        const productLogs = exportedLogs.filter(
          ({ attributes }) => attributes["record.kind"] === "product-event"
        );
        const technicalLogs = exportedLogs.filter(
          ({ attributes }) => attributes["record.kind"] === "technical-log"
        );
        expect(productLogs).toHaveLength(4);
        expect(technicalLogs).toHaveLength(1);
        expect(productLogs.map(({ attributes }) => attributes["request.id"]).sort()).toEqual(
          [
            RPC_REMOTE_REQUESTS.unaryMatched.requestId,
            RPC_REMOTE_REQUESTS.unaryUnmatched.requestId,
            RPC_REMOTE_REQUESTS.batch.requestId,
            RPC_REMOTE_REQUESTS.batch.requestId,
          ].sort()
        );
        for (const { event } of productEvents) {
          const eventSpanContext = spanContextFromEvent(event);
          const eventRequestId = requestIdFromEvent(event);
          const eventMethod = rpcMethod(event) ?? "unmatched";
          const correlatedOrpcSpan = exactlyOneSpan(
            `${eventRequestId}/${eventMethod} product event correlation`,
            orpcSpans.filter(
              (span) =>
                span.spanContext().traceId === eventSpanContext.traceId &&
                span.spanContext().spanId === eventSpanContext.spanId
            )
          );
          expect(correlatedOrpcSpan.name).toBe(
            eventMethod === "observe" ? "orpc.observe" : "orpc_no_match"
          );

          const correlatedLogs = productLogs.filter(
            ({ attributes, spanContext }) =>
              attributes["receipt.id"] === RECEIPT_ID &&
              attributes["request.id"] === eventRequestId &&
              attributes["rpc.method"] === eventMethod &&
              spanContext?.traceId === eventSpanContext.traceId &&
              spanContext.spanId === eventSpanContext.spanId
          );
          expect(correlatedLogs, `${eventRequestId}/${eventMethod} product OTel log`).toHaveLength(
            1
          );
        }

        const unaryEffectSpan = exactlyOneSpan(
          "unary matched Effect operation",
          effectSpans.filter(
            (span) => span.spanContext().traceId === RPC_REMOTE_REQUESTS.unaryMatched.traceId
          )
        );
        expect(technicalLogs[0]?.attributes["receipt.id"]).toBe(RECEIPT_ID);
        expect(technicalLogs[0]?.spanContext?.traceId).toBe(unaryEffectSpan.spanContext().traceId);
        expect(technicalLogs[0]?.spanContext?.spanId).toBe(unaryEffectSpan.spanContext().spanId);

        const exportedMetrics = metricExporter
          .getMetrics()
          .flatMap(({ scopeMetrics }) => scopeMetrics)
          .flatMap(({ metrics: scopeMetricData }) => scopeMetricData);
        const operationMetric = exportedMetrics.find(
          ({ descriptor }) => descriptor.name === "telemetry.operation.attempts"
        );
        expect(operationMetric).toBeDefined();
        expect(operationMetric?.dataPoints).toHaveLength(1);
        expect(operationMetric?.dataPoints[0]?.attributes).toEqual({
          "receipt.id": RECEIPT_ID,
        });
      } finally {
        try {
          orpcInstrumentation?.disable();
        } catch (error) {
          cleanupErrors.push(error);
        }

        if (sdkNeedsShutdown && sdk !== undefined) {
          try {
            await bounded(deadline, "NodeSDK shutdown", sdk.shutdown());
          } catch (error) {
            cleanupErrors.push(error);
          }
        }

        for (const disable of [
          () => trace.disable(),
          () => metrics.disable(),
          () => logs.disable(),
          () => context.disable(),
          () => propagation.disable(),
        ]) {
          try {
            disable();
          } catch (error) {
            cleanupErrors.push(error);
          }
        }

        try {
          await bounded(
            deadline,
            "Inngest OTLP receiver stop",
            Promise.resolve(inngestOtlpReceiver.stop(true))
          );
        } catch (error) {
          cleanupErrors.push(error);
        }
      }

      expect(cleanupErrors).toEqual([]);
    },
    TIMEOUT_MS + 2_000
  );
});
