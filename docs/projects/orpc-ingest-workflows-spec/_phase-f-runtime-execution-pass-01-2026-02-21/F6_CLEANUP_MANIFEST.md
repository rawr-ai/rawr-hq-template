# F6 Cleanup Manifest

## Scope
Phase F docs+cleanup closure after F5A, limited to canonical docs alignment and runtime-pass artifact hygiene. This slice keeps closure-critical evidence durable for F7 and does not change runtime code or architecture.

## Path Actions (Explicit)
| Path | Action | Rationale |
| --- | --- | --- |
| `docs/projects/orpc-ingest-workflows-spec/README.md` | `update` | Added Phase F runtime-pass routing entries so canonical packet navigation matches as-landed F1..F6 state. |
| `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md` | `update` | Rebased status surface to include as-landed Phase F closure state through F6. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F6_CLEANUP_MANIFEST.md` | `finalize` | Publishes authoritative F6 path/action disposition for cleanup-gate replay. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json` | `retain` | Closure-critical conditional evidence artifact; required by `phase-f:gate:f6-cleanup-integrity`. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md` | `retain` | Closure-critical F4 disposition artifact; required by `phase-f:gate:f4-disposition` and `phase-f:gate:f6-cleanup-integrity`. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5_REVIEW_DISPOSITION.md` | `retain` | Closure-critical F5 review approval artifact. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5A_STRUCTURAL_DISPOSITION.md` | `retain` | Closure-critical F5A structural approval artifact. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F7_NEXT_PHASE_READINESS.md` | `retain` | Closure-critical readiness artifact for downstream phase kickoff. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/PHASE_F_EXECUTION_REPORT.md` | `retain` | Closure-critical execution report for end-to-end replay. |
| `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/FINAL_PHASE_F_HANDOFF.md` | `retain` | Final closure handoff remains canonical phase completion output. |
| `docs/projects/orpc-ingest-workflows-spec/HISTORY_RECOVERY.md` | `add (post-close)` | Documents deterministic git-history recovery for removed non-canonical artifacts. |
| `runtime pass working artifacts` | `pruned (post-close)` | Superseded non-canonical working artifacts were removed after closure and can be recovered via `HISTORY_RECOVERY.md`. |

## Retained Closure-Critical Artifacts
1. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md`
2. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5_REVIEW_DISPOSITION.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F5A_STRUCTURAL_DISPOSITION.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F6_CLEANUP_MANIFEST.md`
6. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F7_NEXT_PHASE_READINESS.md`
7. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/PHASE_F_EXECUTION_REPORT.md`
8. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/FINAL_PHASE_F_HANDOFF.md`

## Conditional Artifact Posture
- `F4_TRIGGER_EVIDENCE.md` remains intentionally absent because `F4_DISPOSITION.md` declares `state: deferred`; triggered-only artifact creation is not allowed in this posture.

## Deletions
- superseded runtime-pass working artifacts from `_phase-f-runtime-execution-pass-01-2026-02-21/`

## Deletion Rationale
Post-close packet hygiene removed non-canonical working artifacts while preserving closure-critical dispositions, evidence JSON, cleanup manifest, readiness, report, and handoff artifacts. Recover removed artifacts via `HISTORY_RECOVERY.md`.
