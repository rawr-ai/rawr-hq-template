<!-- quarantine-ledger: true -->

# Transient Spec Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves spec-adjacent docs that should not sit beside final canonical specs as active authority.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined spec-adjacent docs are not authoritative where they conflict with the active migration plan, final runtime realization spec, or canonical architecture spec.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md` | Canonical testing plan | Testing authority is target-sensitive and must not remain a live peer of the final architecture/runtime specs during migration planning. | Mining proof taxonomy, ratchet strategy, and test ownership rules. | Rebuild before migration proof planning or final M2 work items rely on testing gates. |
| `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/m2-guardrails-and-enforcement.md` | Previous M2 guardrails | Guardrails may encode stale gates, topology, or proof lanes. | Mining enforcement intent and proof expectations. | Rebuild after active gates are derived from the regenerated migration plan. |
| `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/spec-review.md` | Spec review artifact | Review artifact is evidence, not a peer of final specs. | Mining unresolved questions and critique. | Keep as provenance unless a current review packet replaces it. |
