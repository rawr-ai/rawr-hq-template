import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import { ORPCInstrumentation } from "@orpc/otel";

const TELEMETRY_STATE_KEY = Symbol.for("rawr.orpc.telemetry.state");

type TelemetryState = {
  installPromise?: Promise<InstalledTelemetry>;
  installed?: InstalledTelemetry;
  removeProcessHooks?: () => void;
  requestedOptions?: ReturnType<typeof resolveTelemetryOptions>;
};

type TelemetryProcessEvent = "beforeExit" | "SIGINT" | "SIGTERM";

export type RawrOrpcTelemetryOptions = {
  serviceName: string;
  environment?: string;
  serviceVersion?: string;
  exporter?: {
    url?: string;
    headers?: Record<string, string>;
  };
  traceExporter?: SpanExporter;
};

export type InstalledTelemetry = {
  sdk: NodeSDK;
  instrumentationNames: string[];
  options: Readonly<Required<Pick<RawrOrpcTelemetryOptions, "serviceName">> & Omit<RawrOrpcTelemetryOptions, "serviceName">>;
  shutdown(): Promise<void>;
};

function getTelemetryState(): TelemetryState {
  const globalScope = globalThis as typeof globalThis & {
    [TELEMETRY_STATE_KEY]?: TelemetryState;
  };

  if (!globalScope[TELEMETRY_STATE_KEY]) {
    globalScope[TELEMETRY_STATE_KEY] = {};
  }

  return globalScope[TELEMETRY_STATE_KEY];
}

function resolveTelemetryOptions(options: RawrOrpcTelemetryOptions) {
  return {
    serviceName: options.serviceName,
    environment: options.environment ?? process.env.NODE_ENV,
    serviceVersion: options.serviceVersion,
    exporter: {
      url: options.exporter?.url ?? process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: options.exporter?.headers,
    },
    traceExporter: options.traceExporter,
  };
}

function createTraceExporter(options: ReturnType<typeof resolveTelemetryOptions>): SpanExporter {
  if (options.traceExporter) {
    return options.traceExporter;
  }

  return new OTLPTraceExporter({
    url: options.exporter.url,
    headers: options.exporter.headers,
  });
}

function stringifyHeaders(headers?: Record<string, string>) {
  if (!headers) {
    return "";
  }

  return JSON.stringify(
    Object.entries(headers)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function assertCompatibleInstall(
  current: ReturnType<typeof resolveTelemetryOptions>,
  next: ReturnType<typeof resolveTelemetryOptions>,
) {
  const isCompatible =
    current.serviceName === next.serviceName
    && current.environment === next.environment
    && current.serviceVersion === next.serviceVersion
    && current.exporter.url === next.exporter.url
    && stringifyHeaders(current.exporter.headers) === stringifyHeaders(next.exporter.headers)
    && current.traceExporter === next.traceExporter;

  if (isCompatible) {
    return;
  }

  throw new Error(
    "installRawrOrpcTelemetry(...) received incompatible options after telemetry was already configured",
  );
}

function registerProcessHooks(shutdown: () => Promise<void>) {
  let shuttingDown = false;
  const handlers = new Map<TelemetryProcessEvent, () => void>();

  function register(event: TelemetryProcessEvent) {
    const handler = () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      void shutdown().finally(() => {
        if (event === "SIGINT" || event === "SIGTERM") {
          process.exit(0);
        }
      });
    };

    handlers.set(event, handler);
    process.once(event, handler);
  }

  register("beforeExit");
  register("SIGINT");
  register("SIGTERM");

  return () => {
    for (const [event, handler] of handlers) {
      process.removeListener(event, handler);
    }
    handlers.clear();
  };
}

export async function installRawrOrpcTelemetry(
  options: RawrOrpcTelemetryOptions,
): Promise<InstalledTelemetry> {
  const state = getTelemetryState();
  const resolvedOptions = resolveTelemetryOptions(options);

  if (state.requestedOptions) {
    assertCompatibleInstall(state.requestedOptions, resolvedOptions);
  }

  if (state.installPromise) {
    return state.installPromise;
  }

  state.requestedOptions = resolvedOptions;
  state.installPromise = (async () => {
    const instrumentations = [
      new HttpInstrumentation(),
      new ORPCInstrumentation(),
    ];

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        "service.name": resolvedOptions.serviceName,
        ...(resolvedOptions.serviceVersion ? { "service.version": resolvedOptions.serviceVersion } : {}),
        ...(resolvedOptions.environment ? { "deployment.environment.name": resolvedOptions.environment } : {}),
      }),
      traceExporter: createTraceExporter(resolvedOptions),
      instrumentations,
      textMapPropagator: new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
        ],
      }),
    });

    await sdk.start();

    let shuttingDown = false;
    const installed: InstalledTelemetry = {
      sdk,
      instrumentationNames: instrumentations.map((instrumentation) => instrumentation.constructor.name),
      options: resolvedOptions,
      async shutdown() {
        if (shuttingDown) {
          return;
        }

        shuttingDown = true;
        await sdk.shutdown();

        if (state.installed === installed) {
          state.installed = undefined;
          state.installPromise = undefined;
        }

        state.removeProcessHooks?.();
        state.removeProcessHooks = undefined;
      },
    };

    state.installed = installed;
    state.removeProcessHooks ??= registerProcessHooks(() => installed.shutdown());
    return installed;
  })().catch((error) => {
    state.installPromise = undefined;
    state.installed = undefined;
    state.requestedOptions = undefined;
    state.removeProcessHooks?.();
    state.removeProcessHooks = undefined;
    throw error;
  });

  return state.installPromise;
}

export async function __resetRawrOrpcTelemetryForTests() {
  const state = getTelemetryState();

  if (state.installed) {
    await state.installed.shutdown();
  }

  state.installPromise = undefined;
  state.installed = undefined;
  state.requestedOptions = undefined;
  state.removeProcessHooks?.();
  state.removeProcessHooks = undefined;
}
