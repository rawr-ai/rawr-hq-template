// TODO/P2: prove async step-local Effect bridge lowering.
//
// This is separate from async step membership. Membership identifies which
// workflow/schedule/consumer owns a step. Bridge lowering proves a host step
// invocation runs the pre-derived step descriptor through ProcessExecutionRuntime
// and EffectRuntimeAccess.

export interface ExpectedAsyncEffectBridgeLowering {
  readonly stepDescriptor: "pre-derived";
  readonly hostInvocation: "adapter-lowered";
  readonly processRuntime: "required";
  readonly durableSemanticsOwner: "async-host";
  readonly localEffectOwner: "process-execution-runtime";
}
