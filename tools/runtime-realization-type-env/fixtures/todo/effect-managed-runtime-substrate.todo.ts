// TODO/P1: prove the runtime substrate owns exactly one Effect managed runtime
// per started process.
//
// The lab should eventually model:
// - ManagedRuntimeHandle as runtime-substrate-only.
// - EffectRuntimeAccess as SDK-internal/process-runtime-only.
// - Layer/Scope construction and disposal as provisioning/finalization mechanics.
// - no public service/plugin/app/provider declaration receiving runtime handles.
//
// This remains xfail because the lab now proves real Effect mechanics but has
// not locked the final RAWR-owned runtime-substrate public/internal contract.

export interface ExpectedManagedRuntimeSubstrateProof {
  readonly owner: "runtime-substrate";
  readonly processManagedRuntime: "single-per-started-process";
  readonly publicAuthoringAccess: "forbidden";
  readonly lifecycle: "provisioning-invocation-finalization";
}
