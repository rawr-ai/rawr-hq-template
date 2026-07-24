# Proof Ledger Auditor — Runtime-Architecture Alignment Workstream

**Reviewer:** Proof Ledger Auditor (Opus, read-only)
**Phase:** 5
**Date:** 2026-05-04

This audit checks proof discipline (claim strength, evidence homes, deferred-inventory resumability, borderline-case rationale) — not whether DRA's domain conclusions are correct.

## Proof discipline checklist

1. **Claim strength labeled — pass (warn on convention).**
   Findings consistently mark each claim with explicit Severity + Confidence + Evidence + Disposition. "Matches the alignment plan" claims are anchored to alignment-plan section/line numbers (e.g., `lane-1-1-finding.md` Finding 1 cites plan L151/L157/L161; `lane-1-2-finding.md` Finding 3 cites plan L627–L632; `lane-1-4-finding.md` Finding 2 cites plan L252–L257). Strength taxonomy used in practice is `clean / P1–P4 / pass / warn / fail` rather than the canonical `observed / tested / inferred / waived / deferred` taxonomy, but each finding carries an Evidence cell that grounds its severity, so the proof-ledger semantics are intact. Warn is informational, not blocking.

2. **Important claims have evidence homes — pass.**
   Every substantive claim cites a concrete arch-spec line range, runtime-spec line, or grep result. The "seven harness-mount types are in §10.12" claim is grounded at `lane-1-3-finding.md` Finding 1 with seven explicit line citations (L1810, L1814, L1818, L1820, L1822, L1826). The §15.8 four-row claim is grounded at L2633–L2638. The per-name grep audits (`Process*HubResource` zero hits, `Effect.Service` zero hits post-Phase-2) appear in `wave-2-leaf-finding.md` F-2.2.5 and `phase-4-cross-spec-finding.md` Test 2. Cross-spec claims (runtime-spec L36 cross-ref) cite the runtime-spec line directly.

3. **Known gaps stated as non-claims — pass.**
   - OpenShell vendor identity is named as reserved-detail-boundary in `decisions.md` Decision #2 downstream-effect bullet ("vendor identity … is reserved-detail-boundary status, locks at first implementation slice"), surfaced as deferral D-5 with explicit "vendor-contract *shape* is locked … vendor *identity* … is the deferred item."
   - `Process*HubResource` non-naming stated as W-3 decision and grep-verified zero hits.
   - Deployment / observability / profile companion specs stated as deferrals D-2 / D-3 / D-4, not as silent assumptions.

4. **Skipped checks documented — pass.**
   The Lane 2.3 sub-edit 2.3.B skip (duplicative negative-form append) is documented in three places: (a) `lane-2-3-patch.md` (DRA judgment that §4.9 already carries the negative form), (b) `wave-2-leaf-finding.md` F-2.3.4 with explicit reasoning ("§4.9 line 590 already carries the negative form … with broader vendor enumeration than the proposed appended sentence"), and (c) `wave-2-composed-finding.md` "DRA 2.3.B skip soundness: sound" with rationale. Reason, evidence, and consequence-assessment all present. No future-DRA owner or trigger field is recorded, but the skip is consequence-zero (the negative-form claim already exists in stronger form), so absence of trigger is acceptable.

5. **Deferred inventory resumable — pass.**
   D-1 through D-5 in `deferrals.md` each carry Owner / Authority home / Trigger / Evidence link. Sufficient to act without re-reading the workstream record:
   - **D-1 (M2 regen):** owner=future DRA opening that workstream; trigger=alignment PR merges; evidence=authority-order doc + this workstream record. Resumable.
   - **D-2 (deployment spec):** authority home=new spec attaching at §10.14 row "Control-plane and deployment interface"; trigger=first deployment-platform target; evidence=arch-spec §10.14 + §15.8. Resumable.
   - **D-3 (observability spec):** authority home=new spec attaching at §10.14 rows for runtime access + diagnostics; trigger=first telemetry-backend choice; evidence=§15.8 rows. Resumable.
   - **D-4 (profile spec):** authority home=new spec attaching at §10.14 lifecycle row + §10.2; trigger=profile catalog formalization need; evidence=§10.2 lifecycle table + runtime-spec §13. Resumable.
   - **D-5 (OpenShell vendor):** authority home=§13.5 + runtime-spec §21.5; trigger=first OpenShell implementation slice; evidence=§13.5 + decisions.md Decision #2; explicit shape-vs-identity scope note. Resumable.

