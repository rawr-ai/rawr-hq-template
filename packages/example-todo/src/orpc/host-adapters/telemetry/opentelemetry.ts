/**
 * @fileoverview Host-side OpenTelemetry adapter seam for the proto SDK.
 *
 * @remarks
 * OpenTelemetry remains a host-owned concrete integration. This file makes that
 * ownership explicit and keeps the concrete telemetry binding out of package
 * ports.
 *
 * The current proto SDK uses the OpenTelemetry API directly through this host
 * adapter seam rather than inventing a separate package-facing telemetry port.
 */

export type { Attributes, Span } from "@opentelemetry/api";
export { SpanStatusCode, trace } from "@opentelemetry/api";
