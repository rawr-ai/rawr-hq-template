# Agent 6 Plan (F6 Docs + Cleanup)

## Scope (F6 Only)
1. Align canonical docs to as-landed Phase F behavior through F6 without architecture pivots.
2. Publish `F6_CLEANUP_MANIFEST.md` with explicit path/action/rationale inventory.
3. Preserve closure-critical artifacts and remove superseded intermediates only when safe.
4. Produce Agent 6 closure artifacts (`plan`, `scratchpad`, `final`) and run required F6 verification commands.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`

## Grounding Inputs
1. Runtime pass artifacts under `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/`.
2. Phase F packet/acceptance sources from `codex/phase-f-planning-packet` via `git show`:
   - `PHASE_F_EXECUTION_PACKET.md`
   - `PHASE_F_IMPLEMENTATION_SPEC.md`
   - `PHASE_F_ACCEPTANCE_GATES.md`
   - `PHASE_F_WORKBREAKDOWN.yaml`
3. F6 gate contracts in `scripts/phase-f/verify-f3-evidence-integrity.mjs` (`--mode=f6-cleanup-manifest`, `--mode=f6-cleanup-integrity`).

## Owned Paths
1. `docs/projects/orpc-ingest-workflows-spec/README.md`
2. `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F6_CLEANUP_MANIFEST.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_PLAN_VERBATIM.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_SCRATCHPAD.md`
6. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_FINAL_F6_DOCS_CLEANUP.md`

## Execution Plan
1. Read runtime pass closure artifacts (`F4`, `F5`, `F5A`) and identify canonical doc drift.
2. Apply minimal canonical doc updates (`README.md`, `PROJECT_STATUS.md`) to match as-landed Phase F posture.
3. Publish `F6_CLEANUP_MANIFEST.md` with explicit `Path | Action | Rationale`, including retained closure-critical artifact list and F4 scan/disposition retention.
4. Run required verification commands:
   - `bun run phase-f:gate:f6-cleanup-manifest`
   - `bun run phase-f:gate:f6-cleanup-integrity`
5. Record command outcomes and evidence mapping in Agent 6 scratchpad/final artifacts.

## Hard Constraints
1. No runtime code changes.
2. No architecture pivots.
3. Do not modify `ORCHESTRATOR_SCRATCHPAD.md`.
4. Do not delete closure-critical artifacts.
5. Do not commit.
