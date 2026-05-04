// TODO/P2 residual: prove production async step-local Effect bridge lowering.
//
// The contained lab now proves async bridge payloads that preserve
// workflow/schedule/consumer owner identity, delegate through
// ProcessExecutionRuntime, and can be reached through a contained Inngest Bun
// serve/function/step boundary. Remaining work is production Inngest
// FunctionBundle or worker mounting and durable host semantics.

export interface ExpectedAsyncEffectBridgeLowering {
  readonly stepDescriptor: "pre-derived";
  readonly provenLabInvocation: "adapter.async-step-bridge-payload";
  readonly processRuntime: "required";
  readonly durableSemanticsOwner: "async-host";
  readonly localEffectOwner: "process-execution-runtime";
  readonly provenContainedInngestStepBoundary: "required";
  readonly remainingFunctionBundle: "required";
  readonly remainingDurableScheduling: "required";
}
