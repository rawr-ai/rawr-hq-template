<!-- quarantine-ledger: true -->

# Transient Migration Context Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves old execution packets, candidate reviews, and finalization packets as provenance.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined context packets are not authoritative where they conflict with the active M2 migration planning packet, final runtime realization spec, or canonical architecture spec. Mine them carefully for history, decisions, and evidence; do not use them as current execution instructions.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/projects/rawr-final-architecture-migration/.context/quarantine/M2-execution/` | Prior M2 execution packet | Prior execution context can conflict with final specs and regenerated planning. | Mining service-sweep history, old gates, and carry-forward risks. | Do not promote directly; mine into the regenerated migration plan if still valid. |
| `docs/projects/rawr-final-architecture-migration/.context/quarantine/M2-runtime-realization-lock-spike/` | Runtime/architecture finalization packets | Candidate and review packets are evidence, not final authority. | Mining accepted decisions, rejected alternatives, and semantic conflict evidence. | Keep quarantined unless a specific artifact is rebuilt as an active decision record. |
