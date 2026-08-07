# Lane 1.2 Leaf Finding — Rec #2 §10.14 Registry

**Reviewer:** Opus inquisitor
**Lane:** 1.2

## Findings

### Finding 1: Row count and structure conform to Decision #2 = Option B
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1836-1848` (header row + 11 data rows; no OpenShell placeholder row).
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 2: All seven required columns present in every row
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1836` (header: Boundary name | Arch-spec section | Runtime-spec section | Naming owner | Mechanics owner | Named interface contract types | Companion specs that attach); rows 1838-1848 each populate all seven cells.
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 3: Six-rule attachment protocol verbatim against alignment plan §6
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1854-1859` matches `runtime-architecture-alignment-plan.md:627-632` word-for-word, with the §10.14.1 rule 4 already updated to "runtime-spec §23.5 / L4637 model" (the plan only said "L4637 model" — the applied edit is a clarifying superset, not a divergence).
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 4: §10.14.2 worked example covers all 11 boundaries
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1865-1875` contains 11 bullets, one per registry row, in registry order.
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 5: L25 upgrade points at §10.14 by reference and names runtime realization spec by filename
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:25` — "Subsystem specifications attach to it at named integration boundaries enumerated in §10.14. The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names."
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 6: Per-name rule respected — no forbidden runtime-only names appear in arch-spec
- Severity: clean
- Evidence: grep across `RAWR_Canonical_Architecture_Spec.md` for `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` returns zero matches. The Bootgraph row's worked-example bullet (`:1868`) explicitly states the arch-spec must NOT enumerate Effect-internal primitives. `CompiledExecutionPlan` appears in the Runtime compiler row's "Named interface contract types" cell (`:1840`); per the alignment plan §6 (`:619`) this name is runtime-internal, but per the user's review note this is acceptable as a registry-row name (a pointer at the runtime-owned type), not an arch-spec body name. No body-text occurrence of `CompiledExecutionPlan` outside §10.14 is introduced by this patch.
- Confidence: high
- Disposition recommendation: accepted
- Repair demand: none.

### Finding 7: OpenShell handled per Decision #2 = Option B (third-party vendor contract, not 12th row)
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1846` Harness row "Companion specs that attach" cell reads "Runtime realization spec; TBD: vendor harness companion specs (incl. OpenShell vendor contract per §13.5)". No 12th OpenShell placeholder row exists.
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 8: §10.14.3 and §10.14.4 correctly defer mechanics to runtime-spec §24, §17, §22
- Severity: clean
- Evidence: `RAWR_Canonical_Architecture_Spec.md:1879` defers phase-transition mechanics to runtime spec §24; `:1883` defers diagnostic emission and rollback mechanics to runtime spec §17 and §22.
- Confidence: high
- Disposition recommendation: none-needed
- Repair demand: none.

### Finding 9: Minor — registry departures from plan-original table are harmless tightenings
- Severity: P3
- Evidence: Three small deltas vs the plan's table at `runtime-architecture-alignment-plan.md:181-193`:
  1. Surface adapter lowering row drops the parenthetical "(named only; do not re-define internal shape)" qualifier on `SurfaceAdapter` (`:1845` vs plan `:190`).
  2. Harness row's "Companion specs that attach" replaces "TBD: OpenShell companion spec" with "TBD: vendor harness companion specs (incl. OpenShell vendor contract per §13.5)" — required by Decision #2 = Option B, so this is correct, not a divergence.
  3. Control-plane row's Arch-spec section cell expands "§15.7" to "§15.7, §15.8" (`:1847` vs plan `:192`); Diagnostics row expands "§10.13" to "§10.13, §15.8" (`:1848` vs plan `:193`). These additions strengthen cross-references and are consistent with the worked-example bullets at `:1874-1875`.
- Confidence: medium
- Disposition recommendation: accepted
- Repair demand: none — all three deltas are either Decision-#2-compelled or strict tightenings.

## Summary

- Layer-1 leaf review status: pass
- Number of findings: 9 (8 clean, 1 P3 informational)
- Highest severity: P3
- DRA next action: Accept Lane 1.2 applied edits as conformant with Recommendation #2, Decision #1 = Option A, and Decision #2 = Option B. No repair required. Proceed to Layer-2 cross-lane consistency review (interaction with Rec #1 §4.3a carve-out, Rec #3 §10.12 named-types overlap, and the §15.7 / §15.8 cross-reference pair).
