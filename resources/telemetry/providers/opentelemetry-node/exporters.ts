import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

import {
  accountExportCallbackItems,
  recordDiagnostic,
  retainDiagnostic,
  type TelemetryRecordState,
} from "./neutral.js";

/** Accounts items presented to native exporter callbacks without changing their lifecycle. */
export function accountingExporters(
  exporters: {
    readonly traces: SpanExporter;
    readonly metrics: PushMetricExporter;
    readonly logs: LogRecordExporter;
  },
  state: TelemetryRecordState
): typeof exporters {
  return Object.freeze({
    traces: accountingSpanExporter(exporters.traces, state),
    metrics: accountingMetricExporter(exporters.metrics, state),
    logs: accountingLogExporter(exporters.logs, state),
  });
}

function accountingSpanExporter(exporter: SpanExporter, state: TelemetryRecordState): SpanExporter {
  return {
    export: (spans: ReadableSpan[], callback: (result: ExportResult) => void): void => {
      containExport(state, "traces", "TRACE_EXPORT_FAILED", spans.length, callback, (complete) =>
        exporter.export(spans, complete)
      );
    },
    shutdown: () => exporter.shutdown(),
    ...(exporter.forceFlush === undefined
      ? {}
      : { forceFlush: () => exporter.forceFlush?.() ?? Promise.resolve() }),
  };
}

function accountingLogExporter(
  exporter: LogRecordExporter,
  state: TelemetryRecordState
): LogRecordExporter {
  return {
    export: (records: ReadableLogRecord[], callback: (result: ExportResult) => void): void => {
      containExport(state, "logs", "LOG_EXPORT_FAILED", records.length, callback, (complete) =>
        exporter.export(records, complete)
      );
    },
    shutdown: () => exporter.shutdown(),
  };
}

function accountingMetricExporter(
  exporter: PushMetricExporter,
  state: TelemetryRecordState
): PushMetricExporter {
  return {
    export: (metrics: ResourceMetrics, callback: (result: ExportResult) => void): void => {
      containExport(
        state,
        "metrics",
        "METRIC_EXPORT_FAILED",
        countMetricPoints(metrics),
        callback,
        (complete) => exporter.export(metrics, complete)
      );
    },
    forceFlush: () => exporter.forceFlush(),
    shutdown: () => exporter.shutdown(),
    ...(exporter.selectAggregationTemporality === undefined
      ? {}
      : {
          selectAggregationTemporality: (
            ...args: Parameters<NonNullable<PushMetricExporter["selectAggregationTemporality"]>>
          ) =>
            exporter.selectAggregationTemporality?.(...args) as ReturnType<
              NonNullable<PushMetricExporter["selectAggregationTemporality"]>
            >,
        }),
    ...(exporter.selectAggregation === undefined
      ? {}
      : {
          selectAggregation: (
            ...args: Parameters<NonNullable<PushMetricExporter["selectAggregation"]>>
          ) =>
            exporter.selectAggregation?.(...args) as ReturnType<
              NonNullable<PushMetricExporter["selectAggregation"]>
            >,
        }),
  };
}

function containExport(
  state: TelemetryRecordState,
  signal: "traces" | "metrics" | "logs",
  diagnosticCode: string,
  count: number,
  callback: (result: ExportResult) => void,
  start: (complete: (result: ExportResult) => void) => void
): void {
  let completed = false;
  const complete = (result: ExportResult): void => {
    if (completed) return;
    completed = true;
    if (result.code === ExportResultCode.SUCCESS) {
      accountExportCallbackItems(state, signal, "successItems", count);
    } else {
      accountExportCallbackItems(state, signal, "failureItems", count);
      retainDiagnostic(state, recordDiagnostic("export", diagnosticCode));
    }
    callback(result);
  };
  try {
    start(complete);
  } catch {
    complete({ code: ExportResultCode.FAILED });
  }
}

function countMetricPoints(metrics: ResourceMetrics): number {
  return metrics.scopeMetrics.reduce(
    (scopeTotal, scope) =>
      scopeTotal +
      scope.metrics.reduce((metricTotal, metric) => metricTotal + metric.dataPoints.length, 0),
    0
  );
}
