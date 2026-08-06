import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

/** Maximum length of one process-identity field. */
export const MAX_TELEMETRY_IDENTITY_TEXT_LENGTH = 256;

/** Maximum number of flat attributes admitted by one telemetry observation. */
export const MAX_TELEMETRY_ATTRIBUTES = 32;

/** Maximum length of one telemetry attribute key. */
export const MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH = 128;

/** Maximum length of one string telemetry attribute value. */
export const MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH = 1_024;

/** Maximum length of one technical-log message. */
export const MAX_TELEMETRY_LOG_MESSAGE_LENGTH = 4_096;

/** Maximum number of retained provider diagnostics exposed to a consumer. */
export const MAX_TELEMETRY_DIAGNOSTICS = 32;

/** Maximum length of one retained provider diagnostic. */
export const MAX_TELEMETRY_DIAGNOSTIC_DETAIL_LENGTH = 2_048;

/** Bounded identity text used for process and operation identifiers. */
export const TelemetryIdentityTextSchema = Type.String({
  minLength: 1,
  maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
  description: "Bounded telemetry identity text",
});
/** Lowercase dotted key admitted for one provider-neutral telemetry attribute. */
export const TelemetryAttributeKeySchema = Type.String({
  minLength: 1,
  maxLength: MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  pattern: "^[a-z][a-z0-9_.-]*$",
  description: "Lowercase dotted telemetry attribute identity",
});
const FiniteAttributeNumberSchema = Refine(
  Type.Number({
    description: "Finite numeric telemetry attribute value",
  }),
  Number.isFinite,
  () => "Expected a finite number"
);
const MonotonicDeadlineSchema = Refine(
  Type.Number({
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    description: "Nonnegative finite deadline from the process monotonic clock",
  }),
  Number.isFinite,
  () => "Expected a finite monotonic deadline"
);
const TelemetryAttributeValueSchema = Type.Union([
  Type.String({ maxLength: MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH }),
  FiniteAttributeNumberSchema,
  Type.Boolean(),
]);
/** Bounded lowercase name for one native product operation. */
export const TelemetryOperationNameSchema = Type.String({
  minLength: 1,
  maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
  pattern: "^[a-z0-9][a-z0-9._-]*$",
  description: "Bounded lowercase operation identity",
});

/** Terminal outcome owned by one native product operation. */
export const TelemetryOperationOutcomeSchema = Type.Union(
  [Type.Literal("succeeded"), Type.Literal("failed"), Type.Literal("cancelled")],
  {
    description: "Terminal product outcome observed from the native host",
  }
);

/** Structural process identity attached to every observation from one resource value. */
export const TelemetryProcessIdentitySchema = ReadonlyObject(
  Type.Object({
    serviceName: TelemetryIdentityTextSchema,
    serviceVersion: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
        description: "Deployed service version when one is known",
      })
    ),
    deploymentEnvironment: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
        description: "Deployment environment when one is known",
      })
    ),
    processRole: TelemetryIdentityTextSchema,
    processInstanceId: TelemetryIdentityTextSchema,
  }),
  { additionalProperties: false }
);

/** Flat bounded scalar attributes used to correlate observations across native signals. */
export const TelemetryCorrelationAttributesSchema = ReadonlyObject(
  Type.Record(TelemetryAttributeKeySchema, TelemetryAttributeValueSchema, {
    description: "Flat correlation and semantic attributes",
  }),
  {
    additionalProperties: false,
    maxProperties: MAX_TELEMETRY_ATTRIBUTES,
    propertyNames: TelemetryAttributeKeySchema,
    description: "Flat bounded correlation and semantic attributes",
  }
);

/** Availability of the selected process telemetry realization. */
export const TelemetryAvailabilitySchema = Type.Union(
  [Type.Literal("available"), Type.Literal("disabled"), Type.Literal("degraded")],
  {
    description: "Immutable availability snapshot for one acquired telemetry value",
  }
);

