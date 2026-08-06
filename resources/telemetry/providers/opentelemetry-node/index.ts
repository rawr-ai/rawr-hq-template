import type {
  FlushTelemetryInput,
  FlushTelemetryResult,
  NativeOperationTelemetryScope,
  TelemetryDiagnostic,
  TelemetryDiagnostics,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import {
  MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  MAX_TELEMETRY_ATTRIBUTES,
  TelemetryAttributeKeySchema,
  TelemetryCorrelationAttributesSchema,
  TelemetryProcessIdentitySchema,
} from "@habitat-ai/resource-telemetry";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { Context, Effect, type Scope } from "effect";
import type { DrainContext } from "evlog";
import type { Inngest } from "inngest";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import { constructionDiagnostic, makeDegradedOpenTelemetryNodeLease } from "./degraded.js";

const MAX_OTLP_ENDPOINT_LENGTH = 2_048;
const MAX_OTLP_HEADERS = 32;
const MAX_OTLP_HEADER_VALUE_LENGTH = 4_096;
const MIN_EXPORT_TIMEOUT_MILLISECONDS = 100;
const MAX_EXPORT_TIMEOUT_MILLISECONDS = 60_000;
const MIN_METRIC_INTERVAL_MILLISECONDS = 1_000;
const MAX_METRIC_INTERVAL_MILLISECONDS = 300_000;

const OtlpHeaderNameSchema = Type.String({
  minLength: 1,
  maxLength: MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  pattern: "^[A-Za-z0-9][A-Za-z0-9_.-]*$",
  description: "Bounded HTTP header name supplied by the application",
});

const OtlpHeadersSchema = ReadonlyObject(
  Type.Record(
    OtlpHeaderNameSchema,
    Type.String({
      maxLength: MAX_OTLP_HEADER_VALUE_LENGTH,
      description: "Bounded HTTP header value supplied by the application",
    }),
    { description: "Explicit headers for one OTLP HTTP exporter" }
  ),
  {
    additionalProperties: false,
    maxProperties: MAX_OTLP_HEADERS,
    propertyNames: OtlpHeaderNameSchema,
  }
);

const OtlpHttpExporterSchema = ReadonlyObject(
  Type.Object({
    url: Type.String({
      minLength: 1,
      maxLength: MAX_OTLP_ENDPOINT_LENGTH,
      description: "Absolute OTLP HTTP signal endpoint selected by the application",
    }),
    headers: OtlpHeadersSchema,
    timeoutMilliseconds: Type.Integer({
      minimum: MIN_EXPORT_TIMEOUT_MILLISECONDS,
      maximum: MAX_EXPORT_TIMEOUT_MILLISECONDS,
      description: "Maximum duration of one exporter request",
    }),
  }),
  { additionalProperties: false }
);

/** Structural configuration for the inert provider branch. */
export const DisabledOpenTelemetryNodeConfigSchema = ReadonlyObject(
  Type.Object({
    enabled: Type.Literal(false, {
      description: "Selects the inert branch before any telemetry vendor construction",
    }),
    processIdentity: TelemetryProcessIdentitySchema,
  }),
  { additionalProperties: false }
);

/** Structural configuration for the exact OpenTelemetry Node provider topology. */
export const EnabledOpenTelemetryNodeConfigSchema = Refine(
  ReadonlyObject(
    Type.Object({
      enabled: Type.Literal(true, {
        description: "Selects the admitted OpenTelemetry Node provider topology",
      }),
      processIdentity: TelemetryProcessIdentitySchema,
      defaultAttributes: TelemetryCorrelationAttributesSchema,
      exportedAttributePaths: ReadonlyObject(Type.Array(TelemetryAttributeKeySchema), {
        maxItems: MAX_TELEMETRY_ATTRIBUTES,
        uniqueItems: true,
        description: "Explicit flat attribute paths that may cross the provider export boundary",
      }),
      traces: OtlpHttpExporterSchema,
      metrics: OtlpHttpExporterSchema,
      logs: OtlpHttpExporterSchema,
      metricExportIntervalMilliseconds: Type.Integer({
        minimum: MIN_METRIC_INTERVAL_MILLISECONDS,
        maximum: MAX_METRIC_INTERVAL_MILLISECONDS,
        description: "Interval between periodic metric exports",
      }),
      shutdownFallbackMilliseconds: Type.Integer({
        minimum: MIN_EXPORT_TIMEOUT_MILLISECONDS,
        maximum: MAX_EXPORT_TIMEOUT_MILLISECONDS,
        description: "Fallback release budget when the owning scope closes",
      }),
    }),
    { additionalProperties: false }
  ),
  (config) => config.metrics.timeoutMilliseconds <= config.metricExportIntervalMilliseconds,
  () => "Metric export timeout cannot exceed the periodic export interval"
);

/** Closed configuration selected by the owning application before acquisition. */
export const OpenTelemetryNodeConfigSchema = Type.Union([
  DisabledOpenTelemetryNodeConfigSchema,
  EnabledOpenTelemetryNodeConfigSchema,
]);

/** Configuration for the inert provider branch. */
export type DisabledOpenTelemetryNodeConfig = Static<typeof DisabledOpenTelemetryNodeConfigSchema>;

/** Configuration for the exact enabled provider topology. */
export type EnabledOpenTelemetryNodeConfig = Static<typeof EnabledOpenTelemetryNodeConfigSchema>;

/** Closed provider configuration derived from the TypeBox authority. */
export type OpenTelemetryNodeConfig = Static<typeof OpenTelemetryNodeConfigSchema>;

/**
 * Native process dependencies supplied outside the serializable provider
 * configuration. The Inngest object is the same client mounted by the host.
 */
export interface OpenTelemetryNodeAcquireInput {
  readonly config: OpenTelemetryNodeConfig;
  readonly inngestClient?: Inngest.Like;
  readonly reportDiagnostic?: (diagnostic: TelemetryDiagnostic) => void;
}

/**
 * Acquired provider value. The application coordinates host intake and drain,
 * then calls this single provider-owned shutdown operation.
 */
export interface OpenTelemetryNodeLease {
  readonly telemetry: TelemetryResource;
  readonly effectContext: WithEffectContext<never>;
  readonly evlogDrain: (context: DrainContext) => Promise<void>;
  readonly shutdown: (input: FlushTelemetryInput) => Effect.Effect<FlushTelemetryResult>;
}

const EMPTY_DIAGNOSTICS: TelemetryDiagnostics = Object.freeze([]);
const DISABLED_FLUSH_RESULT: FlushTelemetryResult = Object.freeze({
  outcome: "flushed",
  diagnostics: EMPTY_DIAGNOSTICS,
});
const DISABLED_NATIVE_OPERATION_SCOPE: NativeOperationTelemetryScope = Object.freeze({
  enrich: () => Effect.void,
  finish: () => Effect.void,
});
const EMPTY_EFFECT_CONTEXT: WithEffectContext<never> = Object.freeze({
  "effect/context": Context.empty(),
});

/**
 * Constructs the disabled resource before any OpenTelemetry machinery exists.
 * Every operation is inert, settles successfully, and retains no observations.
 */
export function makeDisabledOpenTelemetryNodeResource(
  config: DisabledOpenTelemetryNodeConfig
): TelemetryResource {
  return Object.freeze({
    processIdentity: config.processIdentity,
    availability: "disabled",
    beginNativeOperation: () => Effect.succeed(DISABLED_NATIVE_OPERATION_SCOPE),
    emitTechnicalLog: () => Effect.void,
    readDiagnostics: () => Effect.succeed(EMPTY_DIAGNOSTICS),
    flush: () => Effect.succeed(DISABLED_FLUSH_RESULT),
  });
}

/**
 * Selects the disabled provider without loading vendor code, or acquires the
 * exact enabled topology under the caller's Effect scope.
 */
export function acquireOpenTelemetryNode(
  input: OpenTelemetryNodeAcquireInput
): Effect.Effect<OpenTelemetryNodeLease, never, Scope.Scope> {
  if (!input.config.enabled) {
    return Effect.succeed(
      Object.freeze({
        telemetry: makeDisabledOpenTelemetryNodeResource(input.config),
        effectContext: EMPTY_EFFECT_CONTEXT,
        evlogDrain: async () => {},
        shutdown: () => Effect.succeed(DISABLED_FLUSH_RESULT),
      })
    );
  }
  const config = input.config;

  return Effect.tryPromise({
    try: () => import("./enabled.js"),
    catch: () => constructionDiagnostic("PROVIDER_MODULE_LOAD_FAILED"),
  }).pipe(
    Effect.flatMap(({ acquireEnabledOpenTelemetryNode }) =>
      acquireEnabledOpenTelemetryNode(config, input.inngestClient, input.reportDiagnostic)
    ),
    Effect.catch((diagnostic) =>
      Effect.succeed(makeDegradedOpenTelemetryNodeLease(config, diagnostic, input.reportDiagnostic))
    )
  );
}
