<!-- quarantine-ledger: true -->

# Transient M2 Issue Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves stale M2 issue specs intact.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined M2 issues are not executable work items. They are not authoritative where they conflict with the active migration plan, final runtime realization spec, or canonical architecture spec.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/projects/rawr-final-architecture-migration/issues/quarantine/M2-U00-*.md` through `M2-U06-*.md` | Previous M2 issue sequence | Issue sequence centers stale topology and must not drive implementation. | Mining slice intent, dependencies, and proof expectations. | Replace with regenerated issues after the current migration plan is written. |
