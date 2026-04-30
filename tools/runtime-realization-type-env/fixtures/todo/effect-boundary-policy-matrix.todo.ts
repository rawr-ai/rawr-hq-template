// TODO/P1 residual: lock production effect boundary policy semantics.
//
// The contained lab now proves record-only executable/provider boundary policy
// metadata for exact boundary kinds, timeout fields, retry-attempt declaration,
// AbortSignal interruption propagation, Exit/Cause classification, and redacted
// attributes. Remaining work is final public policy API/DX, production retry
// scheduling, durable async policy, telemetry export, and host-specific error
// mapping.

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
  readonly provenLabRecord: "runtime.boundary-policy-record";
  readonly boundary: ExpectedEffectBoundaryKind;
  readonly timeoutMetadata: "recorded";
  readonly retryAttemptDeclaration: "recorded-without-scheduler";
  readonly interruptionPropagation: "contained-effect-runtime";
  readonly telemetryMode: "record-only";
  readonly redaction: "structured-attributes";
  readonly exitCauseClassification: "contained-effect-runtime";
  readonly remainingPublicPolicyApi: "required";
  readonly remainingProductionRetryScheduler: "required";
  readonly remainingHostErrorMapping: "required";
  readonly remainingTelemetryExport: "required";
}
