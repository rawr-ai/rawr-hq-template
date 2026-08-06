import {
  type FlushTelemetryResult,
  type NativeOperationTelemetryScope,
  type TelemetryDiagnostics,
  TelemetryProcessIdentitySchema,
  type TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { ReadonlyObject, type Static, Type } from "typebox";

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

/** Configuration for the inert provider branch. */
export type DisabledOpenTelemetryNodeConfig = Static<typeof DisabledOpenTelemetryNodeConfigSchema>;

const EMPTY_DIAGNOSTICS: TelemetryDiagnostics = Object.freeze([]);
const DISABLED_FLUSH_RESULT: FlushTelemetryResult = Object.freeze({
  outcome: "flushed",
  diagnostics: EMPTY_DIAGNOSTICS,
});
const DISABLED_NATIVE_OPERATION_SCOPE: NativeOperationTelemetryScope = Object.freeze({
  enrich: () => Effect.void,
  finish: () => Effect.void,
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
