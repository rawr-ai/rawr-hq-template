# Lane 1.1 Leaf Finding — Rec #1 Lifecycle Scope Rewrite

**Reviewer:** Opus inquisitor (Layer-1 leaf review)
**Lane:** 1.1
**Edit applied:** applied (verified against arch-spec working tree at L18, L19, L479–L481)

## Findings

### Finding 1: BEFORE-AFTER fidelity is verbatim across all three sub-edits
- **Severity:** clean
- **Evidence:**
  - Sub-edit 1.1.A: arch-spec L18 matches alignment-plan L151 verbatim (lifecycle bullet rewrite).
  - Sub-edit 1.1.B: arch-spec L19 matches alignment-plan L157 verbatim (substrate bullet rewrite).
  - Sub-edit 1.1.C: arch-spec L481 matches alignment-plan L161 verbatim (carve-out paragraph), modulo the bold `**Names-versus-mechanics carve-out.**` lead-in which was correctly elevated to an H3 heading `### 4.3a Names-versus-mechanics carve-out` on L479.
- **Confidence:** high
- **Disposition recommendation:** none-needed

### Finding 2: Per-name rule and operational rule are preserved
- **Severity:** clean
- **Evidence:** arch-spec L481 carries (a) the names-side ownership claim ("durable integration vocabulary … phase names, RAWR-vs-Effect control split, role and surface taxonomy, producer/consumer handoff contract"), (b) the mechanics-side ownership claim assigning phase implementation, sub-sequencing, artifact type shapes, named substrate primitives, and kernel internals to `RAWR_Effect_Runtime_Realization_System_Canonical_Spec`, and (c) the closing operational rule ("a change to mechanics within a phase does not require updating the arch-spec; a change to phase names, their order, or their integration handoffs requires updating both specifications in concert"). This is the load-bearing principle the alignment-plan L163 commentary calls out, and it is intact.
- **Confidence:** high
- **Disposition recommendation:** none-needed

### Finding 3: No accidental scope expansion
- **Severity:** clean
- **Evidence:** Sub-edit 1.1.C inserts only the H3 heading and the carve-out paragraph; the prior closing paragraph of §4.3 ("Bootgraph, provisioning … not additional top-level semantic layers." at L477) and the §4.4 heading at L483 are preserved unchanged. No new claims, examples, or subsections were introduced beyond the alignment-plan AFTER text.
- **Confidence:** high
- **Disposition recommendation:** none-needed

### Finding 4: Cross-spec phase-list coherence
- **Severity:** clean
- **Evidence:** The parenthetical phase list on arch-spec L18 (`definition → selection → derivation → compilation → provisioning → mounting → observation`) matches:
  - arch-spec §4.3 L459 (`definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`),
  - runtime-spec L19 (same seven-token chain),
  - runtime-spec §22 lifecycle invariant table at L5071 (same seven-token chain).
  Token order, count, and spelling are identical across all four occurrences. Note the cosmetic separator difference (Unicode `→` in the L18 prose vs ASCII `->` in the code-fenced occurrences) — this is consistent with the arch-spec's existing convention of using `→` in narrative prose and `->` inside code fences, so it is not a defect.
- **Confidence:** high
- **Disposition recommendation:** none-needed

### Finding 5: Header level is correctly H3
- **Severity:** clean
- **Evidence:** arch-spec L479 reads `### 4.3a Names-versus-mechanics carve-out`, three hashes — same level as `### 4.3` at L443-area and `### 4.4 Service boundary first` at L483. Heading text uses sentence case consistent with sibling H3s in §4.
- **Confidence:** high
- **Disposition recommendation:** none-needed

## Summary

- Layer-1 leaf review status: **pass**
- Number of findings: 5 (all clean)
- Highest severity: **clean**
- DRA next action: Mark Lane 1.1 Rec #1 review as closed-clean. No repair demands. Proceed to dependent lanes (the L24 companion-spec attachment-cross-reference hook called out in alignment-plan L171 is owned by Rec #2 and is out-of-scope for this lane). Suggest DRA confirm the seven downstream sections enumerated in alignment-plan L167–L171 (§10.2 Derivation row, §17.8 terminal cross-reference invariant, L24 cross-reference, plus the four §10.4/§10.5/§10.6/§17.6 items folded into Rec #6) remain tracked as separate lanes — they are correctly **not** required to land inside Lane 1.1's scope.
