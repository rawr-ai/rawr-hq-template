// TODO/P1: lock the effect boundary policy matrix.
//
// Every executable boundary needs explicit timeout, retry, interruption,
// telemetry, redaction, and error/exit mapping metadata. The lab should prove
// the metadata is present without inventing final defaults prematurely.

export type ExpectedEffectBoundaryKind =
  | "service.procedure"
  | "plugin.server-api"
  | "plugin.server-internal"
  | "plugin.async-step"
  | "plugin.cli-command"
  | "plugin.agent-tool"
  | "plugin.desktop-background"
  | "provider.acquire"
  | "provider.release";

export interface ExpectedEffectBoundaryPolicy {
  readonly boundary: ExpectedEffectBoundaryKind;
  readonly timeout: "required-or-explicitly-inherited";
  readonly retry: "none-explicit-or-boundary-default";
  readonly interruption: "boundary-specific";
  readonly telemetryLabels: readonly string[];
  readonly redaction: "required";
  readonly errorBridge: "required";
}
