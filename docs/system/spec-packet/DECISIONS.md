# Flat Runtime Spec Packet Decisions

## Status Key
- `closed`: accepted baseline decision for this packet.
- `deferred`: intentionally postponed with explicit owner/trigger.

## Decision Register

| ID | Title | Status | Date | Default / Resolution | Rationale | Impact | Owner | Closure Criterion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-001 | Workflow-to-API exposure model | closed | 2026-02-13 | API plugins expose ORPC procedures; workflow plugins expose Inngest functions; API handlers trigger workflows via package-owned events/contracts. | Preserves runtime semantics while keeping authoring unified in packages. | Keeps API/workflow boundaries explicit and enforceable. | Platform architecture steward | Documented in canonical packet and reflected in examples A/B/C. |
| D-002 | Runtime metadata minimization | closed | 2026-02-13 | Required runtime metadata is `rawr.kind` + `rawr.capability`; `templateRole` and `channel` are removed from runtime semantics. | Reduces metadata duplication and ambiguity. | Requires updates in docs/process/tooling that currently reference legacy metadata. | Plugin platform owner | Updated docs/process references and enforcement checks listed in packet. |
| D-003 | Manifest discovery mode (phase 1) | closed | 2026-02-13 | Explicit/manual registration in `rawr.hq.ts` for first cut. | Deterministic and reviewable during initial cutover. | Slightly more manual registration in exchange for safer migration. | Runtime composition owner | Canonical packet and runbook define explicit registration workflow. |
| D-004 | Workflow-backed ORPC helper abstraction | deferred | 2026-02-13 | Do not add in phase 1; evaluate after at least two capabilities show repeated boilerplate. | Avoids premature abstraction. | Temporary duplication in API handlers until evidence threshold is met. | API platform owner | Re-open after two capabilities with evidence of repeated pattern. |
| D-005 | `publishTier` / `published` runtime role | deferred | 2026-02-13 | Keep as deprecated metadata until centralized release policy lands; then remove from runtime semantics. | Prevents blocking release governance while runtime model is simplified. | Transitional docs/tooling complexity remains until release-policy cutover completes. | Release governance owner | Centralized release policy doc exists and runtime tooling no longer reads fields. |

## Decision Hygiene Rule
Any new architecture-impacting choice discovered during implementation must be added here before execution continues.
