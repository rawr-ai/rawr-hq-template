import { randomUUID } from "node:crypto";
import type { FlushTelemetryResult, TelemetryResource } from "@habitat-ai/resource-telemetry";
import { MAX_TELEMETRY_IDENTITY_TEXT_LENGTH } from "@habitat-ai/resource-telemetry";
import {
  acquireOpenTelemetryNode,
  type OpenTelemetryNodeConfig,
} from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
import { Effect, Exit, Scope } from "effect";

const DEFAULT_SERVICE_NAME = "rawr";
const CLI_PROCESS_ROLE = "cli";
const MAX_OTLP_ENDPOINT_LENGTH = 2_048;
const EXPORT_TIMEOUT_MILLISECONDS = 10_000;
const METRIC_EXPORT_INTERVAL_MILLISECONDS = 60_000;
const SHUTDOWN_FALLBACK_MILLISECONDS = 10_000;
const EMPTY_ATTRIBUTES = Object.freeze({});
const EMPTY_HEADERS = Object.freeze({});
const EXPORTED_ATTRIBUTE_PATHS = Object.freeze([
  "receipt.id",
  "cli.command.id",
  "cli.command.plugin",
  "cli.argv.count",
  "duration.ms",
]);

type TelemetryEnvironment = Readonly<Record<string, string | undefined>>;
type SignalName = "traces" | "metrics" | "logs";

const signalEnvironmentNames: Readonly<Record<SignalName, string>> = Object.freeze({
  traces: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  metrics: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  logs: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
});

/** Injectable process inputs used only while selecting CLI telemetry. */
export type RawrCliTelemetrySelectionOptions = Readonly<{
  env?: TelemetryEnvironment;
  generateProcessInstanceId?: () => string;
}>;

/** One process-owned telemetry value retained until native Oclif completion. */
export type RawrCliTelemetryLifecycle = Readonly<{
  telemetry: TelemetryResource;
  shutdown(deadlineMonotonicMilliseconds?: number): Promise<FlushTelemetryResult>;
}>;

function boundedIdentity(value: string | undefined): string | undefined {
  const selected = value?.trim();
  return selected !== undefined &&
    selected.length > 0 &&
    selected.length <= MAX_TELEMETRY_IDENTITY_TEXT_LENGTH
    ? selected
    : undefined;
}

function parseHttpEndpoint(value: string | undefined): URL | undefined {
  const selected = value?.trim();
  if (
    selected === undefined ||
    selected.length === 0 ||
    selected.length > MAX_OTLP_ENDPOINT_LENGTH
  ) {
    return undefined;
  }

  try {
    const endpoint = new URL(selected);
    return (endpoint.protocol === "http:" || endpoint.protocol === "https:") &&
      endpoint.toString().length <= MAX_OTLP_ENDPOINT_LENGTH
      ? endpoint
      : undefined;
  } catch {
    return undefined;
  }
}

function signalEndpoint(base: URL, signal: SignalName): URL | undefined {
  const endpoint = new URL(base);
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/u, "")}/v1/${signal}`;
  return endpoint.toString().length <= MAX_OTLP_ENDPOINT_LENGTH ? endpoint : undefined;
}

function selectSignalEndpoint(
  env: TelemetryEnvironment,
  base: URL | undefined,
  signal: SignalName
): URL | undefined {
  const signalValue = env[signalEnvironmentNames[signal]];
  if (signalValue !== undefined && signalValue.trim().length > 0) {
    return parseHttpEndpoint(signalValue);
  }
  return base === undefined ? undefined : signalEndpoint(base, signal);
}

function exporterConfig(url: URL) {
  return Object.freeze({
    url: url.toString(),
    headers: EMPTY_HEADERS,
    timeoutMilliseconds: EXPORT_TIMEOUT_MILLISECONDS,
  });
}

/** Selects one closed provider configuration for the Oclif process. */
export function selectRawrCliTelemetryConfig(
  options: RawrCliTelemetrySelectionOptions = {}
): OpenTelemetryNodeConfig {
  const env = options.env ?? process.env;
  const serviceVersion = boundedIdentity(env.RAWR_CLI_VERSION);
  const deploymentEnvironment = boundedIdentity(env.NODE_ENV);
  const processIdentity = Object.freeze({
    serviceName: boundedIdentity(env.OTEL_SERVICE_NAME) ?? DEFAULT_SERVICE_NAME,
    ...(serviceVersion === undefined ? {} : { serviceVersion }),
    ...(deploymentEnvironment === undefined ? {} : { deploymentEnvironment }),
    processRole: CLI_PROCESS_ROLE,
    processInstanceId: (options.generateProcessInstanceId ?? randomUUID)(),
  });

  if (env.OTEL_SDK_DISABLED?.trim().toLowerCase() === "true") {
    return Object.freeze({ enabled: false, processIdentity });
  }

  const base = parseHttpEndpoint(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const traces = selectSignalEndpoint(env, base, "traces");
  const metrics = selectSignalEndpoint(env, base, "metrics");
  const logs = selectSignalEndpoint(env, base, "logs");
  const receiptId = boundedIdentity(env.RAWR_TELEMETRY_RECEIPT_ID);

  if (traces === undefined || metrics === undefined || logs === undefined) {
    return Object.freeze({ enabled: false, processIdentity });
  }

  return Object.freeze({
    enabled: true,
    processIdentity,
    defaultAttributes:
      receiptId === undefined ? EMPTY_ATTRIBUTES : Object.freeze({ "receipt.id": receiptId }),
    exportedAttributePaths: EXPORTED_ATTRIBUTE_PATHS,
    traces: exporterConfig(traces),
    metrics: exporterConfig(metrics),
    logs: exporterConfig(logs),
    metricExportIntervalMilliseconds: METRIC_EXPORT_INTERVAL_MILLISECONDS,
    shutdownFallbackMilliseconds: SHUTDOWN_FALLBACK_MILLISECONDS,
  });
}

/** Acquires one selected provider under the process-owned Effect scope. */
export async function acquireRawrCliTelemetry(
  config: OpenTelemetryNodeConfig
): Promise<RawrCliTelemetryLifecycle> {
  const scope = await Effect.runPromise(Scope.make());

  try {
    const lease = await Effect.runPromise(
      acquireOpenTelemetryNode({ config }).pipe(Scope.provide(scope))
    );
    const fallbackMilliseconds = config.enabled ? config.shutdownFallbackMilliseconds : 1_000;
    let shutdownPromise: Promise<FlushTelemetryResult> | undefined;

    return Object.freeze({
      telemetry: lease.telemetry,
      shutdown(deadlineMonotonicMilliseconds = performance.now() + fallbackMilliseconds) {
        shutdownPromise ??= Effect.runPromise(
          lease.shutdown({ deadlineMonotonicMilliseconds })
        ).finally(() => Effect.runPromise(Scope.close(scope, Exit.void)));
        return shutdownPromise;
      },
    });
  } catch (error) {
    await Effect.runPromise(Scope.close(scope, Exit.void));
    throw error;
  }
}
