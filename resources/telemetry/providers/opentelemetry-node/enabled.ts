import type {
  EmitTechnicalLogInput,
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { context, metrics, propagation, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import {
  AggregationTemporalityPreference,
  OTLPMetricExporterBase,
} from "@opentelemetry/exporter-metrics-otlp-http";
import { CompressionAlgorithm, OTLPExporterBase } from "@opentelemetry/otlp-exporter-base";
import {
  createOtlpHttpExportDelegate,
  httpAgentFactoryFromOptions,
} from "@opentelemetry/otlp-exporter-base/node-http";
import {
  type IExportLogsServiceResponse,
  type IExportMetricsServiceResponse,
  type IExportTraceServiceResponse,
  JsonLogsSerializer,
  JsonMetricsSerializer,
  JsonTraceSerializer,
} from "@opentelemetry/otlp-transformer";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type LogRecordExporter,
  type ReadableLogRecord,
} from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
  type ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";
import { Effect } from "effect";

import { constructionDiagnostic, makeDegradedOpenTelemetryNodeLease } from "./degraded.js";
import { accountingExporters } from "./exporters.js";
import type { EnabledOpenTelemetryNodeConfig, OpenTelemetryNodeLease } from "./index.js";
import {
  containPartialConstruction,
  flushOwners,
  type GlobalOwnership,
  type LifecycleOwner,
  releaseRuntime,
  runBeforeDeadline,
  type TelemetryRuntimeLifecycle,
  unregisterOwnedGlobals,
} from "./lifecycle.js";
import {
  diagnosticsSnapshot,
  exportCallbackAccountingSnapshot,
  makeTelemetryRecordState,
  recordDiagnostic,
  retainDiagnostic,
  type TelemetryRecordState,
} from "./neutral.js";
import { emitTechnicalLog, selectFlatAttributes } from "./records.js";

const DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
const DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Number.POSITIVE_INFINITY;
const DEFAULT_SPAN_LINK_COUNT_LIMIT = 128;
const DEFAULT_SPAN_EVENT_COUNT_LIMIT = 128;
const DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = 128;
const DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT = 128;
const DEFAULT_BATCH_MAX_QUEUE_SIZE = 2_048;
const DEFAULT_BATCH_MAX_EXPORT_SIZE = 512;
const DEFAULT_BATCH_SCHEDULE_DELAY_MILLISECONDS = 5_000;
const DEFAULT_PROVIDER_FORCE_FLUSH_TIMEOUT_MILLISECONDS = 30_000;
const DEFAULT_OTLP_CONCURRENCY_LIMIT = 30;
const JSON_CONTENT_TYPE = "application/json";

/** Provider-private native exporter seam used only by focused conformance tests. */
export interface OpenTelemetryNodeExporterSet {
  readonly traces: SpanExporter;
  readonly metrics: PushMetricExporter;
  readonly logs: LogRecordExporter;
}

/** Provider-private factory used only to install native in-memory exporters in tests. */
export type OpenTelemetryNodeExporterFactory = (
  config: EnabledOpenTelemetryNodeConfig
) => OpenTelemetryNodeExporterSet;

/** Exact provider-owned OTLP HTTP configuration exposed only to focused provider tests. */
export interface OpenTelemetryNodeOtlpHttpConfiguration {
  readonly url: string;
  readonly headers: () => Promise<Record<string, string>>;
  readonly timeoutMillis: number;
  readonly concurrencyLimit: number;
  readonly compression: "none";
  readonly agentFactory: ReturnType<typeof httpAgentFactoryFromOptions>;
}

interface EnabledRuntime extends TelemetryRuntimeLifecycle {
  readonly tracerProvider: NodeTracerProvider;
  readonly meterProvider: MeterProvider;
  readonly loggerProvider: LoggerProvider;
  readonly propagator: CompositePropagator;
}

let enabledAcquisitionClaimed = false;

/** Acquires one enabled native topology or returns a degraded neutral lease. */
export async function acquireEnabledOpenTelemetryNode(
  config: EnabledOpenTelemetryNodeConfig,
  createExporters: OpenTelemetryNodeExporterFactory = makeOtlpExporters
): Promise<OpenTelemetryNodeLease> {
  if (enabledAcquisitionClaimed) {
    return makeDegradedOpenTelemetryNodeLease(
      config,
      constructionDiagnostic("PROVIDER_ALREADY_ACQUIRED")
    );
  }
  enabledAcquisitionClaimed = true;
  const releaseClaim = (): void => {
    enabledAcquisitionClaimed = false;
  };
  let runtime: EnabledRuntime | undefined;

  try {
    const state = makeTelemetryRecordState();
    runtime = await constructRuntime(config, state, createExporters);
    if (!registerRuntime(runtime)) {
      unregisterOwnedGlobals(runtime);
      await containPartialConstruction(runtime, config.constructionCleanupTimeoutMilliseconds);
      return makeDegradedOpenTelemetryNodeLease(
        config,
        constructionDiagnostic("GLOBAL_TELEMETRY_OWNER_PRESENT"),
        releaseClaim
      );
    }
    return makeEnabledLease(config, runtime, state, releaseClaim);
  } catch {
    await containPartialConstruction(runtime, config.constructionCleanupTimeoutMilliseconds);
    return makeDegradedOpenTelemetryNodeLease(
      config,
      constructionDiagnostic("PROVIDER_CONSTRUCTION_FAILED"),
      releaseClaim
    );
  }
}

async function constructRuntime(
  config: EnabledOpenTelemetryNodeConfig,
  state: TelemetryRecordState,
  createExporters: OpenTelemetryNodeExporterFactory
): Promise<EnabledRuntime> {
  let rawExporters: OpenTelemetryNodeExporterSet | undefined;
  let spanProcessor: BatchSpanProcessor | undefined;
  let metricReader: PeriodicExportingMetricReader | undefined;
  let logProcessor: BatchLogRecordProcessor | undefined;
  let tracerProvider: NodeTracerProvider | undefined;
  let meterProvider: MeterProvider | undefined;
  let loggerProvider: LoggerProvider | undefined;
  let contextManager: AsyncLocalStorageContextManager | undefined;

  try {
    rawExporters = createExporters(config);
    const exporters = accountingExporters(rawExporters, state);
    spanProcessor = new BatchSpanProcessor(exporters.traces, {
      exportTimeoutMillis: config.traces.timeoutMilliseconds,
      maxQueueSize: DEFAULT_BATCH_MAX_QUEUE_SIZE,
      maxExportBatchSize: DEFAULT_BATCH_MAX_EXPORT_SIZE,
      scheduledDelayMillis: DEFAULT_BATCH_SCHEDULE_DELAY_MILLISECONDS,
    });
    metricReader = new PeriodicExportingMetricReader({
      exporter: exporters.metrics,
      exportIntervalMillis: config.metricExportIntervalMilliseconds,
      exportTimeoutMillis: config.metrics.timeoutMilliseconds,
    });
    logProcessor = new BatchLogRecordProcessor(exporters.logs, {
      exportTimeoutMillis: config.logs.timeoutMilliseconds,
      maxQueueSize: DEFAULT_BATCH_MAX_QUEUE_SIZE,
      maxExportBatchSize: DEFAULT_BATCH_MAX_EXPORT_SIZE,
      scheduledDelayMillis: DEFAULT_BATCH_SCHEDULE_DELAY_MILLISECONDS,
    });

    const processIdentity = config.processIdentity;
    const defaults = selectFlatAttributes(config.exportedAttributePaths, config.defaultAttributes);
    const resource = resourceFromAttributes({
      ...defaults,
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
      sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
      forceFlushTimeoutMillis: DEFAULT_PROVIDER_FORCE_FLUSH_TIMEOUT_MILLISECONDS,
      generalLimits: {
        attributeCountLimit: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
        attributeValueLengthLimit: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
      },
      spanLimits: {
        attributeCountLimit: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
        attributeValueLengthLimit: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
        linkCountLimit: DEFAULT_SPAN_LINK_COUNT_LIMIT,
        eventCountLimit: DEFAULT_SPAN_EVENT_COUNT_LIMIT,
        attributePerEventCountLimit: DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
        attributePerLinkCountLimit: DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT,
      },
      spanProcessors: [spanProcessor],
    });
    meterProvider = new MeterProvider({ resource, readers: [metricReader] });
    loggerProvider = new LoggerProvider({
      resource,
      forceFlushTimeoutMillis: DEFAULT_PROVIDER_FORCE_FLUSH_TIMEOUT_MILLISECONDS,
      logRecordLimits: {
        attributeCountLimit: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
        attributeValueLengthLimit: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
      },
      processors: [logProcessor],
    });
    contextManager = new AsyncLocalStorageContextManager().enable();
    const propagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });
    const activeTracerProvider = tracerProvider;
    const activeMeterProvider = meterProvider;
    const activeLoggerProvider = loggerProvider;
    const activeContextManager = contextManager;

    return {
      tracerProvider: activeTracerProvider,
      meterProvider: activeMeterProvider,
      loggerProvider: activeLoggerProvider,
      contextManager: activeContextManager,
      propagator,
      ownership: {
        context: false,
        propagation: false,
        trace: false,
        metrics: false,
        logs: false,
      },
      flushOwners: Object.freeze([
        { code: "LOG_FLUSH_FAILED", run: () => activeLoggerProvider.forceFlush() },
        { code: "METRIC_FLUSH_FAILED", run: () => activeMeterProvider.forceFlush() },
        { code: "TRACE_FLUSH_FAILED", run: () => activeTracerProvider.forceFlush() },
      ] satisfies LifecycleOwner[]),
      shutdownOwners: Object.freeze([
        { code: "LOG_SHUTDOWN_FAILED", run: () => activeLoggerProvider.shutdown() },
        { code: "METRIC_SHUTDOWN_FAILED", run: () => activeMeterProvider.shutdown() },
        { code: "TRACE_SHUTDOWN_FAILED", run: () => activeTracerProvider.shutdown() },
      ] satisfies LifecycleOwner[]),
    };
  } catch (error) {
    await cleanupIncompleteConstruction(
      config.constructionCleanupTimeoutMilliseconds,
      contextManager,
      loggerProvider,
      logProcessor,
      meterProvider,
      metricReader,
      tracerProvider,
      spanProcessor,
      rawExporters
    );
    throw error;
  }
}

