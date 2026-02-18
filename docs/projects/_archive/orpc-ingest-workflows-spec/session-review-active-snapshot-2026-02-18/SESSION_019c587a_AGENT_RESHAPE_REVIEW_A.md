# SESSION_019c587a_AGENT_RESHAPE_REVIEW_A
## Reshape-Plan Validity and Migration-Safety Review (Agent A)

## Verdict
**Not implementation-ready yet.**

The reshape direction is strong, but execution safety is currently undermined by decision-ID collision risk, canonical-authority ambiguity across plan inputs, and insufficiently explicit non-loss migration gates for code-heavy docs.

## Findings (Ordered by Severity)

### 1) BLOCKER — Decision ID collision in planned DECISIONS changes
- Classification: **BLOCKER**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:409` proposes “Add new closed D-012 entry for path strategy”.
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md:68` already defines `D-012` for inline-I/O posture.
- Risk:
  - Breaks decision traceability and invalidates references.
  - Contradicts “no breaking changes to decision IDs” claim at `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:572`.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. In `## 9. DECISIONS.md Improvements`, replace the “new D-012” action with “new D-013 (or next free ID)”.
  2. Update all mentions of “path strategy as D-012” in this doc to the new ID.
  3. Add a short invariant: “No existing decision ID may be reused or repurposed.”

### 2) BLOCKER — Canonical caller/auth authority is not consistently locked
- Classification: **BLOCKER**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:259` sets canonical matrix in `ARCHITECTURE.md`.
  - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md:381` agrees (ARCHITECTURE canonical).
  - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_PACKET_INTERIOR.md:235` declares AXIS_02 canonical.
- Risk:
  - Reintroduces dual-authority drift during execution.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. In `## 5. Caller/Auth Matrix Consolidation`, add explicit lock language: “`ARCHITECTURE.md` is the sole canonical matrix source.”
  2. Add explicit derivative rule: “AXIS/E2E matrices are specialized views and must link to canonical source.”
  3. Add a reconciliation note for `_RESHAPE_PLAN_PACKET_INTERIOR.md` conflict so implementation agents do not fork behavior.

### 3) BLOCKER — “No content loss” is asserted but not operationally guaranteed
- Classification: **BLOCKER**
- Evidence:
  - Absolute claim: `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:23`.
  - But line removals/moves are planned (`docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:347`, `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:399`).
  - Validation is generic only (`docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:563`).
- Risk:
  - High chance of accidental loss of implementation-legible snippets during merge/dedup.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. Add a new subsection under `## 13. Execution Sequence`: **Content Preservation Gates**.
  2. Require a section-level move map for every removed/relocated block (source → destination).
  3. Require snippet parity checks (code-fence inventory and unresolved-link check) before deleting/moving originals.
  4. Add explicit rollback gate if parity fails.

### 4) MAJOR — Rename map is inconsistent across plan inputs
- Classification: **MAJOR**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:48` uses `e2e-02-api-workflows-composed.md`.
  - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md:116` uses `e2e-02-api-workflows.md`.
- Risk:
  - Ref updates and move operations become nondeterministic.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. Add a “Final Locked Rename Manifest” table.
  2. State that this table supersedes naming variants in subordinate plan docs.

### 5) MAJOR — Risk section materially understates execution risk
- Classification: **MAJOR**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:572` declares low risk and no ID breaks/content deletion.
- Risk:
  - Teams may skip safeguards due to incorrect risk framing.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. Update `## 14. Risk Assessment` to at least “Medium until blockers are resolved”.
  2. Add explicit preconditions: ID uniqueness locked, canonical matrix lock, and non-loss gates passing.

### 6) MAJOR — Execution order increases migration error surface
- Classification: **MAJOR**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:526-533` moves/renames early, then merges.
- Risk:
  - Temporary orphaned references and easier omission during merge.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. Reorder phases to: build new canonical docs → verify parity/links → archive old artifacts.
  2. Add explicit “no destructive move before verification” rule.

### 7) MAJOR — Q-06 is treated as non-blocking despite architecture-process impact
- Classification: **MAJOR**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:510` identifies unresolved `rawr.hq.ts` generation model.
- Risk:
  - Ambiguous ownership/update path during future maintenance.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. In `## 12. Open Questions`, mark Q-06 as a gated decision or add bounded assumption for this reshape pass.

### 8) MINOR — Cross-reference cleanup scope is too local
- Classification: **MINOR**
- Evidence:
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:415-443` focuses inside packet scope.
- Risk:
  - External docs may retain stale links.
- Required edits in `RESHAPE_PROPOSAL.md`:
  1. Add repo-wide backlink scan gate before closeout.

### 9) NOTE — Proposal contains embedded pseudo-headings that can dilute scent
- Classification: **NOTE**
- Evidence:
  - AXIS_07 mock section text appears as heading-like lines around `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md:281-293`.
- Risk:
  - Low; mainly readability in some renderers.
- Suggested edit:
  1. Keep those lines clearly fenced as example structure.

## Concrete Edits Required in `RESHAPE_PROPOSAL.md` (Execution Gate List)
1. `## 1. What This Proposal Does`: replace absolute “Nothing is deleted” claim with verifiable preservation commitment.
2. `## 5. Caller/Auth Matrix Consolidation`: add explicit canonical-source lock (`ARCHITECTURE.md` only) and derived-view rule for axis/E2E tables.
3. `## 8. E2E Example Improvements`: add non-loss handling for removed full trees and moved debate text (explicit destination mapping).
4. `## 9. DECISIONS.md Improvements`: fix decision-ID plan (no reuse of D-012; allocate next free ID).
5. `## 12. Open Questions`: reclassify Q-06 as gated, or lock bounded assumption.
6. `## 13. Execution Sequence`: reorder to safe cutover and add parity/rollback gates.
7. `## 14. Risk Assessment`: re-baseline risk level and list blocker preconditions.

## Go/No-Go
- **NO-GO** until Findings 1-3 are resolved.
- **GO with caution** after blockers are fixed and major findings are incorporated.

## Skills Used
- `information-design`, `docs-architecture`, `architecture`, `deep-search`
