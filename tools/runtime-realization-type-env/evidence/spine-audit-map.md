# Spine Audit Map

This map keeps the type environment honest about what it proves now and what it deliberately leaves unresolved.

| Issue | Harness status | Treatment |
| --- | --- | --- |
| Accepted descriptor refs | Proof | `ExecutionDescriptorRef` is boundary-discriminated and rejects impossible async owner shapes. |
| Accepted Effect authoring | Proof | RAWR `.effect(...)` is the runtime-realization authoring terminal; `.handler(...)`, Promise bodies, and raw generator yields fail type checks. This is not an oRPC-native API claim. |
| Accepted curated Effect public surface | Vendor proof | `@rawr/sdk/effect` is backed by real `effect@3.21.2` while curated authoring still rejects raw runtime constructors and unverified `Effect.pipe` spelling. |
| Accepted invocation clients | Simulation proof | The mini runtime resolves a registry boundary and supplies runtime-bound values through invocation context; service procedure calls still require `.withInvocation(...)`. |
| Accepted portable refs only | Proof | Portable artifacts reject descriptor tables and executable closures. |
| Accepted provider profile closure | Simulation proof | Selected providers must cover non-optional provider resource requirements before boot. |
| Effect runtime substrate vendor behavior | Vendor proof | Real Effect execution, `ManagedRuntime`, `Exit`/`Cause`, scope/finalizers, interruption, and composition spelling are tested against the installed package. |
| Process-local coordination vendor behavior | Vendor proof | Real `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, and `Stream` are tested as process-local primitives only. |
| Boundary vendor shapes | Vendor proof | TypeBox, oRPC, and Inngest probes prove narrow package shapes without claiming production host semantics. |
| Mini runtime registry/invocation | Simulation proof | Descriptor table, registry, full ref identity checks, runtime-owned Effect access, adapter delegation, and deployment handoff are tested in the contained miniature. |
| P0 async step membership | Expected fail | Current fixture shows the accepted step body shape, but declarative workflow-to-step ownership remains unresolved. |
| P1 ProviderEffectPlan shape | Expected fail | The plan is intentionally opaque until the spec locks the producer/consumer fields. |
| P1 Effect managed runtime substrate | Expected fail | Vendor primitives are now proven, but the final RAWR-owned substrate public/internal contract remains open. |
| P1 process-local coordination resources | Expected fail | Vendor primitives are now proven as local infrastructure, but final RAWR resource contracts and method law remain open. |
| P1 provider plan lowering | Expected fail | Provider acquire/release lowering remains bootgraph/provisioning work, separate from compiled execution plans and invocation runtime. |
| P1 Effect boundary policy matrix | Expected fail | Timeout, retry, interruption, telemetry, redaction, and error/exit mapping need locked metadata before positive proof. |
| P1 safe Effect composition surface | Expected fail | The curated helper list and vendor-aligned names remain open; raw runtime constructors stay forbidden. |
| P1 dispatcher access | Expected fail | The type env does not invent `useWorkflowDispatcher(...)` or an alternate operation policy. |
| P1 RuntimeResourceAccess | Expected fail | The facade is branded and narrow, but method law is intentionally not invented. |
| P2 server route derivation | Expected fail | Cold route descriptors are modeled, but the exact derivation operation remains a spec decision. |
| P2 adapter Effect callback lowering | Expected fail | Native callbacks must go through registry resolution and `ProcessExecutionRuntime`; real adapter implementations remain out of scope. |
| P2 async Effect bridge lowering | Expected fail | Step-local Effect bridge lowering is distinct from membership and host durable semantics. |
| P2 initial resource/provider cut | TODO | Catalog candidates are planning input, not canonical ids. |
| P2 runtime profile config redaction | TODO | Typed config binding and diagnostic-safe secret emission remain planning input until the runtime/deployment handoff is locked. |
| Source-hygiene drift | Out of scope | The stale repo-local spec copy must be handled elsewhere before migration planning. |
