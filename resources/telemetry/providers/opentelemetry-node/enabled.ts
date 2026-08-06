import { Resource as EffectTelemetryResource, OtelTracer } from "@effect/opentelemetry";
import type {
  BeginNativeOperationInput,
  EmitTechnicalLogInput,
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryDiagnostic,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { MAX_TELEMETRY_DIAGNOSTICS } from "@habitat-ai/resource-telemetry";
import { context, metrics, propagation, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";
import { ORPCInstrumentation } from "@orpc/opentelemetry";
import { Effect, Context as EffectContext, Layer, type Scope } from "effect";
import type { Inngest } from "inngest";
import { InngestSpanProcessor } from "inngest/experimental";

import { constructionDiagnostic, makeDegradedOpenTelemetryNodeLease } from "./degraded.js";
import type { EnabledOpenTelemetryNodeConfig, OpenTelemetryNodeLease } from "./index.js";
import {
  containPartialConstruction,
  flushOwners,
  type GlobalOwnership,
  type LifecycleOwner,
  runBeforeDeadline,
  shutdownRuntime,
  type TelemetryRuntimeLifecycle,
} from "./lifecycle.js";
import {
  emitTechnicalLog,
  inertNativeOperationScope,
  makeEvlogDrain,
  makeNativeOperationScope,
  recordDiagnostic,
  selectFlatAttributes,
} from "./records.js";

interface EnabledRuntime extends TelemetryRuntimeLifecycle {
  readonly tracerProvider: NodeTracerProvider;
  readonly meterProvider: MeterProvider;
  readonly loggerProvider: LoggerProvider;
  readonly propagator: CompositePropagator;
  readonly instrumentation: ORPCInstrumentation;
}

interface AcquiredOpenTelemetryNodeLease {
  readonly lease: OpenTelemetryNodeLease;
  readonly ownsAcquisitionClaim: boolean;
}

let enabledAcquisitionClaimed = false;

/**
 * Acquires the exact OpenTelemetry Node topology and registers one scoped
 * finalizer. Construction or ownership failure returns a degraded value.
 */
export function acquireEnabledOpenTelemetryNode(
  config: EnabledOpenTelemetryNodeConfig,
  inngestClient?: Inngest.Like,
  reportDiagnostic?: (diagnostic: TelemetryDiagnostic) => void
): Effect.Effect<OpenTelemetryNodeLease, never, Scope.Scope> {
  return Effect.acquireRelease(
    Effect.promise(async () => {
      if (enabledAcquisitionClaimed) {
        return Object.freeze({
          lease: makeDegradedOpenTelemetryNodeLease(
            config,
            constructionDiagnostic("PROVIDER_ALREADY_ACQUIRED"),
            reportDiagnostic
          ),
          ownsAcquisitionClaim: false,
        });
      }
      enabledAcquisitionClaimed = true;
      const acquired: AcquiredOpenTelemetryNodeLease = Object.freeze({
        lease: await constructEnabledLease(config, inngestClient, reportDiagnostic),
        ownsAcquisitionClaim: true,
      });
      return acquired;
    }),
    (acquired) =>
      acquired.lease
        .shutdown({
          deadlineMonotonicMilliseconds: performance.now() + config.shutdownFallbackMilliseconds,
        })
        .pipe(
          Effect.ensuring(
            acquired.ownsAcquisitionClaim
              ? Effect.sync(() => (enabledAcquisitionClaimed = false))
              : Effect.void
          )
        )
  ).pipe(Effect.map((acquired) => acquired.lease));
}

async function constructEnabledLease(
  config: EnabledOpenTelemetryNodeConfig,
  inngestClient?: Inngest.Like,
  reportDiagnostic?: (diagnostic: TelemetryDiagnostic) => void
): Promise<OpenTelemetryNodeLease> {
  let runtime: EnabledRuntime | undefined;
  try {
    runtime = await constructRuntime(config, inngestClient);
    if (!registerRuntime(runtime)) {
      await containPartialConstruction(runtime, config.shutdownFallbackMilliseconds);
      return makeDegradedOpenTelemetryNodeLease(
        config,
        constructionDiagnostic("GLOBAL_TELEMETRY_OWNER_PRESENT"),
        reportDiagnostic
      );
    }
    return makeEnabledLease(config, runtime, reportDiagnostic);
  } catch {
    await containPartialConstruction(runtime, config.shutdownFallbackMilliseconds);
    return makeDegradedOpenTelemetryNodeLease(
      config,
      constructionDiagnostic("PROVIDER_CONSTRUCTION_FAILED"),
      reportDiagnostic
    );
  }
}

async function constructRuntime(
  config: EnabledOpenTelemetryNodeConfig,
  inngestClient?: Inngest.Like
): Promise<EnabledRuntime> {
  let spanProcessor: BatchSpanProcessor | undefined;
  let metricReader: PeriodicExportingMetricReader | undefined;
  let logProcessor: BatchLogRecordProcessor | undefined;
  let inngestProcessor: InngestSpanProcessor | undefined;
  let tracerProvider: NodeTracerProvider | undefined;
  let meterProvider: MeterProvider | undefined;
  let loggerProvider: LoggerProvider | undefined;
  let contextManager: AsyncLocalStorageContextManager | undefined;
  let instrumentation: ORPCInstrumentation | undefined;

  try {
    spanProcessor = new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: absoluteHttpUrl(config.traces.url),
        headers: config.traces.headers,
        timeoutMillis: config.traces.timeoutMilliseconds,
      }),
      { exportTimeoutMillis: config.traces.timeoutMilliseconds }
    );
    metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: absoluteHttpUrl(config.metrics.url),
        headers: config.metrics.headers,
        timeoutMillis: config.metrics.timeoutMilliseconds,
      }),
      exportIntervalMillis: config.metricExportIntervalMilliseconds,
      exportTimeoutMillis: config.metrics.timeoutMilliseconds,
    });
    logProcessor = new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: absoluteHttpUrl(config.logs.url),
        headers: config.logs.headers,
        timeoutMillis: config.logs.timeoutMilliseconds,
      }),
      { exportTimeoutMillis: config.logs.timeoutMilliseconds }
    );
    inngestProcessor =
      inngestClient === undefined ? undefined : new InngestSpanProcessor(inngestClient);
    contextManager = new AsyncLocalStorageContextManager().enable();
    const propagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });
    instrumentation = new ORPCInstrumentation({ propagationEnabled: false });
    const processIdentity = config.processIdentity;
    const configuredDefaults = selectFlatAttributes(
      config.exportedAttributePaths,
      config.defaultAttributes
    );
    const resource = resourceFromAttributes({
      ...configuredDefaults,
      [ATTR_SERVICE_NAME]: processIdentity.serviceName,
      ...(processIdentity.serviceVersion === undefined
        ? {}
        : { [ATTR_SERVICE_VERSION]: processIdentity.serviceVersion }),
      ...(processIdentity.deploymentEnvironment === undefined
        ? {}
        : { [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: processIdentity.deploymentEnvironment }),
      [ATTR_SERVICE_INSTANCE_ID]: processIdentity.processInstanceId,
      "habitat.process.role": processIdentity.processRole,
    });
    tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors:
        inngestProcessor === undefined ? [spanProcessor] : [spanProcessor, inngestProcessor],
    });
    meterProvider = new MeterProvider({ resource, readers: [metricReader] });
    loggerProvider = new LoggerProvider({ resource, processors: [logProcessor] });
    if (
      spanProcessor === undefined ||
      metricReader === undefined ||
      logProcessor === undefined ||
      tracerProvider === undefined ||
      meterProvider === undefined ||
      loggerProvider === undefined ||
      contextManager === undefined ||
      instrumentation === undefined
    ) {
      throw new Error("OpenTelemetry Node provider construction did not complete");
    }
    const activeSpanProcessor = spanProcessor;
    const activeMetricReader = metricReader;
    const activeLogProcessor = logProcessor;
    const activeTracerProvider = tracerProvider;
    const activeMeterProvider = meterProvider;
    const activeLoggerProvider = loggerProvider;
    const activeInstrumentation = instrumentation;
    const ownership: GlobalOwnership = {
      context: false,
      propagation: false,
      metrics: false,
      trace: false,
      logs: false,
    };
    const flushOwners: LifecycleOwner[] = [
      { code: "TRACE_FLUSH_FAILED", run: () => activeSpanProcessor.forceFlush() },
      { code: "METRIC_FLUSH_FAILED", run: () => activeMetricReader.forceFlush() },
      { code: "LOG_FLUSH_FAILED", run: () => activeLogProcessor.forceFlush() },
    ];
    if (inngestProcessor !== undefined) {
      flushOwners.push({
        code: "INNGEST_FLUSH_FAILED",
        run: () => inngestProcessor?.forceFlush() ?? Promise.resolve(),
      });
    }

    return {
      tracerProvider: activeTracerProvider,
      meterProvider: activeMeterProvider,
      loggerProvider: activeLoggerProvider,
      contextManager,
      propagator,
      instrumentation: activeInstrumentation,
      ownership,
      flushOwners: Object.freeze(flushOwners),
      shutdownOwners: Object.freeze([
        {
          code: "TRACE_SHUTDOWN_FAILED",
          run: () => activeTracerProvider.shutdown(),
        },
        {
          code: "METRIC_SHUTDOWN_FAILED",
          run: () => activeMeterProvider.shutdown(),
        },
        { code: "LOG_SHUTDOWN_FAILED", run: () => activeLoggerProvider.shutdown() },
      ]),
      unregisterInstrumentations: () => activeInstrumentation.disable(),
    };
  } catch (error) {
    try {
      instrumentation?.disable();
    } catch {
      // An unregistered instrumentation candidate owns no process state.
    }
    try {
      contextManager?.disable();
    } catch {
      // An unregistered context candidate owns no process state.
    }
    const cleanup: Promise<unknown>[] = [];
    appendConstructionCleanup(cleanup, () =>
      tracerProvider === undefined
        ? Promise.allSettled([
            spanProcessor?.shutdown() ?? Promise.resolve(),
            inngestProcessor?.shutdown() ?? Promise.resolve(),
          ])
        : tracerProvider.shutdown()
    );
    appendConstructionCleanup(cleanup, () =>
      meterProvider === undefined
        ? (metricReader?.shutdown() ?? Promise.resolve())
        : meterProvider.shutdown()
    );
    appendConstructionCleanup(cleanup, () =>
      loggerProvider === undefined
        ? (logProcessor?.shutdown() ?? Promise.resolve())
        : loggerProvider.shutdown()
    );
    await runBeforeDeadline(performance.now() + config.shutdownFallbackMilliseconds, async () => {
      await Promise.allSettled(cleanup);
    });
    throw error;
  }
}

