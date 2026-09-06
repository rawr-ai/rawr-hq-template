/**
 * Cold telemetry declarations, provider-neutral values and explicit native configuration.
 *
 * @remarks
 * This subpath exports no provider acquisition, lease, exporter factory, or
 * instrumentation bootstrap. Habitat runtime provisioning owns those mechanics;
 * author code may add only optional semantic enrichment through its owning surface.
 */

export type {
  EmitTechnicalLogInput,
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryAttributes,
  TelemetryAvailability,
  TelemetryDiagnostic,
  TelemetryDiagnosticStage,
  TelemetryDiagnostics,
  TelemetryExportCallbackAccounting,
  TelemetryLogSeverity,
  TelemetryProcessIdentity,
  TelemetryResource,
} from "@habitat-ai/resource-telemetry";
export {
  EmitTechnicalLogInputSchema,
  FlushTelemetryInputSchema,
  FlushTelemetryResultSchema,
  TelemetryAttributeKeySchema,
  TelemetryAttributesSchema,
  TelemetryAvailabilitySchema,
  TelemetryDiagnosticSchema,
  TelemetryDiagnosticStageSchema,
  TelemetryDiagnosticsSchema,
  TelemetryExportCallbackAccountingSchema,
  TelemetryIdentityTextSchema,
  TelemetryLogSeveritySchema,
  TelemetryProcessIdentitySchema,
} from "@habitat-ai/resource-telemetry";
export type {
  DisabledOpenTelemetryNodeConfig,
  EnabledOpenTelemetryNodeConfig,
  OpenTelemetryNodeConfig,
} from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
export {
  DisabledOpenTelemetryNodeConfigSchema,
  EnabledOpenTelemetryNodeConfigSchema,
  OpenTelemetryNodeConfigSchema,
} from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
export { defineOpenTelemetryNodeRuntimeProvider } from "../../../../resources/telemetry/providers/opentelemetry-node/runtime";
export { TelemetryRuntimeResource } from "../../../../resources/telemetry/runtime";
