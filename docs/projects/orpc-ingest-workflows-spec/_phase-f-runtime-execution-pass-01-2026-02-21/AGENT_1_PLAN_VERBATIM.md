# Agent 1 Plan Verbatim (F4 Decision Closure)

## Role
I1 execution scope for F4 conditional D-004 disposition closure on `codex/phase-f-f4-decision-closure`.

## Grounding
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f4-trigger-scan.mjs`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f4-disposition.mjs`
10. Phase F packet/spec docs sourced from `codex/phase-f-planning-packet` via `git show`:
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_EXECUTION_PACKET.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_IMPLEMENTATION_SPEC.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_ACCEPTANCE_GATES.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_WORKBREAKDOWN.yaml`
11. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md` (D-004 status and lock language baseline)

## Scope Lock
1. F4 disposition closure only (`triggered` or `deferred`).
2. No architecture pivot and no route-family drift.
3. Keep D-004 locked unless F4 trigger criteria are all met.
4. Do not edit orchestrator-owned scratchpad docs.
5. Do not commit.

## Plan
1. Re-run `bun run phase-f:gate:f4-assess` and confirm counters/state in `F4_TRIGGER_SCAN_RESULT.json`.
2. Author `F4_DISPOSITION.md` with one explicit state (`triggered` or `deferred`) and required sections (`Trigger Matrix Summary`, `Carry-Forward Watchpoints`).
3. If state is `deferred`, keep D-004 locked with explicit non-ambiguous language and do not create `F4_TRIGGER_EVIDENCE.md`.
4. If state is `triggered`, publish `F4_TRIGGER_EVIDENCE.md` and minimally update D-004 in `DECISIONS.md` with explicit `locked -> closed` transition language.
5. Run `bun run phase-f:gate:f4-disposition`.
6. Update runtime-pass agent artifacts for closure (`AGENT_1_SCRATCHPAD.md`, `AGENT_1_FINAL_F4_DECISION_CLOSURE.md`) with evidence map and verification outcomes.

## Expected Files
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_EVIDENCE.md` (triggered path only)
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_1_SCRATCHPAD.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_1_FINAL_F4_DECISION_CLOSURE.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md` (triggered path only)
