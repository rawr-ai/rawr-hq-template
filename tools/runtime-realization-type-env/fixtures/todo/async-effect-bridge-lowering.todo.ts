// TODO/P2 residual: prove production async step-local Effect bridge lowering.
//
// The contained lab now proves async bridge payloads that preserve
// workflow/schedule/consumer owner identity and delegate through
// ProcessExecutionRuntime. Remaining work is native Inngest FunctionBundle or
// worker mounting and durable host semantics.

export interface ExpectedAsyncEffectBridgeLowering {
  readonly stepDescriptor: "pre-derived";
  readonly provenLabInvocation: "adapter.async-step-bridge-payload";
  readonly processRuntime: "required";
  readonly durableSemanticsOwner: "async-host";
  readonly localEffectOwner: "process-execution-runtime";
  readonly remainingFunctionBundle: "required";
  readonly remainingDurableScheduling: "required";
}
