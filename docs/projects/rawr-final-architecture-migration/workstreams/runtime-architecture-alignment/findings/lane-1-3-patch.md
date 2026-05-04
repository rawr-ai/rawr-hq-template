# Lane 1.3 Patch — Harness-mount boundary types and per-harness contracts

**Lane:** 1.3  
**Worker:** Worker C  
**Recommendation:** #3 — Named harness-mount boundary types (§10.12) + per-harness contract paragraphs (§13.1–§13.6) + new §13.8 companion harness attachment requirements + traceId integration invariant  
**Decisions in effect:** Decision #4 = Option A (full 7-type subset); Decision #2 = Option B (OpenShell third-party with vendor contract)  
**Depends on:** Lanes 1.1 (carve-out) and 1.2 (registry), both landed

---

## Sub-edit 1.3.A — Replace §10.12 entirely

**Spec location:** Lines 1808–1816  

**BEFORE:**

```
### 10.12 Harness and native boundary

Harnesses own native mounting after runtime realization and adapter lowering.

They consume mounted surface runtime records and adapter-lowered payloads, then return started harness handles.

Harness startup records every successful mount. Startup rollback and normal finalization stop harnesses in reverse mount order before releasing role and process scopes.

Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads.
```

**AFTER:**

```
### 10.12 Harness and native boundary

Harnesses own native mounting after runtime realization and adapter lowering. Every harness implementation must satisfy the `HarnessDescriptor` interface defined in the runtime realization specification, §21.

**Integration contract.** Each harness receives:

- `MountedSurfaceRuntimeRecord[]` — the set of adapter-lowered surface records assembled by the process runtime from compiled surface plans and lowered native payloads;
- `ProcessRuntimeAccess` — scoped process-level access (no raw Effect internals, no provider internals, no unredacted config);
- `RuntimeTelemetry` — the telemetry carrier for tracing across the mounting phase.

Each harness returns a `StartedHarness` that carries mount identity, topology records, and an optional `stop()` finalizer invoked by rollback and finalization in reverse mount order.

**Inngest harness exception.** The Inngest harness receives a `FunctionBundle` (the async surface adapter's lowered artifact) rather than generic `MountedSurfaceRuntimeRecord` entries. `FunctionBundle` is defined in the runtime realization specification, §19.3.

**Compiled surface plan boundary.** Surface adapters lower `CompiledSurfacePlan` (defined in the runtime realization specification, §16) into harness-facing native payloads. Adapters resolve executable invocation boundaries through `ExecutionRegistry` (runtime spec §9.2 and §18.3); they do not independently pair compiled execution plans with descriptors.

**`traceId` integration invariant.** `EffectBoundaryContext.traceId` is required at every RAWR-owned executable invocation boundary. If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`. Mechanics for the boundary context type and the trace-mint rule are defined in the runtime realization specification, §9.2.

**Pre-runtime artifact reference.** `PortableRuntimePlanArtifact` (the pre-runtime planning artifact named at §15.8) is consumed at the runtime-compiler boundary upstream of harness mounting; harnesses do not consume it directly. It is named here for completeness because companion deployment specs cross-referencing harness behavior need to reach this artifact through the §15.8 platform external interfaces table.

**Boundary rule.** RAWR hands harnesses runtime-realized payloads; native framework interiors own native execution semantics from that point. Harnesses must not consume raw authoring declarations, SDK graphs, or compiler plans directly. Per-harness integration contracts are specified in §13.1–§13.6 below; the complete per-harness input/output and boundary rules are defined in the runtime realization specification, §21.

Harness startup records every successful mount. Startup rollback and normal finalization stop harnesses in reverse mount order before releasing role and process scopes.
```

---

## Sub-edit 1.3.B — Append integration-contract paragraph to §13.1 (Server / Elysia)

**Spec location:** Line 2233  

**BEFORE:**

```
Elysia owns HTTP host lifecycle and request routing. It does not own public API meaning, service construction, provider selection, app membership, or runtime provisioning.
```

**AFTER:**

```
Elysia owns HTTP host lifecycle and request routing. It does not own public API meaning, service construction, provider selection, app membership, or runtime provisioning.

**Integration contract.** The Elysia harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered oRPC/Elysia route payloads, server harness configuration, and `ProcessRuntimeAccess`. It must return a `StartedHarness`. RAWR owns compiled surface plans, route payload closures, and delegation to the process execution runtime at invocation time; Elysia owns HTTP host lifecycle and request routing. The complete input/output contract is defined in the runtime realization specification, §21.1.
```

---

## Sub-edit 1.3.C — Append integration-contract paragraph to §13.2 (Async / Inngest)

**Spec location:** Line 2252  

**BEFORE:**

```
Inngest owns durable async execution semantics. It does not own workflow meaning, service truth, caller-facing API semantics, app membership, provider selection, or runtime provisioning.
```

**AFTER:**

```
Inngest owns durable async execution semantics. It does not own workflow meaning, service truth, caller-facing API semantics, app membership, provider selection, or runtime provisioning.

**Integration contract.** The Inngest harness receives a `FunctionBundle` (runtime-spec §19.3) — not `MountedSurfaceRuntimeRecord` entries — along with the selected Inngest runtime resource and async harness mode. It must return a `StartedHarness`. RAWR owns async surface plan compilation, FunctionBundle derivation, and workflow dispatch semantics; Inngest owns durable async execution semantics. The complete contract and mode specifications are defined in the runtime realization specification, §21.2.
```

---

## Sub-edit 1.3.D — Append integration-contract paragraph to §13.3 (CLI / OCLIF)

**Spec location:** Line 2271  

**BEFORE:**

```
OCLIF owns command execution semantics. It does not own plugin management truth, service semantics, runtime provisioning, or app selection.
```

**AFTER:**

```
OCLIF owns command execution semantics. It does not own plugin management truth, service semantics, runtime provisioning, or app selection.