function appendConstructionCleanup(
  cleanup: Promise<unknown>[],
  operation: () => Promise<unknown>
): void {
  try {
    cleanup.push(operation());
  } catch {
    // Construction failure remains contained even when cleanup cannot start.
  }
}

function registerRuntime(runtime: EnabledRuntime): boolean {
  runtime.ownership.context = context.setGlobalContextManager(runtime.contextManager);
  if (!runtime.ownership.context) return false;
  runtime.ownership.propagation = propagation.setGlobalPropagator(runtime.propagator);
  if (!runtime.ownership.propagation) return false;
  runtime.ownership.metrics = metrics.setGlobalMeterProvider(runtime.meterProvider);
  if (!runtime.ownership.metrics) return false;
  runtime.ownership.trace = trace.setGlobalTracerProvider(runtime.tracerProvider);
  if (!runtime.ownership.trace) return false;
  runtime.ownership.logs =
    logs.setGlobalLoggerProvider(runtime.loggerProvider) === runtime.loggerProvider;
  if (!runtime.ownership.logs) return false;
  runtime.unregisterInstrumentations = registerInstrumentations({
    instrumentations: [runtime.instrumentation],
    tracerProvider: runtime.tracerProvider,
    meterProvider: runtime.meterProvider,
    loggerProvider: runtime.loggerProvider,
  });
  return true;
}

