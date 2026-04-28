<!-- quarantine-ledger: true -->

# Transient Runbook Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves runbooks whose operational intent may still matter, but whose commands or topology are not active instructions.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined runbooks are not authoritative where they conflict with active runbooks, the active migration plan, final runtime realization spec, or canonical architecture spec. Do not reconstruct runbooks from specs; mine the preserved runbook intent and rewrite only during promotion.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/process/runbooks/quarantine/TELEMETRY_VERIFICATION.md` | Telemetry verification runbook | Proof lane depends on quarantined telemetry docs and migration-sensitive routed surface details. | Mining trace, metric, log, and HyperDX verification steps. | Rebuild before agents rely on live telemetry proof commands. |
| `docs/process/runbooks/quarantine/ORPC_OPENAPI_COMPATIBILITY.md` | ORPC OpenAPI compatibility runbook | Publication and route-family details are target-sensitive during runtime migration. | Mining OpenAPI generation commands, external compatibility expectations, and negative publication checks. | Rebuild after route-family and projection publication policy are regenerated from the migration plan. |
| `docs/process/runbooks/quarantine/CLI_BUILD_PATHS.md` | CLI build-path runbook | Old CLI/plugin build topology may conflict with target runtime realization. | Mining build and path assumptions. | Rebuild before agents rely on CLI build paths. |
| `docs/process/runbooks/quarantine/RAWR_HQ_MANIFEST_COMPOSITION.md` | Manifest composition runbook | Manifest/composition semantics are target-sensitive during runtime migration. | Mining old composition workflows. | Rebuild after app composition and runtime realization are implemented. |
| `docs/process/runbooks/quarantine/LIFECYCLE_*.md` and `PATH_*.md` | Plugin lifecycle/path runbooks | Lifecycle/path matrices mix useful history with stale plugin and command surfaces. | Mining operational flows and expected proof points. | Promote only as rewritten active runbooks after target plugin flows are verified. |
| `docs/process/runbooks/quarantine/PLUGIN_BUILD_AND_WIRING_MATRIX.md` | Plugin build matrix | Matrix may encode stale topology and wiring names. | Mining coverage expectations. | Rebuild as a current matrix after migration proof lanes stabilize. |
