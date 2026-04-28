<!-- quarantine-ledger: true -->

# Transient Projects Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves project packets that are useful evidence but not active project authority.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined project docs are not authoritative where they conflict with active project docs, the active migration plan, final runtime realization spec, or canonical architecture spec.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/projects/quarantine/orpc-ingest-workflows-spec/` | ORPC ingest workflow spec packet | Project packet contains stale guidance that can be mistaken for active architecture during migration. | Mining prior ORPC/Inngest workflow reasoning and examples. | Keep quarantined unless a new active project explicitly reclaims and rewrites the material. |
