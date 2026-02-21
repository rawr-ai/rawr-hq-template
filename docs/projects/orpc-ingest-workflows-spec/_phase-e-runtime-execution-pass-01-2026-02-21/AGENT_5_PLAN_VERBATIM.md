# Agent 5 Plan (E6 Docs + Cleanup)

## Scope (E6 Only)
1. Align canonical packet docs to the as-landed Phase E state through E5A while closing E6 docs+cleanup artifacts.
2. Finalize E6 cleanup artifacts (`E6_CLEANUP_MANIFEST.md`, `AGENT_5_*`) with explicit path actions and verification evidence.
3. Preserve architecture/runtime invariants and avoid non-doc edits.

## Owned Paths
1. `docs/projects/orpc-ingest-workflows-spec/README.md`
2. `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E6_CLEANUP_MANIFEST.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_5_PLAN_VERBATIM.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_5_SCRATCHPAD.md`
6. `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/AGENT_5_FINAL_E6_DOCS_CLEANUP.md`
7. Optional ledger continuity update: `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_SCRATCHPAD.md`

## Execution Plan
1. Finalize canonical index/status updates in `README.md` and `PROJECT_STATUS.md`.
2. Publish explicit per-path cleanup actions and rationales in `E6_CLEANUP_MANIFEST.md`.
3. Run required verification chain and capture command outputs:
   - `bun run phase-e:e3:quick`
   - `bun run phase-e:gate:e4-disposition`
   - `bun run phase-e:gates:exit`
4. Record outputs + closure evidence in scratch/final artifacts and append optional orchestrator ledger note.
5. Commit docs-only E6 closure on branch `codex/phase-e-e6-docs-cleanup`.

## Hard Constraints
1. No runtime code edits.
2. Route families unchanged.
3. Channel semantics remain command-surface only.
4. Manifest authority unchanged.
5. No architecture pivots.
