import type {
  TelemetryDiagnostic,
  TelemetryDiagnosticStage,
  TelemetryDiagnostics,
  TelemetryExportCallbackAccounting,
} from "@habitat-ai/resource-telemetry";
import { MAX_TELEMETRY_DIAGNOSTICS } from "@habitat-ai/resource-telemetry";

interface MutableSignalExportCallbackAccounting {
  successItems: number;
  failureItems: number;
}

/** Provider-private bounded diagnostics and exporter-callback accounting state. */
export interface TelemetryRecordState {
  readonly accounting: {
    readonly traces: MutableSignalExportCallbackAccounting;
    readonly metrics: MutableSignalExportCallbackAccounting;
    readonly logs: MutableSignalExportCallbackAccounting;
  };
  readonly diagnostics: TelemetryDiagnostic[];
}

/** Creates empty provider-private accounting and diagnostic state. */
export function makeTelemetryRecordState(): TelemetryRecordState {
  return {
    accounting: {
      traces: { successItems: 0, failureItems: 0 },
      metrics: { successItems: 0, failureItems: 0 },
      logs: { successItems: 0, failureItems: 0 },
    },
    diagnostics: [],
  };
}

/** Returns an immutable exporter-callback accounting snapshot. */
export function exportCallbackAccountingSnapshot(
  state: TelemetryRecordState
): TelemetryExportCallbackAccounting {
  return Object.freeze({
    traces: Object.freeze({ ...state.accounting.traces }),
    metrics: Object.freeze({ ...state.accounting.metrics }),
    logs: Object.freeze({ ...state.accounting.logs }),
  });
}

/** Returns an immutable bounded diagnostic snapshot. */
export function diagnosticsSnapshot(state: TelemetryRecordState): TelemetryDiagnostics {
  return Object.freeze([...state.diagnostics]);
}

/** Accounts items from one completed native exporter callback. */
export function accountExportCallbackItems(
  state: TelemetryRecordState,
  signal: "traces" | "metrics" | "logs",
  disposition: "successItems" | "failureItems",
  count: number
): void {
  const current = state.accounting[signal][disposition];
  state.accounting[signal][disposition] = Math.min(
    Number.MAX_SAFE_INTEGER,
    current + Math.max(0, Math.floor(count))
  );
}

/** Retains one bounded provider diagnostic at most once. */
export function retainDiagnostic(
  state: TelemetryRecordState,
  diagnostic: TelemetryDiagnostic
): void {
  if (state.diagnostics.some((retained) => retained.code === diagnostic.code)) return;
  if (state.diagnostics.length < MAX_TELEMETRY_DIAGNOSTICS) {
    state.diagnostics.push(diagnostic);
  }
}

/** Constructs a provider-private diagnostic without retaining vendor payloads. */
export function recordDiagnostic(
  stage: TelemetryDiagnosticStage,
  code: string
): TelemetryDiagnostic {
  return Object.freeze({
    stage,
    code,
    detail: "OpenTelemetry Node provider operation failed and was contained",
  });
}
