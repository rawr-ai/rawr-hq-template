# Wave 1 Composed Finding — Structural Cohort (Recs #1–#4)

**Reviewer:** Opus integrator (Layer-2 composed review)
**Wave:** Phase 1 Wave 1
**Lanes covered:** 1.1, 1.2, 1.3, 1.4

## Findings (across-lane)

No P1, P2, or P3 cross-lane findings. All eight composed-review checks pass clean.

### Finding 1 (informational, non-blocking): §10.14 harness row enumerates per-harness payload mnemonics not formally typed in §10.12
- Severity: P4 (informational)
- Evidence: §10.14 harness row (L1860) lists `per-harness: 'FunctionBundle' (Inngest), oRPC route payloads (Elysia), command payloads (OCLIF)`. `FunctionBundle` is a true named type (present in §10.12 L1820); "oRPC route payloads" and "command payloads" are descriptive mnemonics, not formal type names. §10.14.2's worked example deliberately scopes the must-name obligation to `HarnessDescriptor` and `StartedHarness` only, so this is consistent with the carve-out and not a registry-coherence violation.
- Confidence: high
- Disposition recommendation: accept-as-is. Consistent with Rec #1 "names side, not mechanics" and with §10.14.2's narrowed must-name claim. Per-harness payload type formalization belongs to runtime-spec §21.x.
- Repair demand: none.

## Composed-review tests

- Registry-coherence (Rec #2 ↔ Rec #3): **pass** — `HarnessDescriptor` (§10.12 L1810), `StartedHarness` (L1818), `FunctionBundle` (L1820) all present in §10.12; `MountedSurfaceRuntimeRecord` (L1814) also present though only mentioned in body of registry rationale, not in name column. All "must-name" obligations from §10.14.2 satisfied.
- Registry-coherence (Rec #2 ↔ Rec #4): **pass** — §15.8 (L2677–L2682) names exactly `PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry` — the four §10.14 references. §10.13 → §15.8 cross-ref present at L1842; §17.12 → §15.8 cross-ref at L2856; §15.8 → runtime-spec §15.7/§22.1/§22.2/§22.3 forward-refs in column 5 of each row.
- Carve-out consistency (Rec #1 ↔ Recs #2–#4): **pass** — §10.14.2 bullet 4 explicitly forbids enumerating Effect-internal primitives in §10.6 (compatible with Rec #6 deferral to Phase 2). §15.8 names interfaces and points to runtime-spec sections for shapes (`Owning runtime-spec section` column); does not redefine field shapes. §10.12 explicitly delegates per-harness contracts to runtime-spec §21 (L1828) and harness internals to §13.1–§13.6 + runtime-spec §21.x.
- L25 / §10.14 cross-ref loop: **pass** — L25 names §10.14 + runtime realization spec; §10.14 exists at L1844 with 11-row registry, attachment protocol (§10.14.1), worked example (§10.14.2), phase-transition (§10.14.3), error-propagation (§10.14.4) subsections; runtime realization spec named throughout.
- Worked-example accuracy (§10.14.2): **pass** — spot-checked all 11 bullets against the actual sections after Phase 1 edits. Harness bullet ("§10.12 must name HarnessDescriptor and StartedHarness") confirmed at L1810/L1818. Service-binding bullet ("five context lanes... arch-spec carries the cache-key exclusion rule") cross-references existing §10.9 vocabulary. Bootgraph bullet's "must NOT enumerate Effect-internal primitives" correctly flags the residual L1723 enumeration as Phase-2 (Rec #6) cleanup, not a Phase-1 contradiction.
- §13.5 OpenShell consistency: **pass** — §13.5 (L2335) contains the third-party vendor contract paragraph implementing Decision #2 = Option B (parallel treatment to Inngest/oRPC/Effect/Elysia/OCLIF/Bun); §10.14 harness row explicitly cross-refs §13.5 ("incl. OpenShell vendor contract per §13.5"). Vendor contract clauses (a)–(d) align with §10.12 and §13.8 boundary rules.
- §13.8 / §10.14.1 attachment-protocol consistency: **pass** — §10.14.1's six general rules (boundary-name reference, no redefinition, no duplicated mechanics, reserved-detail declaration, scoped "fixes" language, name-collision yield) and §13.8's five harness-specific rules (a–e: named-types only, mount restrictions, diagnostics emission, traceId, ExecutionRegistry) are orthogonal refinements with no contradictions. §13.8 closes by explicitly anchoring back to §10.14 registry's harness row (L2378).
- Per-name-rule grep audit: **pass** — `ProcessQueueHubResource|ProcessPubSubHubResource|ProcessConcurrencyLimiterResource|ProcessCacheHubResource` → 0 hits (W-3 holds). `Effect.Service` → 1 hit at L2893 (Rec #7 deferred to Phase 2). `runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores` → 1 hit at L1723 (Rec #6 deferred to Phase 2).
- Section ordering integrity: **pass** — §10.1 (L1582) → §10.2 → §10.3 → §10.4 → §10.5 → §10.6 → §10.7 → §10.8 → §10.9 → §10.10 → §10.11 → §10.12 → §10.13 → §10.14 (L1844) contiguous and ordered. §15.1 (L2555) → §15.2 → §15.3 → §15.4 → §15.5 → §15.6 → §15.7 → §15.8 (L2673) contiguous; §16 (L2690) immediately follows. No section-number duplicates anywhere in §10 or §15.

## Summary

- Layer-2 composed review status: **pass**
- Number of findings: 1 (informational only)
- Highest severity: P4
- Wave-1 close gate: **pass**
- DRA next action: **advance to Phase 2 (Cleanup cohort, Recs #5–#7)**. The two grep-audit residuals (`Effect.Service` at L2893 and the §10.6 Effect-primitive enumeration at L1723) are precisely the Phase-2 cleanup targets and the §10.14 registry already structurally accommodates the Phase-2 outcome (the §10.14.2 worked-example bullet for bootgraph is pre-aligned to the post-Rec-#6 state).
