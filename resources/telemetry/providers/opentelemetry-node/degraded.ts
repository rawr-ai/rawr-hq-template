import type {
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryDiagnostic,
  TelemetryProcessIdentity,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";

import type {
  DisabledOpenTelemetryNodeConfig,
  EnabledOpenTelemetryNodeConfig,
  OpenTelemetryNodeLease,
} from "./index.js";
import {
  diagnosticsSnapshot,
  exportCallbackAccountingSnapshot,
  makeTelemetryRecordState,
  retainDiagnostic,
  type TelemetryRecordState,
} from "./neutral.js";

/** Constructs a bounded construction diagnostic without retaining vendor data. */
export function constructionDiagnostic(code: string): TelemetryDiagnostic {
  return Object.freeze({
    stage: "construction",
    code,
    detail: "OpenTelemetry Node provider construction failed and was contained",
  });
}

/** Constructs the disabled resource before any OpenTelemetry module is loaded. */
export function makeDisabledOpenTelemetryNodeResource(
  config: DisabledOpenTelemetryNodeConfig
): TelemetryResource {
  return makeInertTelemetryResource(config.processIdentity, "disabled").telemetry;
}

/** Constructs a degraded neutral lease and optionally clears its acquisition claim on release. */
export function makeDegradedOpenTelemetryNodeLease(
  config: EnabledOpenTelemetryNodeConfig,
  diagnostic: TelemetryDiagnostic,
  releaseClaim?: () => void
): OpenTelemetryNodeLease {
  const inert = makeInertTelemetryResource(config.processIdentity, "degraded", diagnostic);
  let releaseResult: FlushTelemetryResult | undefined;
  return Object.freeze({
    telemetry: inert.telemetry,
    release: (_input: FlushTelemetryInput) =>
      Effect.sync(() => {
        if (releaseResult === undefined) {
          releaseClaim?.();
          releaseResult = Object.freeze({
            outcome: "degraded",
            accounting: exportCallbackAccountingSnapshot(inert.state),
            diagnostics: diagnosticsSnapshot(inert.state),
          });
        }
        return releaseResult;
      }),
  });
}

function makeInertTelemetryResource(
  processIdentity: TelemetryProcessIdentity,
  availability: "disabled" | "degraded",
  diagnostic?: TelemetryDiagnostic
): { readonly telemetry: TelemetryResource; readonly state: TelemetryRecordState } {
  const state = makeTelemetryRecordState();
  if (diagnostic !== undefined) retainDiagnostic(state, diagnostic);
  const telemetry: TelemetryResource = Object.freeze({
    processIdentity,
    availability,
    emitTechnicalLog: () => Effect.sync(() => undefined),
    readExportCallbackAccounting: () => Effect.sync(() => exportCallbackAccountingSnapshot(state)),
    readDiagnostics: () => Effect.sync(() => diagnosticsSnapshot(state)),
    flush: (_input: FlushTelemetryInput) =>
      Effect.sync(() =>
        Object.freeze({
          outcome: availability === "disabled" ? "flushed" : "degraded",
          accounting: exportCallbackAccountingSnapshot(state),
          diagnostics: diagnosticsSnapshot(state),
        })
      ),
  });
  return Object.freeze({ telemetry, state });
}
