# Reshape Execution Orchestration Plan (Agent-Driven, No-Drift, Archive-First)

## Summary
Execute the approved reshape of the flat-runtime spec system in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal` using a partitioned multi-agent team, with:
1. Archive-first cleanup to reduce confusion.
2. Reuse of the two most recent reshape-review agents (compacted first).
3. Strict ownership boundaries to prevent overlap/conflicts.
4. Drift-prevention gates so wording clarity improves without policy changes.
5. Final integrated packet ready for implementation planning.

## Scope Lock
- In scope:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/CANONICAL_ASSESSMENT.md`
- Out of scope:
  - Runtime code changes
  - New architecture decisions
  - Implementation planning itself

## Step 0 — Orchestrator Boot (must happen first)
1. Write this plan verbatim as:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_EXECUTION_PLAN_VERBATIM.md`
2. Create orchestrator scratchpad:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_EXECUTION_ORCHESTRATOR_SCRATCHPAD.md`
3. Record reshape drift lock in scratchpad:
- “Clarity/structure changes only; no policy/spec meaning changes.”

## Step 1 — Agent Roster Hygiene + Reuse
1. Close all stale agent threads unrelated to reshape execution.
2. Reuse recent review agents if possible:
- `019c7290-81eb-71d0-b7d6-a06dbb04773f` (Review A)
- `019c7290-bc5c-7952-a65b-2906088f1faf` (Review B)
3. For each reused agent, send messages in this exact order:
- Compact message first:
  - “Compact now. Capture locked invariants, no-drift rules, unresolved gates, and reshape blockers into your scratchpad. No edits yet.”
- Then task switch message:
  - “New task: execute reshape work in your owned area only. Use information-design as primary skill. Preserve policy meaning exactly.”
4. If resume fails, spawn fresh replacements and require full re-anchoring (same skills + full corpus read).

## Step 2 — Mandatory Context Anchoring for Every Agent
Each agent must do all of the following before edits:
1. Introspect/apply skills:
- `information-design` (mandatory primary)
- `docs-architecture`
- `architecture`
- `deep-search`
- `decision-logging`
2. Read full official spec corpus (all packet docs + all E2Es + posture spec).
3. Read reshape inputs:
- `RESHAPE_PROPOSAL.md`
- `CANONICAL_ASSESSMENT.md`
- `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
- `_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
- `_RESHAPE_PLAN_PACKET_INTERIOR.md`
- `SESSION_019c587a_AGENT_RESHAPE_REVIEW_A.md`
- `SESSION_019c587a_AGENT_RESHAPE_REVIEW_B.md`
4. Create per-agent artifacts before edits:
- `.../SESSION_019c587a_AGENT_<ROLE>_RESHAPE_EXEC_PLAN_VERBATIM.md`
- `.../SESSION_019c587a_AGENT_<ROLE>_RESHAPE_EXEC_SCRATCHPAD.md`

## Step 3 — Pre-Work Archive/Cleanup (aggressive but safe)
Owner: Cleanup Agent (fresh).

