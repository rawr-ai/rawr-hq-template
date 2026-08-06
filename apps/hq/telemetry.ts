import { randomUUID } from "node:crypto";
import { MAX_TELEMETRY_IDENTITY_TEXT_LENGTH } from "@habitat-ai/resource-telemetry";
import type { OpenTelemetryNodeConfig } from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";

const DEFAULT_SERVICE_NAME = "rawr-hq";
const SERVER_PROCESS_ROLE = "server";
const MAX_OTLP_ENDPOINT_LENGTH = 2_048;
const EXPORT_TIMEOUT_MILLISECONDS = 10_000;
const METRIC_EXPORT_INTERVAL_MILLISECONDS = 60_000;
const SHUTDOWN_FALLBACK_MILLISECONDS = 10_000;
const EMPTY_ATTRIBUTES = Object.freeze({});
const EMPTY_HEADERS = Object.freeze({});

const EXPORTED_ATTRIBUTE_PATHS = Object.freeze([
  "receipt.id",
  "request.id",
  "correlation.id",
  "request.method",
  "request.path",
  "request.matched",
  "rpc.method",
  "rpc.service",
  "rpc.system",
  "rpc.authorization.decision",
  "inngest.run.id",
  "inngest.attempt.id",
  "inngest.function.id",
  "inngest.event.id",
  "inngest.traceparent",
  "sdk.run.id",
  "rawr.orpc.surface",
  "rawr.orpc.router",
  "rawr.orpc.authorized",
  "rawr.workflow.surface",
  "rawr.workflow.router",
  "http.request.method",
  "http.response.status_code",
  "duration.ms",
  "workflow.name",
  "workflow.id",
]);

type TelemetryEnvironment = Readonly<Record<string, string | undefined>>;

/** Injectable process inputs used only while selecting the HQ telemetry config. */
export type RawrHqTelemetrySelectionOptions = Readonly<{
  env?: TelemetryEnvironment;
  generateProcessInstanceId?: () => string;
}>;

type SignalName = "traces" | "metrics" | "logs";

const signalEnvironmentNames: Readonly<Record<SignalName, string>> = Object.freeze({
  traces: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  metrics: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  logs: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
});

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

/** Selects one closed provider config for the HQ server process. */
export function selectRawrHqTelemetryConfig(
  options: RawrHqTelemetrySelectionOptions = {}
): OpenTelemetryNodeConfig {
  const env = options.env ?? process.env;
  const serviceVersion = boundedIdentity(env.RAWR_SERVER_VERSION);
  const deploymentEnvironment = boundedIdentity(env.NODE_ENV);
  const processIdentity = Object.freeze({
    serviceName: boundedIdentity(env.OTEL_SERVICE_NAME) ?? DEFAULT_SERVICE_NAME,
    ...(serviceVersion === undefined ? {} : { serviceVersion }),
    ...(deploymentEnvironment === undefined ? {} : { deploymentEnvironment }),
    processRole: SERVER_PROCESS_ROLE,
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
