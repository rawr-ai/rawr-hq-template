# Spec Update Backlog

Status: lightweight backlog / not prioritized / not a spec edit plan.

This backlog tracks known spec-update inputs surfaced by the current research set. It is intentionally restrained until prioritization is defined.

## Known Needed Updates

(none currently; all known items have been resolved or moved to Future Intake)

## Completed Updates

| Item | Source Input | Resolution |
| --- | --- | --- |
| Align the system architecture with the runtime validation/runtime realization specification. | `runtime-architecture-alignment-plan.md` | **Complete** (2026-05-04). All seven recommendations applied across both canonical specs via the runtime-architecture-alignment workstream. Six user-decision items resolved (see `workstreams/runtime-architecture-alignment/decisions.md`). PR pending merge. The arch-spec now functions as the integration document the plan describes: §10.14 registry of attachment boundaries; §15.8 platform external interfaces; §10.12 named harness-mount types; §13.x per-harness contracts; §13.8 companion harness attachment requirements; §4.3a names-vs-mechanics carve-out; §4.0 execution-ownership law (arch-spec authoritative). |

## Future Intake

| Item | Source Input | Notes |
| --- | --- | --- |
| Review Inngest durable workflow and event-interface follow-up. | `ingest-misalignment-synthesis.md`, `inngest-durable-workflow-findings.source-report.md`, `spec-landscape-audit.md` | Keep as one future intake area for now. Do not treat it as a special priority until the broader backlog is ranked. |
| Review broader corpus-level spec gaps. | `spec-landscape-audit.md` | Includes other vendor/spec gaps such as bundle signing/registry, telemetry propagation, auth follow-ups, governance/RFDs, and MAWE/provider concerns. |
| Add future vendor/spec updates as they are surfaced. | TBD | Leave room for vendor specifications and companion specs not yet discussed. |

## Not Started Here

- Runtime async spec edits.
- Runtime realization spec edits beyond the L36 canonical-source cross-reference applied for Rec #7 Option B.
- Priority ranking.
- Implementation planning.