function makeEnabledLease(
  config: EnabledOpenTelemetryNodeConfig,
  runtime: EnabledRuntime,
  reportDiagnostic?: (diagnostic: TelemetryDiagnostic) => void
): OpenTelemetryNodeLease {
  const diagnostics: TelemetryDiagnostic[] = [];
  let intakeOpen = true;
  let shutdownPromise: Promise<FlushTelemetryResult> | undefined;
  const logger = logs.getLogger("@habitat-ai/resource-telemetry");
  const configuredDefaults = selectFlatAttributes(
    config.exportedAttributePaths,
    config.defaultAttributes
  );
  const effectTelemetry = OtelTracer.layerGlobal.pipe(
    Layer.provide(
      EffectTelemetryResource.layer({
        serviceName: config.processIdentity.serviceName,
        serviceVersion: config.processIdentity.serviceVersion,
        attributes: {
          ...configuredDefaults,
          "service.instance.id": config.processIdentity.processInstanceId,
          "habitat.process.role": config.processIdentity.processRole,
        },
      })
    )
  );

  const retain = (diagnostic: TelemetryDiagnostic): void => {
    if (diagnostics.length < MAX_TELEMETRY_DIAGNOSTICS) diagnostics.push(diagnostic);
    try {
      reportDiagnostic?.(diagnostic);
    } catch {
      // A diagnostic sink is observational and cannot recurse into failure.
    }
  };

  const resource: TelemetryResource = Object.freeze({
    processIdentity: config.processIdentity,
    availability: "available",
    beginNativeOperation: (input: BeginNativeOperationInput) =>
      Effect.sync(() =>
        intakeOpen
          ? makeNativeOperationScope(
              input,
              configuredDefaults,
              config.exportedAttributePaths,
              logger,
              retain
            )
          : inertNativeOperationScope()
      ),
    emitTechnicalLog: (input: EmitTechnicalLogInput) =>
      Effect.sync(() => {
        if (!intakeOpen) return;
        try {
          emitTechnicalLog(logger, configuredDefaults, config.exportedAttributePaths, input);
        } catch {
          retain(recordDiagnostic("technical-log", "TECHNICAL_LOG_EMIT_FAILED"));
        }
      }),
    readDiagnostics: () => Effect.sync(() => Object.freeze([...diagnostics])),
    flush: (input: FlushTelemetryInput) =>
      Effect.promise(() => flushOwners(runtime.flushOwners, input, diagnostics, retain)),
  });

  const effectContext: OpenTelemetryNodeLease["effectContext"] = Object.freeze({
    "effect/context": EffectContext.empty(),
    "effect/wrap": <A, E>(effect: Effect.Effect<A, E>) => {
      const activeSpanContext = trace.getActiveSpan()?.spanContext();
      const continued =
        activeSpanContext === undefined
          ? effect
          : effect.pipe(OtelTracer.withSpanContext(activeSpanContext));
      return continued.pipe(Effect.provide(effectTelemetry));
    },
  });

  const shutdown = (input: FlushTelemetryInput): Effect.Effect<FlushTelemetryResult> =>
    Effect.promise(() => {
      shutdownPromise ??= shutdownRuntime(runtime, input, diagnostics, retain, () => {
        intakeOpen = false;
      }).catch(() => {
        retain(recordDiagnostic("shutdown", "PROVIDER_SHUTDOWN_FAILED"));
        return Object.freeze({
          outcome: "degraded",
          diagnostics: Object.freeze([...diagnostics]),
        });
      });
      return shutdownPromise;
    });

  return Object.freeze({
    telemetry: resource,
    effectContext,
    evlogDrain: makeEvlogDrain(
      logger,
      configuredDefaults,
      config.exportedAttributePaths,
      () => intakeOpen,
      retain
    ),
    shutdown,
  });
}

function absoluteHttpUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OTLP endpoints must use HTTP or HTTPS");
  }
  return url.toString();
}
