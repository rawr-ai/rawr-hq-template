import type {
  FlushTelemetryResult,
  NativeOperationTelemetryScope,
  TelemetryDiagnostic,
  TelemetryDiagnostics,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Context, Effect } from "effect";

import type { EnabledOpenTelemetryNodeConfig, OpenTelemetryNodeLease } from "./index.js";

const INERT_NATIVE_OPERATION_SCOPE: NativeOperationTelemetryScope = Object.freeze({
  enrich: () => Effect.void,
  finish: () => Effect.void,
});

/** Creates a bounded construction diagnostic without retaining raw vendor failure data. */
export function constructionDiagnostic(code: string): TelemetryDiagnostic {
  return Object.freeze({
    stage: "construction",
    code,
    detail: "OpenTelemetry Node provider construction was contained",
  });
}

/**
 * Builds the construction-free degraded value used after enabled acquisition
 * fails before a usable provider topology exists.
 */
export function makeDegradedOpenTelemetryNodeLease(
  config: EnabledOpenTelemetryNodeConfig,
  diagnostic: TelemetryDiagnostic,
  reportDiagnostic?: (diagnostic: TelemetryDiagnostic) => void
): OpenTelemetryNodeLease {
  const diagnostics: TelemetryDiagnostics = Object.freeze([diagnostic]);
  try {
    reportDiagnostic?.(diagnostic);
  } catch {
    // A diagnostic sink observes telemetry failure; it cannot become one.
  }

  const result: FlushTelemetryResult = Object.freeze({
    outcome: "degraded",
    diagnostics,
  });
  const resource: TelemetryResource = Object.freeze({
    processIdentity: config.processIdentity,
    availability: "degraded",
    beginNativeOperation: () => Effect.succeed(INERT_NATIVE_OPERATION_SCOPE),
    emitTechnicalLog: () => Effect.void,
    readDiagnostics: () => Effect.succeed(diagnostics),
    flush: () => Effect.succeed(result),
  });

  return Object.freeze({
    telemetry: resource,
    effectContext: Object.freeze({ "effect/context": Context.empty() }),
    evlogDrain: async () => {},
    shutdown: () => Effect.succeed(result),
  });
}
