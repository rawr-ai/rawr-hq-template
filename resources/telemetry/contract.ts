import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

/** Maximum length of one process-identity field. */
export const MAX_TELEMETRY_IDENTITY_TEXT_LENGTH = 256;

/** Maximum number of flat attributes admitted by one technical observation. */
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

/** Bounded identity text used for process and observation identifiers. */
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
  Type.Number({ description: "Finite numeric telemetry attribute value" }),
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

/** Structural process identity attached to every signal from one resource value. */
export const TelemetryProcessIdentitySchema = ReadonlyObject(
  Type.Object({
    serviceName: TelemetryIdentityTextSchema,
    serviceVersion: Type.Optional(TelemetryIdentityTextSchema),
    deploymentEnvironment: Type.Optional(TelemetryIdentityTextSchema),
    processRole: TelemetryIdentityTextSchema,
    processInstanceId: TelemetryIdentityTextSchema,
  }),
  { additionalProperties: false }
);

/** Flat bounded scalar attributes admitted at the technical telemetry boundary. */
export const TelemetryAttributesSchema = ReadonlyObject(
  Type.Record(TelemetryAttributeKeySchema, TelemetryAttributeValueSchema, {
    description: "Flat bounded technical telemetry attributes",
  }),
  {
    additionalProperties: false,
    maxProperties: MAX_TELEMETRY_ATTRIBUTES,
    propertyNames: TelemetryAttributeKeySchema,
  }
);

/** Availability of the selected process telemetry realization. */
export const TelemetryAvailabilitySchema = Type.Union([
  Type.Literal("available"),
  Type.Literal("disabled"),
  Type.Literal("degraded"),
]);

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
    eventName: TelemetryIdentityTextSchema,
    message: Type.String({
      minLength: 1,
      maxLength: MAX_TELEMETRY_LOG_MESSAGE_LENGTH,
      description: "Bounded human-readable technical-log message",
    }),
    attributes: TelemetryAttributesSchema,
  }),
  { additionalProperties: false }
);

/** Provider-neutral stages that may retain a contained telemetry diagnostic. */
export const TelemetryDiagnosticStageSchema = Type.Union([
  Type.Literal("construction"),
  Type.Literal("technical-log"),
  Type.Literal("export"),
  Type.Literal("flush"),
  Type.Literal("shutdown"),
]);

/** One bounded diagnostic retained after a telemetry failure was contained. */
export const TelemetryDiagnosticSchema = ReadonlyObject(
  Type.Object({
    stage: TelemetryDiagnosticStageSchema,
    code: Type.String({
      minLength: 1,
      maxLength: MAX_TELEMETRY_IDENTITY_TEXT_LENGTH,
      pattern: "^[A-Z][A-Z0-9_]*$",
      description: "Stable provider-neutral diagnostic code",
    }),
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
});

const TelemetrySignalExportCallbackAccountingSchema = ReadonlyObject(
  Type.Object({
    successItems: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    failureItems: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  }),
  { additionalProperties: false }
);

/**
 * Items presented to native exporter callbacks, grouped by the callback's
 * coarse success or failure result for each signal.
 *
 * These counts do not establish backend receipt and exclude processor queue
 * overflow, OTLP partial success, and loss before an exporter callback (including
 * disabled, degraded, failed-emission, and closed-intake paths). Metric points
 * are not deduplicated: a cumulative point presented again by a later callback
 * is counted again.
 */
export const TelemetryExportCallbackAccountingSchema = ReadonlyObject(
  Type.Object({
    traces: TelemetrySignalExportCallbackAccountingSchema,
    metrics: TelemetrySignalExportCallbackAccountingSchema,
    logs: TelemetrySignalExportCallbackAccountingSchema,
  }),
  { additionalProperties: false }
);

/** One monotonic deadline shared by all work in a flush or release request. */
export const FlushTelemetryInputSchema = ReadonlyObject(
  Type.Object({
    deadlineMonotonicMilliseconds: MonotonicDeadlineSchema,
  }),
  { additionalProperties: false }
);

/** Observable bounded result of a never-failing telemetry flush or release. */
export const FlushTelemetryResultSchema = ReadonlyObject(
  Type.Object({
    outcome: Type.Union([
      Type.Literal("flushed"),
      Type.Literal("deadline-exceeded"),
      Type.Literal("degraded"),
    ]),
    accounting: TelemetryExportCallbackAccountingSchema,
    diagnostics: TelemetryDiagnosticsSchema,
  }),
  { additionalProperties: false }
);

export type TelemetryProcessIdentity = Static<typeof TelemetryProcessIdentitySchema>;
export type TelemetryAttributes = Static<typeof TelemetryAttributesSchema>;
export type TelemetryAvailability = Static<typeof TelemetryAvailabilitySchema>;
export type TelemetryLogSeverity = Static<typeof TelemetryLogSeveritySchema>;
export type EmitTechnicalLogInput = Static<typeof EmitTechnicalLogInputSchema>;
export type TelemetryDiagnosticStage = Static<typeof TelemetryDiagnosticStageSchema>;
export type TelemetryDiagnostic = Static<typeof TelemetryDiagnosticSchema>;
export type TelemetryDiagnostics = Static<typeof TelemetryDiagnosticsSchema>;
export type TelemetryExportCallbackAccounting = Static<
  typeof TelemetryExportCallbackAccountingSchema
>;
export type FlushTelemetryInput = Static<typeof FlushTelemetryInputSchema>;
export type FlushTelemetryResult = Static<typeof FlushTelemetryResultSchema>;

/** Provider-neutral process telemetry capability with contained failure behavior. */
export interface TelemetryResource<R = never> {
  readonly processIdentity: TelemetryProcessIdentity;
  readonly availability: TelemetryAvailability;
  readonly emitTechnicalLog: (input: EmitTechnicalLogInput) => Effect.Effect<void, never, R>;
  readonly readExportCallbackAccounting: () => Effect.Effect<
    TelemetryExportCallbackAccounting,
    never,
    R
  >;
  readonly readDiagnostics: () => Effect.Effect<TelemetryDiagnostics, never, R>;
  readonly flush: (input: FlushTelemetryInput) => Effect.Effect<FlushTelemetryResult, never, R>;
}
