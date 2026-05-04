# Wave 2 Composed Finding — Cleanup Cohort (Recs #5, #6, #7)

**Reviewer:** Opus integrator (Layer-2 composed review)
**Wave:** Phase 2 Wave 2
**Lanes covered:** 2.1, 2.2, 2.3

## Composed-review tests

- **Rec #6 ↔ Rec #1 carve-out:** pass — §10.4 closes with "defined in the runtime realization specification, §15"; §10.5 closes with "§16"; §10.6 closes with "§14 and §17.3"; §17.6's final bullet defers Effect-internal primitives to runtime-spec §14. AFTER blocks consistently terminate at the runtime-spec boundary as §4.3a's principle prescribes ("mechanics within each phase are owned by the runtime realization spec").
- **Rec #6 ↔ Rec #3 asymmetry:** pass — `grep -nE "FunctionBundle|HarnessDescriptor|StartedHarness|MountedSurfaceRuntimeRecord" arch-spec` returns 17 hits across §10.12, §13.1–§13.6, §13.8 footers, and §10.14 registry rows (Phase 1 named-types landed). `grep -nE "ProcessQueueHubResource|ProcessPubSubHubResource|ProcessConcurrencyLimiterResource|ProcessCacheHubResource" arch-spec` returns 0 hits (W-3 decision honored). The asymmetry the alignment plan describes is faithfully reflected.
- **Rec #7 ↔ Rec #1 source-of-truth:** pass — §4.0 final paragraph reads "Per the names-versus-mechanics carve-out (§4.3a), the arch-spec owns the canonical wording of this law as integration vocabulary; the runtime realization specification cross-references this section as the canonical source." Explicit §4.3a cross-reference present; §4.0 is correctly positioned as an instance of the §4.3a general rule.
- **Rec #7 ↔ runtime-spec cross-ref:** pass — runtime-spec L36 reads "Exactness: normative grammar split. Canonical source of this law: \`RAWR_Canonical_Architecture_Spec.md\`, §4.0. This section reproduces the law as runtime-realization context; arch-spec §4.0 is authoritative if the two diverge." No codeblock damage; the law's text-fence opens cleanly on L38.
- **Rec #5 ↔ Phase 1 §13.2:** pass — §13.2 (L2230–2251) contains in order: original prose + ASCII stack + Inngest-ownership sentence (L2247) + **Integration contract.** paragraph (L2249, Phase 1 / Lane 1.3) + **Mode.** paragraph (L2251, Phase 2 / Lane 2.1) + §13.3 heading at L2253. Adjacent and correctly ordered.
- **Section count integrity:** pass — §4.0 + §4.1 + §4.2 + §4.3 + §4.3a + §4.4 + §4.5 + §4.6 + §4.7 + §4.8 + §4.9 + §4.10 + §4.11 + §4.12 + §4.13 all present, monotonically ordered, with §4.3a as the sole letter-suffixed insertion. No section number conflicts. §13 range (§13.1–§13.8) and §17 range (§17.1–§17.12) intact.
- **Decision honoring:** pass — §13.2 **Mode.** paragraph (L2251) contains the verbatim sentence "This specification declares no default mode at the architecture level; default-selection is a profile/deployment concern." Decision #3 honored.
- **DRA 2.3.B skip soundness:** sound — §4.9 closes with "Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners." The negative-form claim ("not peer semantic owners") is already carried verbatim. A second negative-form append would have been duplicative; the skip preserves clarity without leaving a semantic gap.
- **Length sanity:** pass — pre-Phase-2 (commit 8bbcf091): 3073 lines; post-Phase-2 (HEAD): 3055 lines; net Δ = −18 lines. File size went down. The −18 is below the plan's 100–200 prediction band, but the direction is correct and the under-prediction is explained by Phase 1 having added the §13.x **Integration contract.** paragraphs and §10.12 named-types prose, which structurally offset some of Phase 2's compression. The arch-spec absorbed Phase 1 expansion + Phase 2 compression and still net-trimmed.

## Findings

- No P1, P2, or P3 issues identified at the composed layer.
- Phase 1 / Phase 2 compose cleanly: the carve-out (§4.3a) generalizes correctly across §10.4–§10.6 (mechanics-deferral), §10.12 + §13.1–§13.6 (named-types-only at boundary), and §4.0 (canonical wording owned at arch-spec). The "names land, mechanics defer" rhythm is now consistently visible across all three rec-bundles.
- The §13.2 **Integration contract.** + **Mode.** adjacency is a worked example of the cross-phase rhythm (Phase 1 added the type-name surface, Phase 2 added the architectural posture caveat). Future harness-posture sections can follow this two-paragraph pattern when both type-names and posture facts apply.
- Length under-shoot vs plan prediction is informational, not a defect — the plan's 100–200 line prediction was estimated against Phase 2 alone, not the Phase-1-plus-Phase-2 composite.

## Summary

- **Layer-2 status:** pass
- **Wave-2 close gate:** pass
- **DRA next action:** advance to Phase 3 — downstream audit wave (F3 fleet); no Phase 2 repairs required.