function registerRuntime(runtime: EnabledRuntime): boolean {
  const ownership: GlobalOwnership = runtime.ownership;
  ownership.context = context.setGlobalContextManager(runtime.contextManager);
  if (!ownership.context) return false;
  ownership.propagation = propagation.setGlobalPropagator(runtime.propagator);
  if (!ownership.propagation) return false;
  ownership.trace = trace.setGlobalTracerProvider(runtime.tracerProvider);
  if (!ownership.trace) return false;
  ownership.metrics = metrics.setGlobalMeterProvider(runtime.meterProvider);
  if (!ownership.metrics) return false;
  ownership.logs = logs.setGlobalLoggerProvider(runtime.loggerProvider) === runtime.loggerProvider;
  return ownership.logs;
}

function makeEnabledLease(
  config: EnabledOpenTelemetryNodeConfig,
  runtime: EnabledRuntime,
  state: TelemetryRecordState,
  releaseClaim: () => void
): OpenTelemetryNodeLease {
  let intakeOpen = true;
  let releasePromise: Promise<FlushTelemetryResult> | undefined;
  const logger = logs.getLogger("@habitat-ai/sdk/telemetry");
  const configuredDefaults = selectFlatAttributes(
    config.exportedAttributePaths,
    config.defaultAttributes
  );

  const telemetry: TelemetryResource = Object.freeze({
    processIdentity: config.processIdentity,
    availability: "available",
    emitTechnicalLog: (input: EmitTechnicalLogInput) =>
      Effect.sync(() => {
        if (!intakeOpen) {
          return;
        }
        try {
          emitTechnicalLog(logger, configuredDefaults, config.exportedAttributePaths, input);
        } catch {
          retainDiagnostic(state, recordDiagnostic("technical-log", "TECHNICAL_LOG_EMIT_FAILED"));
        }
      }),
    readExportCallbackAccounting: () => Effect.sync(() => exportCallbackAccountingSnapshot(state)),
    readDiagnostics: () => Effect.sync(() => diagnosticsSnapshot(state)),
    flush: (input: FlushTelemetryInput) =>
      Effect.promise(() =>
        releasePromise === undefined
          ? flushOwners(runtime.flushOwners, input, state)
          : releasePromise
      ),
  });

  return Object.freeze({
    telemetry,
    release: (input: FlushTelemetryInput) =>
      Effect.promise(() => {
        releasePromise ??= releaseRuntime(runtime, input, state, () => {
          intakeOpen = false;
          releaseClaim();
        }).catch(() => {
          retainDiagnostic(state, recordDiagnostic("shutdown", "PROVIDER_RELEASE_FAILED"));
          return Object.freeze({
            outcome: "degraded",
            accounting: exportCallbackAccountingSnapshot(state),
            diagnostics: diagnosticsSnapshot(state),
          });
        });
        return releasePromise;
      }),
  });
}

