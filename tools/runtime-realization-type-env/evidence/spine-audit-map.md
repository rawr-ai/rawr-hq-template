# Spine Audit Map

This map keeps the type environment honest about what it proves now and what it deliberately leaves unresolved.

| Issue | Harness status | Treatment |
| --- | --- | --- |
| Accepted descriptor refs | Proof | `ExecutionDescriptorRef` is boundary-discriminated and rejects impossible async owner shapes. |
| Accepted Effect authoring | Proof | RAWR `.effect(...)` is the runtime-realization authoring terminal; `.handler(...)`, Promise bodies, and raw generator yields fail type checks in this pseudo-SDK. This is not an oRPC-native API claim. |
| Accepted invocation clients | Proof | Process runtime simulation resolves a registry boundary and supplies runtime-bound values through invocation context; service procedure calls still require `.withInvocation(...)`. |
| Accepted portable refs only | Proof | Portable artifacts reject descriptor tables and executable closures. |
| Accepted provider profile closure | Proof | Selected providers must cover non-optional provider resource requirements before boot. |
| P0 async step membership | Expected fail | Current fixture shows the accepted step body shape, but declarative workflow-to-step ownership remains unresolved. |
| P1 ProviderEffectPlan shape | Expected fail | The plan is intentionally opaque until the spec locks the producer/consumer fields. |
| P1 dispatcher access | Expected fail | The type env does not invent `useWorkflowDispatcher(...)` or an alternate operation policy. |
| P1 RuntimeResourceAccess | Expected fail | The facade is branded and narrow, but method law is intentionally not invented. |
| P2 server route derivation | Expected fail | Cold route descriptors are modeled, but the exact derivation operation remains a spec decision. |
| P2 initial resource/provider cut | TODO | Catalog candidates are planning input, not canonical ids. |
| Source-hygiene drift | Out of scope | The stale repo-local spec copy must be handled elsewhere before migration planning. |