1. Archive destination (existing tree only):
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/session-artifacts/`
2. Keep-set (must remain active during reshape):
- `orpc-ingest-spec-packet/**`
- `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `RESHAPE_PROPOSAL.md`
- `CANONICAL_ASSESSMENT.md`
- `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
- `_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
- `_RESHAPE_PLAN_PACKET_INTERIOR.md`
- `SESSION_019c587a_AGENT_RESHAPE_REVIEW_A*.md`
- `SESSION_019c587a_AGENT_RESHAPE_REVIEW_B*.md`
3. Archive everything else in `flat-runtime-session-review/` that is not in keep-set.
4. Produce cleanup manifest + report:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_MANIFEST.yaml`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_REPORT.md`
5. Sanity gate:
- No official spec docs archived.
- No reshape execution input docs archived.

## Step 4 — Execution Team Partition (non-overlapping ownership)
### Agent Core (reuse Review A)
Owns only:
- New canonical core outputs from reshape:
  - `docs/projects/flat-runtime/README.md`
  - `docs/projects/flat-runtime/ARCHITECTURE.md`
  - `docs/projects/flat-runtime/DECISIONS.md`
Responsibilities:
- Consolidate canonical authority model.
- Enforce single canonical caller/auth matrix in `ARCHITECTURE.md`.
- Preserve all locked policy meaning (no decision drift).

### Agent Annex (reuse Review B)
Owns only:
- `docs/projects/flat-runtime/axes/*.md`
Responsibilities:
- Move/rename axis docs per reshape map.
- Improve clarity/scent/chunking only.
- Replace duplicated global policy text with references to canonical core.

### Agent Reference (fresh)
Owns only:
- `docs/projects/flat-runtime/examples/*.md`
- `docs/projects/flat-runtime/_session-lineage/README.md`
Responsibilities:
- Preserve implementation-legible examples.
- Add reshape-required bridge notes/diff-view readability improvements.
- Keep examples explicitly non-authoritative for policy.

### Agent Linkage (fresh)
Owns only:
- Cross-reference and parity artifacts (not policy prose ownership)
Responsibilities:
- Build snippet parity map (source code-fence inventory to destination mapping).
- Build link migration checklist and stale-link scans.
Artifacts:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/RESHAPE_SNIPPET_PARITY_MAP.yaml`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/RESHAPE_LINK_MIGRATION_REPORT.md`

## Step 5 — Orchestrator Integration (you)
1. Monitor each agent scratchpad during execution.
2. Reject any wording that changes meaning of D-005..D-010 locked posture.
3. Integrate cross-cutting fixes only after all owned-area outputs land.
4. Resolve overlaps by ownership rule:
- Owning agent decides wording inside owned files.
- Orchestrator decides cross-file consistency wording.
5. Produce integration changelog:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/RESHAPE_INTEGRATION_CHANGELOG.md`

## Step 6 — Independent Steward Gate
Owner: Steward Agent (fresh, independent from execution agents).

1. Read:
- Entire reshaped `docs/projects/flat-runtime/**`
- Original keep-set sources
- Parity/link reports
2. Output:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/RESHAPE_FINAL_STEWARD_REVIEW.md`
3. Pass/fail gates:
- No policy/spec drift.
- Decision IDs unchanged except valid new unused ID allocation if required.
- Canonical matrix authority appears in one place only.
- No required example code/snippets dropped.
- No stale references in active canonical docs.
- Clear canonical read path for implementation-planning agents.

## Step 7 — Completion State
1. Reshaped canonical spec set exists and is coherent.
2. Session clutter reduced; only relevant reshape lineage remains active.
3. Steward report is green.
4. Ready to enter implementation planning phase.

## Important Changes to Public APIs / Interfaces / Types
No runtime APIs or code interfaces change in this pass.
Documentation interface changes:
1. Canonical spec root becomes `docs/projects/flat-runtime/`.
2. Single canonical authority for global policy/matrix in `ARCHITECTURE.md`.
3. Annex/reference split made explicit (`axes/` vs `examples/` vs `_session-lineage/`).
4. Session artifacts moved out of spec-facing area to archive/lineage.

## Test Cases and Scenarios
1. Policy Parity Test:
- D-005..D-010 meaning in reshaped docs matches source meaning.
2. Decision Integrity Test:
- No reused decision IDs (especially D-012 conflict remains resolved).
3. Matrix Authority Test:
- Caller/auth matrix has one canonical source and referenced derivatives only.
4. Snippet Preservation Test:
- Every required source code block maps to destination or explicit duplicate-reference rationale.
5. Link Integrity Test:
- No stale links to old packet/session paths in active canonical docs.
6. Ownership Collision Test:
- No file edited by more than one execution agent outside orchestrator integration.
7. Read-Path Test:
- New agent can identify canonical start doc in under 30 seconds.

## Assumptions and Defaults
1. Execution workspace is:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
2. Pre-work cleanup is intentionally aggressive, with keep-set safety.
3. Reuse of the two recent review agents is attempted first; fresh fallback is allowed.
4. This is a docs-only reshape pass.
5. Any ambiguous wording defaults to preserving existing locked policy meaning exactly.