/** Constructs exact-pinned native OTLP HTTP exporters without environment fallback. */
export function makeOtlpExporters(
  config: EnabledOpenTelemetryNodeConfig
): OpenTelemetryNodeExporterSet {
  const traceConfiguration = makeOtlpHttpConfiguration(config.traces);
  const metricConfiguration = makeOtlpHttpConfiguration(config.metrics);
  const logConfiguration = makeOtlpHttpConfiguration(config.logs);
  return Object.freeze({
    traces: new OTLPExporterBase<ReadableSpan[]>(
      createOtlpHttpExportDelegate<ReadableSpan[], IExportTraceServiceResponse>(
        traceConfiguration,
        JsonTraceSerializer
      )
    ),
    metrics: new OTLPMetricExporterBase(
      createOtlpHttpExportDelegate<ResourceMetrics, IExportMetricsServiceResponse>(
        metricConfiguration,
        JsonMetricsSerializer
      ),
      { temporalityPreference: AggregationTemporalityPreference.CUMULATIVE }
    ),
    logs: new OTLPExporterBase<ReadableLogRecord[]>(
      createOtlpHttpExportDelegate<ReadableLogRecord[], IExportLogsServiceResponse>(
        logConfiguration,
        JsonLogsSerializer
      )
    ),
  });
}

