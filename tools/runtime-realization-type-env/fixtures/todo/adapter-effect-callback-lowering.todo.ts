// TODO/P2: prove native host callbacks lower into process runtime invocation.
//
// Surface adapters should resolve executable boundaries through the
// ExecutionRegistry and delegate to ProcessExecutionRuntime. They must not run
// RawrEffect, construct EffectRuntimeAccess, or create ManagedRuntime values.

export interface ExpectedAdapterEffectCallbackLowering {
  readonly adapterInput: "compiled-surface-plan";
  readonly registryLookup: "required";
  readonly invocationRuntime: "process-execution-runtime";
  readonly rawEffectExecutionInAdapter: "forbidden";
  readonly nativeHosts: readonly [
    "server",
    "async",
    "cli",
    "web",
    "agent",
    "desktop",
  ];
}
