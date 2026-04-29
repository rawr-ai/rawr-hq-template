import type { RawrEffect } from "@rawr/sdk/effect";

// TODO/P1: replace opaque ProviderEffectPlan with the final producer/consumer
// shape for provisioning.
//
// This is distinct from compiled execution plans. Provider acquire/release runs
// through bootgraph/provisioning lowering, not through ProcessExecutionRuntime.

export interface ExpectedProviderEffectPlanLowering<TValue, TError = never> {
  readonly kind: "provider.effect-plan";
  readonly phase: "acquire" | "release";
  readonly effect: RawrEffect<TValue, TError>;
  readonly telemetry: "provider-boundary-labels-required";
  readonly errors: "provider-errors-map-to-provisioning-diagnostics";
  readonly scope: "process-or-role-finalizer";
}
