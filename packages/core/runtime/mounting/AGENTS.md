# Runtime Mounting

## Purpose
Own one process's native mounting and cross-owner single-flight finalization.
This is a private package-less Nx owner.

## Boundaries
Direct private edges are definition, process-runtime and harnesses only.
The SDK supplies an exact prepared process, ordered native descriptors, an
explicit validated stop policy and the definition-owned observation port.
Never import the SDK, compiler, derivation, bootgraph, substrate or observation
implementation. Do not bind services, lower adapters, acquire resources or
construct a managed runtime. Only this owner creates private StartedHarness
records; none of its returned public-safe operations exposes a native handle
or process resource access.

## Behavior
Preflight the complete selected descriptor set and claim the exact handoff
once before native mutation. Mount sequentially, retaining only successful
native handles. Close executable and health admission synchronously on stop,
then settle native stops in reverse order before invoking process stop once.
One promise owns finalization; a deadline reports pending work without force,
early release or false completion. Failed native mounts settle their own
partial cleanup; native stops settle their probes and cleanup before rejection.
Preserve an original mount failure even when rollback also fails.

Health has no startup poller, timer or queue. Required resources gate mounting;
each selected harness contributes truthful per-kind evidence. Missing and
rejected probes remain unknown, and explicit not-applicable is neutral for
readiness. Accept reports during mount without inventing mounted facts before
success. Observation failures never change lifecycle authority or outcomes.

## Validation
Run owner types, focused behavior and disposable Nx cache proofs. Owner tests
consume a real process-owned handoff fixture with labeled test readiness/stop
ports. Real provisioned resources and native hosts are SDK integration proof,
not invented by the owner fixture. Native source-law acceptance runs separately.
