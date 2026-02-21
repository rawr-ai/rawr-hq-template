# Agent 6 Plan (E7 Readiness + Phase E Wrap-Up)

## Scope (E7 Only)
1. Publish explicit Phase F readiness posture with blockers, owners, and kickoff ordering.
2. Publish Phase E execution report covering E1..E7 closure, gates, review/structural outcomes, and stack/submit status.
3. Publish final Phase E handoff summary.
4. Align canonical status docs to reflect full Phase E closure.
5. Run required verification commands and capture outputs in closure artifacts.

## Owned Paths
1. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_6_PLAN_VERBATIM.md`
2. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_6_SCRATCHPAD.md`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_6_FINAL_E7_READINESS_AND_HANDOFF.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/PHASE_E_EXECUTION_REPORT.md`
6. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/FINAL_PHASE_E_HANDOFF.md`
7. `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
8. `docs/projects/orpc-ingest-workflows-spec/README.md` (if required for final alignment)

## Execution Plan
1. Publish E7 readiness with explicit `posture`, `blockers`, `owners`, and `ordering` sections.
2. Publish an end-to-end Phase E execution report with slice-by-slice outcomes (`E1..E7`), gate outcomes, review disposition, structural disposition, and branch/PR stack state.
3. Publish final handoff summary with runtime artifact inventory and canonical docs updates.
4. Run required command chain and capture outputs:
   - `bun run phase-e:gates:exit`
   - `gt sync --no-restack`
   - `gt log --show-untracked`
5. Record command evidence and closure analysis in Agent 6 scratchpad/final report.
6. Commit docs-only E7 closure updates on `codex/phase-e-e7-phase-f-readiness`.

## Hard Constraints
1. No runtime code changes.
2. Preserve route-family and runtime identity invariants.
3. Preserve decision closure semantics for D-009 and D-010.
4. Ignore unrelated paths, including pre-existing untracked `docs/slides/`.
