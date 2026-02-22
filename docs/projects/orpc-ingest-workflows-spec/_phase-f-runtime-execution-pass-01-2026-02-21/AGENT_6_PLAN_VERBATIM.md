# Agent 6 Plan (F7 Readiness + Handoff)

## Scope (F7 Only)
1. Publish final Phase F closure artifacts:
   - `F7_NEXT_PHASE_READINESS.md`
   - `PHASE_F_EXECUTION_REPORT.md`
   - `FINAL_PHASE_F_HANDOFF.md`
2. Ensure readiness/report/handoff include explicit posture, blockers, owners, ordering, and explicit F4 `deferred` disposition context.
3. Update canonical status docs minimally to reflect F7 completion.
4. Update Agent 6 continuity artifacts (`plan`, `scratchpad`, `final`) and run required F7 verification commands.

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
3. F7 gate contract in `scripts/phase-f/verify-f3-evidence-integrity.mjs` (`--mode=f7-readiness`) and full exit chain in `phase-f:gates:exit`.

## Owned Paths
1. `docs/projects/orpc-ingest-workflows-spec/README.md`
2. `docs/projects/orpc-ingest-workflows-spec/PROJECT_STATUS.md`
3. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F7_NEXT_PHASE_READINESS.md`
4. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/PHASE_F_EXECUTION_REPORT.md`
5. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/FINAL_PHASE_F_HANDOFF.md`
6. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_PLAN_VERBATIM.md`
7. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_SCRATCHPAD.md`
8. `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_6_FINAL_F7_READINESS_AND_HANDOFF.md`

## Execution Plan
1. Draft F7 readiness/report/handoff artifacts from as-landed F1..F6 state.
2. Include explicit posture/blockers/owners/ordering and explicit F4 `deferred` context in all three F7 artifacts.
3. Apply minimal canonical docs updates (`README.md`, `PROJECT_STATUS.md`) for F7 completion pointers.
4. Run required verification commands:
   - `bun run phase-f:gate:f7-readiness`
   - `bun run phase-f:gates:exit`
5. Capture command outcomes and evidence map in Agent 6 scratchpad/final artifact.

## Hard Constraints
1. No runtime code changes.
2. No architecture pivots.
3. Do not modify `ORCHESTRATOR_SCRATCHPAD.md`.
4. Do not commit.
