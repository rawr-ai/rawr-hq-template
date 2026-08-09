import type {
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryDiagnostic,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import {
  MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  MAX_TELEMETRY_ATTRIBUTES,
  TelemetryAttributeKeySchema,
  TelemetryAttributesSchema,
  TelemetryProcessIdentitySchema,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { Value } from "typebox/value";

import {
  constructionDiagnostic,
  makeDegradedOpenTelemetryNodeLease,
  makeDisabledOpenTelemetryNodeResource,
} from "./degraded.js";

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
});

const OtlpHeadersSchema = ReadonlyObject(
  Type.Record(OtlpHeaderNameSchema, Type.String({ maxLength: MAX_OTLP_HEADER_VALUE_LENGTH }), {
    description: "Explicit headers for one OTLP HTTP exporter",
  }),
  {
    additionalProperties: false,
    maxProperties: MAX_OTLP_HEADERS,
    propertyNames: OtlpHeaderNameSchema,
  }
);

const AbsoluteOtlpHttpUrlSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: MAX_OTLP_ENDPOINT_LENGTH,
    description: "Explicit absolute OTLP HTTP signal endpoint",
  }),
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
  () => "Expected an absolute HTTP or HTTPS endpoint"
);

const OtlpHttpExporterSchema = ReadonlyObject(
  Type.Object({
    url: AbsoluteOtlpHttpUrlSchema,
    headers: OtlpHeadersSchema,
    timeoutMilliseconds: Type.Integer({
      minimum: MIN_EXPORT_TIMEOUT_MILLISECONDS,
      maximum: MAX_EXPORT_TIMEOUT_MILLISECONDS,
    }),
  }),
  { additionalProperties: false }
);

/** Structural configuration for the inert provider branch. */
export const DisabledOpenTelemetryNodeConfigSchema = ReadonlyObject(
  Type.Object({
    enabled: Type.Literal(false),
    processIdentity: TelemetryProcessIdentitySchema,
  }),
  { additionalProperties: false }
);

/** Structural configuration for the exact OpenTelemetry Node provider topology. */
export const EnabledOpenTelemetryNodeConfigSchema = Refine(
  ReadonlyObject(
    Type.Object({
      enabled: Type.Literal(true),
      processIdentity: TelemetryProcessIdentitySchema,
      defaultAttributes: TelemetryAttributesSchema,
      exportedAttributePaths: ReadonlyObject(Type.Array(TelemetryAttributeKeySchema), {
        maxItems: MAX_TELEMETRY_ATTRIBUTES,
        uniqueItems: true,
      }),
      traces: OtlpHttpExporterSchema,
      metrics: OtlpHttpExporterSchema,
      logs: OtlpHttpExporterSchema,
      metricExportIntervalMilliseconds: Type.Integer({
        minimum: MIN_METRIC_INTERVAL_MILLISECONDS,
        maximum: MAX_METRIC_INTERVAL_MILLISECONDS,
      }),
      constructionCleanupTimeoutMilliseconds: Type.Integer({
        minimum: MIN_EXPORT_TIMEOUT_MILLISECONDS,
        maximum: MAX_EXPORT_TIMEOUT_MILLISECONDS,
      }),
    }),
    { additionalProperties: false }
  ),
  (config) => config.metrics.timeoutMilliseconds <= config.metricExportIntervalMilliseconds,
  () => "Metric export timeout cannot exceed the periodic export interval"
);

/** Closed provider configuration selected by the owning application. */
export const OpenTelemetryNodeConfigSchema = Type.Union([
  DisabledOpenTelemetryNodeConfigSchema,
  EnabledOpenTelemetryNodeConfigSchema,
]);

export type DisabledOpenTelemetryNodeConfig = Static<typeof DisabledOpenTelemetryNodeConfigSchema>;
export type EnabledOpenTelemetryNodeConfig = Static<typeof EnabledOpenTelemetryNodeConfigSchema>;
export type OpenTelemetryNodeConfig = Static<typeof OpenTelemetryNodeConfigSchema>;

/** Inputs for one explicit OpenTelemetry Node acquisition. */
export interface OpenTelemetryNodeAcquireInput {
  readonly config: OpenTelemetryNodeConfig;
}

/** Acquired provider value released once by its composing runtime owner. */
export interface OpenTelemetryNodeLease {
  readonly telemetry: TelemetryResource;
  readonly release: (input: FlushTelemetryInput) => Effect.Effect<FlushTelemetryResult>;
}

/** Decodes unknown application input through the provider-owned TypeBox schema. */
export function decodeOpenTelemetryNodeConfig(input: unknown): OpenTelemetryNodeConfig {
  return Value.Decode(OpenTelemetryNodeConfigSchema, input);
}

export { makeDisabledOpenTelemetryNodeResource };

/**
 * Constructs no vendor machinery for disabled telemetry. Enabled acquisition
 * contains module load and construction failure as a degraded neutral lease.
 */
export function acquireOpenTelemetryNode(
  input: OpenTelemetryNodeAcquireInput
): Effect.Effect<OpenTelemetryNodeLease> {
  if (!input.config.enabled) {
    const telemetry = makeDisabledOpenTelemetryNodeResource(input.config);
    return Effect.succeed(
      Object.freeze({
        telemetry,
        release: (releaseInput: FlushTelemetryInput) => telemetry.flush(releaseInput),
      })
    );
  }
  const config = input.config;

  return Effect.tryPromise({
    try: () => import("./enabled.js"),
    catch: () => constructionDiagnostic("PROVIDER_MODULE_LOAD_FAILED"),
  }).pipe(
    Effect.flatMap(({ acquireEnabledOpenTelemetryNode }) =>
      Effect.promise(() => acquireEnabledOpenTelemetryNode(config))
    ),
    Effect.catch((diagnostic: TelemetryDiagnostic) =>
      Effect.succeed(makeDegradedOpenTelemetryNodeLease(config, diagnostic))
    )
  );
}