/** Builds the complete OTLP HTTP transport configuration owned by this provider. */
export function makeOtlpHttpConfiguration(config: {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timeoutMilliseconds: number;
}): OpenTelemetryNodeOtlpHttpConfiguration {
  const headers = Object.freeze({ ...config.headers, "Content-Type": JSON_CONTENT_TYPE });
  return Object.freeze({
    url: absoluteHttpUrl(config.url),
    headers: async () => headers,
    timeoutMillis: config.timeoutMilliseconds,
    concurrencyLimit: DEFAULT_OTLP_CONCURRENCY_LIMIT,
    compression: CompressionAlgorithm.NONE,
    agentFactory: httpAgentFactoryFromOptions({ keepAlive: true }),
  });
}

async function cleanupIncompleteConstruction(
  timeoutMilliseconds: number,
  contextManager: AsyncLocalStorageContextManager | undefined,
  loggerProvider: LoggerProvider | undefined,
  logProcessor: BatchLogRecordProcessor | undefined,
  meterProvider: MeterProvider | undefined,
  metricReader: PeriodicExportingMetricReader | undefined,
  tracerProvider: NodeTracerProvider | undefined,
  spanProcessor: BatchSpanProcessor | undefined,
  exporters: OpenTelemetryNodeExporterSet | undefined
): Promise<void> {
  const deadline = performance.now() + timeoutMilliseconds;
  const operations: Array<() => Promise<void>> = [
    () =>
      loggerProvider?.shutdown() ??
      logProcessor?.shutdown() ??
      exporters?.logs.shutdown() ??
      Promise.resolve(),
    () =>
      meterProvider?.shutdown() ??
      metricReader?.shutdown() ??
      exporters?.metrics.shutdown() ??
      Promise.resolve(),
    () =>
      tracerProvider?.shutdown() ??
      spanProcessor?.shutdown() ??
      exporters?.traces.shutdown() ??
      Promise.resolve(),
  ];
  for (const operation of operations) {
    await runBeforeDeadline(deadline, operation);
  }
  try {
    contextManager?.disable();
  } catch {
    // A context candidate that never became global owns no external state.
  }
}

function absoluteHttpUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("OTLP endpoints must use HTTP or HTTPS");
  }
  return url.toString();
}
