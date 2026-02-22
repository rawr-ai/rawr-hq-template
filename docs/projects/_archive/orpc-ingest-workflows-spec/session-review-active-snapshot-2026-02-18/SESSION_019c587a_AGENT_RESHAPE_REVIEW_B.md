# SESSION_019c587a_AGENT_RESHAPE_REVIEW_B

## Review Scope
Independent validation of reshape-plan logical/structural validity and migration safety, based on:
- Official packet docs (`orpc-ingest-spec-packet/*.md` + `examples/*.md`)
- `RESHAPE_PROPOSAL.md`
- `CANONICAL_ASSESSMENT.md`
- `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
- `_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
- `_RESHAPE_PLAN_PACKET_INTERIOR.md`

## Verdict
**NO-GO as written.**
The reshape direction is strong, but execution safety is not implementation-ready until the blockers below are fixed.

## Findings (Ordered by Severity)

### BLOCKER 1 — Decision-ID collision introduces policy drift and breaks ID stability
**What fails**
`RESHAPE_PROPOSAL.md` says to move AXIS_08 path strategy into a **new closed D-012** (`RESHAPE_PROPOSAL.md:347`, `RESHAPE_PROPOSAL.md:409`).

**Why this is unsafe**
`DECISIONS.md` already has `D-012` locked for inline-I/O/extracted-shape policy (`orpc-ingest-spec-packet/DECISIONS.md:68`). Reusing `D-012` creates ambiguity, breaks traceability, and directly contradicts “no breaking changes to decision IDs” (`RESHAPE_PROPOSAL.md:572`).

**Required edits to RESHAPE_PROPOSAL.md**
1. In `§7 AXIS_08` and `§9 DECISIONS.md Improvements`, remove “new D-012” language.
2. Route path-strategy closure to an existing decision that already owns it (preferred: extend `D-005`), or allocate a new unused ID (`D-013+`).
3. In `§14 Risk Assessment`, keep the “no decision ID breakage” claim only after the ID plan is corrected.

---

### BLOCKER 2 — Cross-reference migration scope is incomplete; active docs will break after move/rename
**What fails**
The plan only scopes cross-reference repair to packet internals (`RESHAPE_PROPOSAL.md:415-442`).

**Why this is unsafe**
Active docs outside the packet currently point at old paths:
- `docs/SYSTEM.md:14`
- `docs/system/PLUGINS.md:6`
- `docs/process/PLUGIN_E2E_WORKFLOW.md:22`

After moving to `docs/projects/flat-runtime/...`, these links become stale, causing authority confusion and broken navigation.

**Required edits to RESHAPE_PROPOSAL.md**
1. In `§10 Cross-Reference Cleanup`, add **External Canonical References** subsection.
2. Add explicit update list for `docs/SYSTEM.md`, `docs/system/PLUGINS.md`, `docs/process/PLUGIN_E2E_WORKFLOW.md`.
3. In `§13 Phase 4`, add a repo-wide validation gate:
   - `rg -n "flat-runtime-session-review/orpc-ingest-spec-packet|SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC" docs --glob '!docs/projects/_archive/**'`
   - expected result: zero unresolved references except intentional archive pointers.

---

### BLOCKER 3 — “No content loss” is asserted but not enforced; snippet loss remains possible
**What fails**
The proposal guarantees preservation (`RESHAPE_PROPOSAL.md:23`) while also planning net line removals in E2E docs (`RESHAPE_PROPOSAL.md:399`) and only “spot-check” verification (`RESHAPE_PROPOSAL.md:562-564`).

**Why this is unsafe**
This is insufficient for code-heavy docs. During merge/dedup, implementation-legible snippets can be silently dropped or weakened while still passing a spot-check.

**Required edits to RESHAPE_PROPOSAL.md**
1. Add a **Snippet Preservation Gate** to `§13` before final verification:
   - pre-migration inventory of fenced code blocks per source file,
   - post-migration parity report mapping each block to destination location,
   - explicit exceptions list for truly removed duplicates with canonical destination pointers.
2. Add a hard acceptance criterion to `§13 Phase 6`: “No unresolved snippet deltas.”
3. Update `§14 Risk Assessment` to reflect this as a real migration risk until the gate passes.

---

### MAJOR 1 — Canonical location intent conflicts with docs architecture contract unless scoped explicitly
**What fails**
Proposal states long-term canonical intent (`RESHAPE_PROPOSAL.md:15`) but places output under `docs/projects/flat-runtime/` (`RESHAPE_PROPOSAL.md:30`).

**Why this is risky**
`docs/DOCS.md` defines `docs/projects/` as time-bound and `docs/system/` for enduring technical contracts (`docs/DOCS.md:17-21`, `docs/DOCS.md:29`). Without an explicit scope statement, authority drift is likely.

**Required edits to RESHAPE_PROPOSAL.md**
1. In `§1` and `§2`, state whether this is:
   - canonical **for this initiative only**, or
   - target to be promoted to `docs/system/` after stabilization.
2. If promotion is intended, add a follow-up milestone in `§13` with exit criteria.

---

### MAJOR 2 — Wildcard archive rules are non-deterministic and can sweep unintended files
**What fails**
Plan includes broad wildcard move rules (e.g., “All `SESSION_019c587a_AGENT_*` files”, `RESHAPE_PROPOSAL.md:114`).

**Why this is risky**
Concurrent work can generate new files matching the pattern; archive outcome becomes timing-dependent and non-reproducible.

**Required edits to RESHAPE_PROPOSAL.md**
1. Replace wildcard moves in `§3` with an explicit frozen manifest of source files.
2. Add a rule: archive only files listed in manifest at plan-freeze time.
3. Add post-move check: no expected source file remains; no unplanned file moved.

---

### MAJOR 3 — Open-question handling is not tied to execution gates
**What fails**
Open questions are documented (`§12`) but execution phases do not define which questions must be resolved pre-cutover vs post-cutover (`§13`).

**Why this is risky**
Questions affecting policy interpretation (notably Q-05/Q-06) can be silently resolved during editing, creating drift under a “no policy change” banner.

**Required edits to RESHAPE_PROPOSAL.md**
1. Add a **Question Gating Table** in `§12` with columns:
   - decision ID,
   - blocking/non-blocking,
   - required phase,
   - owner.
2. In `§13`, add explicit checkpoint(s): unresolved blocking questions halt merge/cutover.

---

### NOTE — Structural direction is strong
The proposed macro-shape (single architecture authority, axis/example split, explicit session-lineage boundary) is coherent and aligns with the packet’s policy model, provided blockers and majors are addressed.

## Required Section-Level Changes (Quick Checklist)
- `§7 AXIS_08`: remove “new D-012”; point to existing decision or allocate new unique ID.
- `§9 DECISIONS.md Improvements`: same ID correction; keep field-normalization but avoid ID reuse.
- `§10 Cross-Reference Cleanup`: expand to include active non-packet docs.
- `§13 Execution Sequence`: add snippet parity gate, repo-wide link migration gate, and open-question gating checkpoint.
- `§14 Risk Assessment`: remove/soften “no breaking changes to decision IDs” until ID fix is applied; raise migration risk until preservation and link gates pass.

## Execution Readiness After Fixes
When BLOCKER 1-3 and MAJOR 1-3 edits are applied, the plan becomes implementation-ready for phased execution.
