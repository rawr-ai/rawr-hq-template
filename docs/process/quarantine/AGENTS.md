<!-- quarantine-ledger: true -->

# Transient Process Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves process docs that are useful provenance but not active process guidance.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined process docs are not authoritative where they conflict with active process docs, the active migration plan, final runtime realization spec, or canonical architecture spec.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/process/quarantine/PLUGIN_E2E_WORKFLOW.md` | Plugin E2E process workflow | Plugin workflow guidance predates the final runtime/plugin architecture and can preserve stale command surfaces. | Mining old E2E expectations and operational steps. | Rebuild only after plugin workflows are verified against implemented target topology. |
