// TODO/P2 residual: prove production native host callbacks lower into process
// runtime invocation.
//
// The contained lab now proves native-shaped server callback payloads that
// preserve route/ref identity and delegate through ProcessExecutionRuntime.
// A contained oRPC Fetch request can now enter this path through the mini
// server harness. Remaining work is real host integration: Elysia mounting,
// production oRPC lifecycle, native host error mapping, boundary policy, and
// production package topology.

export interface ExpectedAdapterEffectCallbackLowering {
  readonly provenLabInput: "adapter.server-callback-payload";
  readonly registryLookup: "required";
  readonly invocationRuntime: "process-execution-runtime";
  readonly rawEffectExecutionInAdapter: "forbidden";
  readonly remainingNativeHosts: readonly ["server", "async", "cli", "web", "agent", "desktop"];
  readonly remainingBoundaryPolicy: "required";
  readonly remainingProductionHostLifecycle: "required";
}
