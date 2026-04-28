<!-- quarantine-ledger: true -->

# Transient System Quarantine Ledger

This is a transient `AGENTS.md` ledger for migration containment. The sibling `quarantine/` directory preserves system docs that remain useful but are not current authority.

Use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` for the governing workflow.

## Conflict Rule

Quarantined system docs are not authoritative where they conflict with the active migration plan, final runtime realization spec, or canonical architecture spec. Read them carefully for behavior and history, then defer to active specs on conflicts.

## Quarantined Material

| Quarantined path | Original role | Why quarantined | Still useful for | Promotion condition |
| --- | --- | --- | --- | --- |
| `docs/system/quarantine/TELEMETRY.md` | System telemetry reference | Telemetry content mixes real subsystem detail with migration-sensitive proof lanes, routes, and topology. | Mining HyperDX, routed telemetry, and runtime log context. | Rebuild before live telemetry/proof-lane work depends on this subsystem reference. |
| `docs/system/quarantine/telemetry/` | Telemetry subtopic packet | Subtopic docs depend on the quarantined telemetry reference and may encode stale route/proof topology. | Mining detailed ORPC, HyperDX, and HQ runtime observations. | Rebuild after telemetry topology is implemented or explicitly planned against final specs. |
| `docs/system/quarantine/PLUGINS.md` | System plugin reference | Plugin/runtime composition guidance is target-sensitive during the architecture migration. | Mining old plugin behavior and command-surface history. | Rebuild after final plugin/runtime topology is implemented and reviewed. |
| `docs/system/quarantine/enforcement.md` | Enforcement reference | Enforcement claims can conflict with current structural gates and final runtime authority. | Mining prior guardrail intent. | Rebuild after active gates and enforcement scripts are verified against the final specs. |