**Integration contract.** The OCLIF harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered command payloads and `ProcessRuntimeAccess`. It must return a `StartedHarness`. RAWR owns compiled surface plans, command payload closures, and delegation to the process execution runtime at invocation time; OCLIF owns command parsing and dispatch lifecycle. The complete input/output contract is defined in the runtime realization specification, §21.3.
```

---

## Sub-edit 1.3.E — Append integration-contract paragraph to §13.4 (Web)

**Spec location:** Line 2290  

**BEFORE:**

```
Web hosts own rendering, bundling, routing, and browser-native behavior inside their boundary. They do not own service truth, server API projection classification, or provider acquisition.
```

**AFTER:**

```
Web hosts own rendering, bundling, routing, and browser-native behavior inside their boundary. They do not own service truth, server API projection classification, or provider acquisition.

**Integration contract.** The web harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered web host payloads and `ProcessRuntimeAccess`. It must return a `StartedHarness`. RAWR owns compiled surface plans and web host payload closures; the selected web host owns rendering, bundling, routing, and browser-native behavior. The complete input/output contract is defined in the runtime realization specification, §21.4.
```

---

## Sub-edit 1.3.F — Replace §13.5 closing paragraph (Agent / OpenShell, third-party vendor contract)

**Spec location:** Line 2309  

**BEFORE:**

```
OpenShell and agent hosts own native shell behavior inside their harness boundary. Agent governance remains a reserved boundary with locked integration hooks. Agent plugins do not move service truth or broad runtime access into agent-local semantics.
```

**AFTER:**

```
OpenShell and agent hosts own native shell behavior inside their harness boundary. Agent governance remains a reserved boundary with locked integration hooks. Agent plugins do not move service truth or broad runtime access into agent-local semantics.

**Integration contract.** The agent harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered agent-channel, shell, and tool payloads and `ProcessRuntimeAccess`. It must return a `StartedHarness`. RAWR owns compiled surface plans, agent payload closures, and delegation to the process execution runtime at invocation time; the OpenShell vendor owns native shell behavior, the policy envelope, and the agent-role substrate after RAWR adapter lowering. The complete input/output contract is defined in the runtime realization specification, §21.5.

**Third-party vendor contract.** OpenShell is a third-party vendor — parallel to the platform's existing treatment of Inngest, oRPC, Effect, Elysia, OCLIF, and Bun. The vendor contract requires: (a) implementation of the agent-runtime substrate behind the `HarnessDescriptor` interface defined in the runtime realization specification §21; (b) preservation of the `EffectBoundaryContext.traceId` invariant at every agent-tool invocation boundary; (c) emission of `RuntimeDiagnostic`-conforming findings for all mount and policy-decision failures; (d) respect for the reserved-boundary clause at arch-spec §10.12 and runtime-spec §21.5. The vendor contract shape is locked at this specification revision; the choice of which third-party OpenShell implementation satisfies the contract is a reserved-detail boundary, locked when an implementation slice triggers the need.
```

---

## Sub-edit 1.3.G — Append integration-contract paragraph to §13.6 (Desktop)

**Spec location:** Line 2328  

**BEFORE:**

```
Desktop hosts own native desktop interiors. Menubar, window, and background surfaces are process-local projections. Durable business execution remains on `async`.
```

**AFTER:**

```
Desktop hosts own native desktop interiors. Menubar, window, and background surfaces are process-local projections. Durable business execution remains on `async`.

**Integration contract.** The desktop harness receives `MountedSurfaceRuntimeRecord[]` carrying adapter-lowered menubar, window, and background surface payloads and `ProcessRuntimeAccess`. It must return a `StartedHarness`. RAWR owns compiled surface plans and desktop surface payload closures; the selected desktop host owns native desktop interiors. The complete input/output contract is defined in the runtime realization specification, §21.6.
```

---

## Sub-edit 1.3.H — Insert new §13.8 between §13.7 and §14

**Spec location:** Lines 2334–2338  

**BEFORE:**

```
Harness-edge wrappers may normalize host-specific invocation context, correlation propagation, or mount behavior. They must remain wrappers only.

---

## 14. Operational mapping and growth model
```

**AFTER:**

```
Harness-edge wrappers may normalize host-specific invocation context, correlation propagation, or mount behavior. They must remain wrappers only.

### 13.8 Companion harness attachment requirements

Companion harness specifications (vendor-specific harness implementation contracts written outside this canonical architecture specification) must satisfy the following five lettered requirements:

(a) Implement against named boundary types only — `HarnessDescriptor<TPayload>`, `MountedSurfaceRuntimeRecord<TPayload>`, `StartedHarness` — never against SDK derivation artifacts (`NormalizedAuthoringGraph`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`) or compiler-internal artifacts (`CompiledExecutionPlan`, `CompiledProcessPlan`).

(b) The `mount(...)` method may not acquire providers, construct service bindings, or access raw Effect internals.

(c) Emit `RuntimeDiagnostic`-conforming findings for all mount failures.

(d) Respect `EffectBoundaryContext.traceId` as the required invocation correlation field. This requirement is non-negotiable and cannot be deferred to a native host that does not support tracing; if the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`.

(e) Resolve executable invocation boundaries through `ExecutionRegistry`, not by independently pairing compiled execution plans with descriptors.

The §10.14 registry's "Harness and native boundary" row enumerates the named interface types companion harness specifications attach to.

---

## 14. Operational mapping and growth model
```
