# Lane 1.3 Leaf Finding — Rec #3 Harness-mount types + per-harness contracts

**Reviewer:** Opus inquisitor (Inquisitor C, Phase 1 fleet)
**Lane:** 1.3
**Recommendation:** #3 — §10.12 named harness-mount types + per-harness contract paragraphs (§13.1–§13.6) + new §13.8 + traceId invariant
**Decisions in effect:** #4 = Option A (full 7-type subset); #2 = Option B (OpenShell third-party with vendor contract)

## Findings

### Finding 1: §10.12 — full 7-type subset present (Decision #4 = A)
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md` L1808–L1830. All seven names appear in the new §10.12: `CompiledSurfacePlan` (L1822), `FunctionBundle` (L1820), `MountedSurfaceRuntimeRecord` (L1814, L1820), `HarnessDescriptor` (L1810), `StartedHarness` (L1818), `ExecutionRegistry` (L1822), `PortableRuntimePlanArtifact` (L1826).
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 2: §10.12 traceId invariant present with §9.2 cross-reference
- Severity: clean
- Evidence: L1824 — "**`traceId` integration invariant.** `EffectBoundaryContext.traceId` is required at every RAWR-owned executable invocation boundary. If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`. Mechanics for the boundary context type and the trace-mint rule are defined in the runtime realization specification, §9.2." Both the trace-mint rule and the runtime-spec §9.2 cross-ref are present. (Adapter/`ExecutionRegistry` resolution at L1822 also cross-refs §9.2 and §18.3.)
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 3: §10.12 do-NOT-name list — clean (none of the forbidden names appear)
- Severity: clean
- Evidence: grep over L1808–L1830 returns zero hits for `CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`. They do appear correctly in the §13.8(a) "do-not-implement-against" list (L2368) — that's the planned location.
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 4: All six per-harness "Integration contract." paragraphs present (§13.1–§13.6)
- Severity: clean
- Evidence: L2249 (§13.1 Elysia → §21.1), L2270 (§13.2 Inngest → §21.2), L2291 (§13.3 OCLIF → §21.3), L2312 (§13.4 web → §21.4), L2333 (§13.5 agent → §21.5), L2356 (§13.6 desktop → §21.6). Each names input boundary type (`MountedSurfaceRuntimeRecord[]` for five non-Inngest cases; `FunctionBundle` for Inngest), output `StartedHarness`, RAWR-vs-vendor ownership split, and runtime-spec §21.x cross-reference.
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 5: §13.5 third-party vendor contract present with all four lettered requirements + reserved-detail clause (Decision #2 = B)
- Severity: clean
- Evidence: L2335 — "**Third-party vendor contract.** OpenShell is a third-party vendor … (a) implementation … behind the `HarnessDescriptor` interface … §21; (b) preservation of the `EffectBoundaryContext.traceId` invariant …; (c) emission of `RuntimeDiagnostic`-conforming findings …; (d) respect for the reserved-boundary clause at arch-spec §10.12 and runtime-spec §21.5. … the choice of which third-party OpenShell implementation satisfies the contract is a reserved-detail boundary, locked when an implementation slice triggers the need." Four lettered requirements (a-d) and reserved-detail-boundary clause both present.
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 6: §13.8 contains all five lettered requirements (a–e)
- Severity: clean
- Evidence: L2364–L2378. (a) named boundary types only — `HarnessDescriptor<TPayload>`, `MountedSurfaceRuntimeRecord<TPayload>`, `StartedHarness` — never SDK derivation or compiler-internal artifacts (L2368); (b) `mount(...)` may not acquire providers, construct service bindings, or access raw Effect internals (L2370); (c) emit `RuntimeDiagnostic`-conforming findings (L2372); (d) `EffectBoundaryContext.traceId` invariance with non-negotiable clause and trace-mint rule (L2374); (e) resolve via `ExecutionRegistry` not by independent pairing (L2376). Closing §10.14 cross-reference at L2378.
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 7: No collateral damage — §13.7, §14, and §13.2 stack diagram intact
- Severity: clean
- Evidence: §13.7 "Harness law" preserved at L2358–L2362 (unchanged two-paragraph form). §14 boundary at L2382 intact (`## 14. Operational mapping and growth model`). §13.2 stack diagram at L2253–L2266 retains the existing `-> FunctionBundle -> Inngest harness` pipeline rungs (L2264–L2265); the new "Integration contract." paragraph (L2270) was appended after the existing closing paragraph at L2268, not in place of any pre-existing FunctionBundle reference. §10.14 row for "Harness and native boundary" (L1860) consistent with the new §10.12 / §13.8 vocabulary.
- Confidence: high
- Disposition recommendation: accept as-is
- Repair demand: none

### Finding 8: Per-name rule grep test — clean for W-3 runtime-only names; Effect.Service residue confirmed (out-of-lane)
- Severity: clean (in-lane); pre-existing P3 (out-of-lane, deferred to Rec #7 / Phase 2)
- Evidence: zero hits in arch-spec for `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` — runtime-spec-only per W-3 decision. `Effect.Service` still appears at L2893 in the §15.x consumer-rule list ("public raw `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring …"). This is the same pre-existing residue noted in the alignment plan as Rec #7 / Phase 2 territory; it is NOT in Lane 1.3's scope and is not a Lane 1.3 regression. (Note: the brief mentions "L2775–2776" but the actual current location is L2893 — line drift relative to the brief, not a finding.)
- Confidence: high
- Disposition recommendation: accept Lane 1.3 as-is; carry `Effect.Service` residue forward to Phase 2 Rec #7 lane as already planned
- Repair demand: none in Lane 1.3

## Summary
- Layer-1 leaf review status: **pass**
- Number of findings: 8 (all clean within Lane 1.3 scope)
- Highest severity: clean
- DRA next action: ratify Lane 1.3 clean and proceed to next Phase 1 lane / aggregator. No repair demands. Confirm Phase 2 Rec #7 backlog already carries the `Effect.Service` L2893 residue; no new ticket needed.
