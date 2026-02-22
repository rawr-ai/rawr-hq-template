# F6 Cleanup Manifest

## Scope
Phase F docs+cleanup closure after F5A, limited to canonical docs alignment and runtime-pass artifact hygiene. This slice keeps closure-critical evidence durable for F7 and does not change runtime code or architecture.

## Path Actions (Explicit)
| Path | Action | Rationale |
| --- | --- | --- |
| `docs/projects/orpc-ingest-workflows-spec/README.md` | `update` | Added Phase F runtime-pass routing entries so canonical packet navigation matches as-landed F1..F6 state. |
| `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md` | `update` | Rebased status surface to include as-landed Phase F closure state through F6. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F6_CLEANUP_MANIFEST.md` | `finalize` | Publishes authoritative F6 path/action disposition for cleanup-gate replay. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_PLAN_VERBATIM.md` | `finalize` | Captures F6-only execution contract, owned paths, and constraints. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_SCRATCHPAD.md` | `finalize` | Captures F6 timeline and required verification command outputs. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_FINAL_F6_DOCS_CLEANUP.md` | `finalize` | Publishes closure report with evidence map, assumptions, risks, unresolved questions, and command outcomes. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md` | `retain` | Runtime-wave sequencing contract remains closure-critical for pass traceability. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_SCRATCHPAD.md` | `retain (untouched)` | Orchestrator ledger is pre-existing and out-of-scope in F6; preserved without edits per constraint. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json` | `retain` | Closure-critical conditional evidence artifact; required by `phase-f:gate:f6-cleanup-integrity`. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md` | `retain` | Closure-critical F4 disposition artifact; required by `phase-f:gate:f4-disposition` and `phase-f:gate:f6-cleanup-integrity`. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5_REVIEW_DISPOSITION.md` | `retain` | Closure-critical F5 review approval artifact. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5A_STRUCTURAL_DISPOSITION.md` | `retain` | Closure-critical F5A structural approval artifact. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_1_FINAL_F4_DECISION_CLOSURE.md` | `retain` | Supporting closure narrative for F4 decision path and gate outcomes. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_4_FINAL_F5_INDEPENDENT_REVIEW.md` | `retain` | Supporting closure narrative for F5 independent review scope and gate reruns. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_5_FINAL_F5A_STRUCTURAL_ASSESSMENT.md` | `retain` | Supporting closure narrative for F5A structural assessment rationale and evidence. |

## Retained Closure-Critical Artifacts
1. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md`
2. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5_REVIEW_DISPOSITION.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5A_STRUCTURAL_DISPOSITION.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`

## Conditional Artifact Posture
- `F4_TRIGGER_EVIDENCE.md` remains intentionally absent because `F4_DISPOSITION.md` declares `state: deferred`; triggered-only artifact creation is not allowed in this posture.

## Deletions
- `none`

## Deletion Rationale
Superseded intermediate candidates were reviewed, but no deletion was judged safe during active Phase F closure (`F7` still pending). F6 keeps audit-ready lineage and defers any aggressive pruning to a post-handoff pass.