6. **Promotion boundaries respected — pass.**
   No inferred claim has been silently promoted to "observed." `wave-1-composed-finding.md` Finding 1 (P4 informational on per-harness payload mnemonics) is correctly held at informational severity rather than promoted into a registry-coherence violation. The `Effect.Service` residue in Lane 1.3 was held as "out-of-lane / deferred to Phase 2 Rec #7" rather than silently absorbed; Phase 2 then verified the cleanup at zero grep hits. No deferred item is silently treated as resolved — D-1 through D-5 remain explicitly open.

7. **Findings dispositioned + repaired — pass.**
   All eight finding files (`lane-1-1`, `lane-1-2`, `lane-1-3`, `lane-1-4`, `wave-1-composed`, `wave-2-leaf`, `wave-2-composed`, `phase-4-cross-spec`) carry per-finding `Disposition recommendation` + `Repair demand` cells. All dispositions are `accept-as-is` / `none-needed` / `accept`; zero P1/P2/P3 repair demands raised. The single P3 in Lane 1.2 Finding 9 (registry table tightenings) is dispositioned `accepted` with explicit rationale that all three deltas are either Decision-#2-compelled or strict tightenings — not a hand-wave.

8. **Borderline-case rationale present — pass.**
   - **W-4 (`PortableRuntimePlanArtifact` named in §15.8):** rationale at `decisions.md` W-4 — runtime-spec L3437 already names the consumer class; the §15.8 table's purpose is forward-attachment for companion specs.
   - **W-3 (`Process*HubResource` NOT named):** rationale at `decisions.md` W-3 — borderline-default-to-runtime rule; will promote when deployment companion spec triggers.
   - **W-2 (Rec #7 Option B, arch-spec authors law):** rationale at `decisions.md` W-2 — aligns with Rec #1 carve-out; avoids drift-risk; cleaner long-term posture. Implementation verified at `wave-2-leaf-finding.md` F-2.3.1 + F-2.3.3 (runtime-spec L36 cross-ref present).
   - **2.3.B skip:** rationale captured in three places (see check 4).

## Claim issues

None raised. All claims carry strength markers, evidence citations, and disposition lines that meet the proof-ledger threshold.

## Finding disposition issues

None. All findings dispositioned (accept/accept-as-is/none-needed); zero open repair demands; zero unresolved P1/P2/P3 severities.

## Convention notes (informational, non-blocking)

- The finding records use `Severity: clean | P1–P4` rather than the canonical `observed / tested / inferred / waived / deferred` taxonomy. Semantically equivalent because every finding carries an Evidence cell, but a future DRA importing these findings into a cross-workstream ledger may want to map: `clean+grep evidence → tested`; `clean+citation evidence → observed`; `P3/P4 informational → inferred`. Not a closure blocker.
- The 2.3.B skip lacks a `future-DRA owner` and `trigger` field. Because the skip's consequence is provably zero (the negative-form claim already exists at §4.9 line 590 with broader vendor enumeration than the proposed append), no future-DRA action is required, so absence of trigger is acceptable.

## Summary

- **Ledger status:** **pass**
- **DRA next action:** proceed to PR. Proof ledger is honest, evidence homes are concrete, deferred inventory is resumable, borderline-case rationales are recorded, and no claim has been silently promoted.
