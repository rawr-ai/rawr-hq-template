// TODO/P1: prove the runtime substrate owns exactly one Effect managed runtime
// per started process.
//
// The lab should eventually model:
// - ManagedRuntimeHandle as runtime-substrate-only.
// - EffectRuntimeAccess as SDK-internal/process-runtime-only.
// - Layer/Scope construction and disposal as provisioning/finalization mechanics.
// - no public service/plugin/app/provider declaration receiving runtime handles.
//
// This remains xfail because the current lab uses inert RawrEffect sentinels and
// does not compile against or execute the real Effect runtime.

export interface ExpectedManagedRuntimeSubstrateProof {
  readonly owner: "runtime-substrate";
  readonly processManagedRuntime: "single-per-started-process";
  readonly publicAuthoringAccess: "forbidden";
  readonly lifecycle: "provisioning-invocation-finalization";
}
