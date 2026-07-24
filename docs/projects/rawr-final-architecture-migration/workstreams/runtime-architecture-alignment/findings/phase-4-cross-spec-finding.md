# Phase 4 Cross-Spec Integrated Finding

**Reviewer:** Opus integration reviewer (Layer-3 cross-spec)
**Phase:** 4 (final review before closure)
**Date:** 2026-05-04

## Test results

- **Test 1 (information shape): pass.** A deployment-companion author can land each artifact in one hop:
  - Integration boundaries registry — §10.14 (table at L1829, attachment protocol at §10.14.1, worked example at §10.14.2, phase-transition at §10.14.3, error-propagation at §10.14.4).
  - Platform external interfaces — §15.8 (L2654, table at L2658).
  - Per-harness contract — §13.1–§13.6 (L2209–L2337) with companion attachment requirements §13.8 (L2345).
  - Names-versus-mechanics rule — §4.3a (L497).
  - Execution-ownership law citation — §4.0 (L418).
  - Attachment protocol — §10.14.1 (L1843, six rules).
  - The §1 scope (L25) explicitly forwards readers to §10.14 + §4.3a + the runtime-spec, closing the loop on first-pass discovery.

- **Test 2 (per-name rule grep): pass.**
  - `ProcessQueueHubResource|ProcessPubSubHubResource|ProcessConcurrencyLimiterResource|ProcessCacheHubResource` → 0 hits.
  - `Effect.Service` → 0 hits.
  - `HarnessDescriptor|StartedHarness|FunctionBundle|MountedSurfaceRuntimeRecord|CompiledSurfacePlan|ExecutionRegistry|PortableRuntimePlanArtifact` → all present (concentrated in §10.12, §10.14, §13.x, §15.8); each named type appears at least three times in body prose, not only in tables.
  - `RuntimeCatalog|RuntimeDiagnostic|RuntimeTelemetry` → present in §10.13 (L1811), §15.8 (L2658-L2663), §17.8 (L2800), §17.12 (L2840), and the registry rows of §10.14 (L1840-L1841).

- **Test 3 (boundary honesty): pass.**
  - §10.4 (L1673-L1679) compresses to a 3-paragraph stance + a deferral pointer to runtime-spec §15. No 9-item artifact list.
  - §10.5 (L1681-L1689) compresses to a 4-paragraph stance + deferral pointer to runtime-spec §16. No validation list, no emission list.
  - §10.6 (L1691-L1706) names the RAWR/Effect control split and defers process-local coordination resources + Effect-internal substrate primitives to runtime-spec §14 and §17.3. No "queues, pubsub, refs, schedules, caches, fibers, semaphores" enumeration in §10.6 (those words appear only at §10.14.2 L1861 inside a worked-example warning that the arch-spec must NOT enumerate them — meta-citation, not assertion).
  - §17.6 (L2768-L2777) reads as eight invariant bullets + a final deferral; no primitive enumeration.

- **Test 4 (registry coherence): pass.**
  - Lifecycle vocabulary row lists the 7 phase names (L1831).
  - SDK derivation row enumerates artifact category names: `NormalizedAuthoringGraph`, `PortableRuntimePlanArtifact`, `ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `ExecutionDescriptorTable`.
  - Harness boundary row carries `HarnessDescriptor`, `StartedHarness`, plus per-harness payload types — every named type recurs in §13.x integration-contract paragraphs and §13.8.
  - Service-binding row (L1836) post-Phase-3 enumerates the five context lanes: `deps`, `scope`, `config`, `invocation`, `provided` — confirmed.
  - Control-plane / Diagnostics rows correctly cite §15.8; all four interfaces (`PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`) appear as §15.8 table rows (L2660-L2663) and as §17.12 closing seam (L2840).

- **Test 5 (cross-spec coherence): pass.**
  - Runtime-spec L36 region: "Canonical source of this law: `RAWR_Canonical_Architecture_Spec.md`, §4.0. This section reproduces the law as runtime-realization context; arch-spec §4.0 is authoritative if the two diverge." — confirmed at L36.
  - Runtime-spec §29 supersession clause (L5260-L5262) is scoped to "Older indexed runtime/effect documents that still self-identify as canonical or still describe superseded `.handler(...)`, Promise/handler execution branches, global `fx` authoring, or runtime-bound descriptor closure patterns." It targets stale indexed/runtime artefacts, not the arch-spec. Arch-spec §1 (L7-L25) declares itself the canonical integrated layer with the runtime-spec attached as canonical companion. Per Decision #6 (Option B), this is consistent — no contradiction.
  - Arch-spec §17.8 closing invariant (L2802) "all runtime mechanics, artifact shapes, named coordination resources, and substrate internals are defined in the canonical runtime realization specification" aligns with runtime-spec §1 (L8-L20) scope ("runtime realization, ... SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning ... harness mounting, diagnostics, telemetry, and deterministic finalization") and runtime-spec §22 owning RuntimeDiagnostic, RuntimeTelemetry, RuntimeCatalog field shapes. Bidirectional claim is honoured.

## Findings

No P1, P2, or P3 findings raised. All five integration tests pass with concrete evidence.

Optional polish (not raised as P3 because the prose is already serviceable): §10.14.2's Bootgraph bullet (L1861) is the one place where the seven Effect-internal primitives are typed in the arch-spec — they appear inside a meta-instruction ("the arch-spec must NOT enumerate them"). This is intentional teaching-by-citation and does not violate Test 3. No edit recommended.

## Phase 3 audit (subsumed)

- **Lane 3.1 §10.2 Derivation row: pass.** Lifecycle vocabulary captured at §10.14 row 1 references §24.2 / §22.1; the seven-phase vocabulary is established and consumed by the SDK derivation handoff row.
- **Lane 3.2 §17.8 terminal invariant: pass.** L2802 restates the bidirectional claim — arch-spec owns integration vocabulary + invariant statements; runtime-spec owns mechanics. Closes §17.8 cleanly.
- **Lane 3.3 L25 §4.3a cross-ref: pass.** §1 scope paragraph (L25) names §10.14 and §4.3a as the governing structural seams; first-time readers cannot miss the carve-out.
- **Lane 3.4 §10.14 service binding 5-lane: pass.** Row at L1836 enumerates `deps`, `scope`, `config`, `invocation`, `provided` as integration vocabulary (consistent with §17.7 invariants and §10.8 service-handler clause).
- **Lane 3.5 §17.8 RuntimeAccess scoping: pass.** L2795 carries "service handlers do not receive broad `RuntimeAccess`; only their declared `deps`, `scope`, `config`, per-call `invocation`, and execution-derived `provided`" — the canonical scoping invariant.

## Summary

- **Layer-3 status: pass.**
- **Phase-4 close gate: pass.**
- **Closure readiness: ready for Phase 5.**
- **DRA next action:** advance to Phase 5 (closure with F5 steward + auditor), assemble final closure record citing this finding + the per-lane Phase 1–3 findings, then open the PR. No repair lanes required.
