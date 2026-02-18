# SESSION_019c587a_AGENT_LINKAGE_RESHAPE_EXEC_SCRATCHPAD

## Drift Lock
Clarity/migration artifacts only. No policy/spec meaning changes.

## Pre-Edit Checkpoint
- Mandatory skills introspected (information-design, docs-architecture, deep-search, decision-logging).
- Official spec corpus and reshape input set read before owned-output edits.
- Ownership lock confirmed: linkage/parity artifacts only.

## Working Notes
1. Target output root `docs/projects/flat-runtime/` does not exist yet in this worktree; create only as needed for owned outputs.
2. Source corpus currently lives under `docs/projects/flat-runtime-session-review/` and `orpc-ingest-spec-packet/**`.
3. File disposition map authority sources:
   - `RESHAPE_PROPOSAL.md` section 3 tables.
   - `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md` section 2.2 table.

## Decision Log (Linkage Scope)
### Use planned destination map as canonical linkage baseline
- Context: Destination docs are not fully materialized yet; parity/linkage artifacts must still be produced now.
- Options:
  - A) Block until all destination docs exist.
  - B) Map snippets/links against planned destination paths and mark unresolved runtime checks.
- Choice: B.
- Rationale: Mission is migration linkage reporting; reshape proposal already defines file-level mapping.
- Risk: Some planned paths may diverge during implementation; unresolved items must be flagged for steward review.

## Pending Checks
- Build full fenced-snippet inventory and source→destination mapping.
- Run stale-link scans across active docs (exclude archive) for old packet/session paths.
- Mark pass/fail and unresolved items with explicit file paths.