const NativeOperationPropertiesSchema = Type.Object({
  operation: TelemetryOperationNameSchema,
  operationId: TelemetryIdentityTextSchema,
  attributes: TelemetryCorrelationAttributesSchema,
});

/**
 * Structural input for the fallback event owner. Its closed variants admit
 * only hosts that do not already provide a native product-event binding.
 */
export const BeginNativeOperationInputSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      surface: Type.Literal("oclif", {
        description: "Oclif command host surface",
      }),
      kind: Type.Literal("command", {
        description: "One resolved Oclif command invocation",
      }),
      ...NativeOperationPropertiesSchema.properties,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      surface: Type.Literal("inngest", {
        description: "Inngest function host surface",
      }),
      kind: Type.Literal("attempt", {
        description: "One Inngest function execution attempt",
      }),
      ...NativeOperationPropertiesSchema.properties,
    }),
    { additionalProperties: false }
  ),
]);

/** Structural input for enriching one fallback native-operation event in place. */
export const EnrichNativeOperationInputSchema = ReadonlyObject(
  Type.Object({
    attributes: TelemetryCorrelationAttributesSchema,
  }),
  { additionalProperties: false }
);

/** Structural input for idempotently finalizing one fallback native-operation event. */
export const FinishNativeOperationInputSchema = ReadonlyObject(
  Type.Object({
    outcome: TelemetryOperationOutcomeSchema,
    attributes: TelemetryCorrelationAttributesSchema,
  }),
  { additionalProperties: false }
);

/** Provider-neutral technical-log severities. */
export const TelemetryLogSeveritySchema = Type.Union([
  Type.Literal("trace"),
  Type.Literal("debug"),
  Type.Literal("info"),
  Type.Literal("warn"),
  Type.Literal("error"),
  Type.Literal("fatal"),
]);

/** Structural input for one bounded technical log observation. */
export const EmitTechnicalLogInputSchema = ReadonlyObject(
  Type.Object({
    severity: TelemetryLogSeveritySchema,
    eventName: TelemetryOperationNameSchema,
    message: Type.String({
      minLength: 1,
      maxLength: MAX_TELEMETRY_LOG_MESSAGE_LENGTH,
      description: "Bounded human-readable technical-log message",
    }),
    attributes: TelemetryCorrelationAttributesSchema,
  }),
  { additionalProperties: false }
);

/** Provider-neutral stages that may retain a contained telemetry diagnostic. */
export const TelemetryDiagnosticStageSchema = Type.Union([
  Type.Literal("construction"),
  Type.Literal("native-operation"),
  Type.Literal("technical-log"),
  Type.Literal("flush"),
  Type.Literal("shutdown"),
]);

const TelemetryDiagnosticCodeSchema = Type.String({
  minLength: 1,
  maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
  pattern: "^[A-Z][A-Z0-9_]*$",
  description: "Stable provider-neutral diagnostic code",
});

/** One bounded diagnostic retained after a telemetry failure was contained. */
export const TelemetryDiagnosticSchema = ReadonlyObject(
  Type.Object({
    stage: TelemetryDiagnosticStageSchema,
    code: TelemetryDiagnosticCodeSchema,
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_TELEMETRY_DIAGNOSTIC_DETAIL_LENGTH,
      description: "Bounded technical detail after a telemetry failure was contained",
    }),
  }),
  { additionalProperties: false }
);

/** Bounded diagnostics for one acquired telemetry value. */
export const TelemetryDiagnosticsSchema = ReadonlyObject(Type.Array(TelemetryDiagnosticSchema), {
  maxItems: MAX_TELEMETRY_DIAGNOSTICS,
  description: "Bounded diagnostics for one acquired telemetry value",
});

/** One monotonic deadline shared by all work in a flush request. */
export const FlushTelemetryInputSchema = ReadonlyObject(
  Type.Object({
    deadlineMonotonicMilliseconds: MonotonicDeadlineSchema,
  }),
  { additionalProperties: false }
);

