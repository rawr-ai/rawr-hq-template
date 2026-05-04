# Organization Manifest

Status: cleanup manifest / provenance / not active guidance.

This manifest records the research-tree cleanup that elevated current spec-alignment inputs and sequestered generated Hyperresearch artifacts.

## Elevated

| Original | New Location | Reason |
| --- | --- | --- |
| `2026-05-03-stack-drain-research-consolidation/rawr-spec-landscape/final_report_rawr-spec-landscape.md` | `../../spec-landscape-audit.md` | Current broad corpus audit for future spec-update intake. |
| `2026-05-03-stack-drain-research-consolidation/runtime-canon-arch-align/final_report_runtime-canon-arch-align.md` | `../../runtime-architecture-alignment-plan.md` | Current primary input for architecture/runtime alignment. |
| `2026-05-03-stack-drain-research-consolidation/hyperresearch-inngest-proof/repaired-proof/final-report.md` | `../../inngest-durable-workflow-findings.source-report.md` | Durable Inngest workflow findings and proof-boundary source report. |

## Synthesized

| New File | Source Inputs | Scope |
| --- | --- | --- |
| `../../ingest-misalignment-synthesis.md` | The elevated landscape audit, runtime/architecture alignment plan, and Inngest source report. | Only the three Inngest overlap points: event/interface gap, harness-mode alignment, durable workflow proof boundary. |
| `../../SPEC_UPDATE_BACKLOG.md` | Current elevated reports and synthesis. | Lightweight intake only; no priority order and no spec edits. |

## Sequestered

| Original Directory | New Location | Reason |
| --- | --- | --- |
| `2026-05-03-stack-drain-research-consolidation/rawr-spec-landscape/` | `rawr-spec-landscape/` | Query, comparisons, audits, and notes behind the elevated landscape audit. |
| `2026-05-03-stack-drain-research-consolidation/runtime-canon-arch-align/` | `runtime-canon-arch-align/` | Query, comparisons, audits, source analysis, and vendor verification behind the elevated alignment plan. |
| `2026-05-03-stack-drain-research-consolidation/hyperresearch-inngest-proof/` | `hyperresearch-inngest-proof/` | Proof inputs, blocked-proof leftovers, source captures, claim traces, validation output, and source notes behind the elevated Inngest source report. |

## Quarantined

| Original | New Location | Reason |
| --- | --- | --- |
| `coordination-service-lessons.md` | `../../quarantine/legacy-lessons/coordination-service-lessons.md` | Older archived-lane lessons, not current spec-alignment input. |
| `support-example-lessons.md` | `../../quarantine/legacy-lessons/support-example-lessons.md` | Older fixture lessons, not current spec-alignment input. |
| `service-package-effect-orpc-integration-snapshot.md` | `../../quarantine/legacy-lessons/service-package-effect-orpc-integration-snapshot.md` | Reference-only vendor-integration exemplar with stale runtime-boundary details. |

## Deleted

| Original | Reason |
| --- | --- |
| `2026-05-03-stack-drain-research-consolidation/DRAFT_STACK_DRAIN_PLAN.md` | Transient stack-drain process guidance, superseded by this cleanup. |
| `2026-05-03-stack-drain-research-consolidation/README.md` | Wrapper index for the removed stack-drain consolidation folder. |
| `hyperresearch-inngest-proof/repaired-proof/vault-research/notes-source/final_report_for-rawr-hq-runtime-realization-which-inngest-pr.md` | Duplicate generated source-note copy of the elevated Inngest source report. |

## Deliberately Not Touched

- Canonical specs under `../spec/`.
- Runtime or service implementation files.
- Existing `quarantine/oclif-cli-composition-spike/` packet.
- Hyperresearch proof provenance under this directory, except for removing the duplicate generated source-note copy of the elevated Inngest source report.
