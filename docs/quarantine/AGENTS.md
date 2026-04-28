<!-- quarantine-ledger: true -->

# Transient Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. It exists so agents can discover quarantined docs without treating them as current authority.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Files in this sibling `quarantine/` directory are not authoritative where they conflict with the active migration plan, final runtime realization spec, or canonical architecture spec.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/quarantine/SYSTEM.md` | Root system gateway | System-level gateway predates the final migration authority and can mislead agents from a first-hop location. | Mining previous system map and terminology. | Rebuild a new live system gateway after migration docs and runtime topology converge. |