/** Observable bounded result of a never-failing telemetry flush. */
export const FlushTelemetryResultSchema = ReadonlyObject(
  Type.Object({
    outcome: Type.Union(
      [Type.Literal("flushed"), Type.Literal("deadline-exceeded"), Type.Literal("degraded")],
      {
        description: "Bounded outcome after every flush stage was attempted within the deadline",
      }
    ),
    diagnostics: TelemetryDiagnosticsSchema,
  }),
  { additionalProperties: false }
);

/** Identity attached to observations from one acquired process resource. */
export type TelemetryProcessIdentity = Static<typeof TelemetryProcessIdentitySchema>;

/** Flat bounded attributes for correlating native observations. */
export type TelemetryCorrelationAttributes = Static<typeof TelemetryCorrelationAttributesSchema>;

/** Availability snapshot for one acquired telemetry value. */
export type TelemetryAvailability = Static<typeof TelemetryAvailabilitySchema>;

/** Input for beginning one fallback native-operation event. */
export type BeginNativeOperationInput = Static<typeof BeginNativeOperationInputSchema>;

/** Input for enriching one fallback native-operation event. */
export type EnrichNativeOperationInput = Static<typeof EnrichNativeOperationInputSchema>;

/** Input for idempotently finalizing one fallback native-operation event. */
export type FinishNativeOperationInput = Static<typeof FinishNativeOperationInputSchema>;

/** Provider-neutral technical-log severity. */
export type TelemetryLogSeverity = Static<typeof TelemetryLogSeveritySchema>;

/** Input for one bounded technical log observation. */
export type EmitTechnicalLogInput = Static<typeof EmitTechnicalLogInputSchema>;

/** Provider-neutral stage associated with a contained telemetry failure. */
export type TelemetryDiagnosticStage = Static<typeof TelemetryDiagnosticStageSchema>;

/** One bounded contained telemetry diagnostic. */
export type TelemetryDiagnostic = Static<typeof TelemetryDiagnosticSchema>;

/** Bounded diagnostics retained by one acquired telemetry value. */
export type TelemetryDiagnostics = Static<typeof TelemetryDiagnosticsSchema>;

/** Input carrying the monotonic deadline for one telemetry flush. */
export type FlushTelemetryInput = Static<typeof FlushTelemetryInputSchema>;

/** Observable result of a never-failing telemetry flush. */
export type FlushTelemetryResult = Static<typeof FlushTelemetryResultSchema>;

/**
 * Narrow product-event owner for hosts without an admitted native event
 * binding. Enrichment merges only while the scope is open, with the latest
 * value winning for a repeated attribute key. The first `finish` call seals
 * and emits the event. Later enrichment and every repeated `finish`, including
 * one carrying a different outcome, are inert so the first terminal outcome
 * remains authoritative. Every operation contains its own failure.
 */
export interface NativeOperationTelemetryScope<R = never> {
  readonly enrich: (input: EnrichNativeOperationInput) => Effect.Effect<void, never, R>;
  readonly finish: (input: FinishNativeOperationInput) => Effect.Effect<void, never, R>;
}

/**
 * Provider-neutral telemetry capability. Native signal APIs, context,
 * propagation, export, and provider lifecycle remain outside this surface.
 */
export interface TelemetryResource<R = never> {
  readonly processIdentity: TelemetryProcessIdentity;
  readonly availability: TelemetryAvailability;
  readonly beginNativeOperation: (
    input: BeginNativeOperationInput
  ) => Effect.Effect<NativeOperationTelemetryScope<R>, never, R>;
  readonly emitTechnicalLog: (input: EmitTechnicalLogInput) => Effect.Effect<void, never, R>;
  readonly readDiagnostics: () => Effect.Effect<TelemetryDiagnostics, never, R>;
  readonly flush: (input: FlushTelemetryInput) => Effect.Effect<FlushTelemetryResult, never, R>;
}
