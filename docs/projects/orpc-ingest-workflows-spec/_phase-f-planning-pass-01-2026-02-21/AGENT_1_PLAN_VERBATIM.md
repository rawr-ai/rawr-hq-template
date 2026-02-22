# Agent 1 Plan Verbatim — Phase F P1 (Read-Only)

## Role
P1 architecture and slice ordering for Phase F continuous wave.

## Constraints
1. Read-only: do not mutate files.
2. Preserve locked subsystem invariants and Graphite-first workflow.
3. Produce decision-complete ordering and dependency graph for `F0..F7`.
4. Include concrete `F1/F2/F3/F4` architecture scope hypothesis.
5. Define explicit trigger/defer policy for `F4` decision closure.

## Plan
1. Confirm repo/workflow context and active AGENTS scope.
2. Introspect required skills:
   - `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
3. Introspect required workflow prompts:
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` if present.
4. Ground on required corpus docs and Phase E handoff/readiness artifacts.
5. Extract locked invariants, unresolved decision surfaces, and A→E carry-forward patterns.
6. Build decision-complete Phase F DAG with explicit owner boundaries and gate sequencing.
7. Define F4 trigger/defer policy with artifact contract (`disposition` always; `trigger evidence` conditional).
8. Emit:
   - `AGENT_1_PLAN_VERBATIM.md`
   - `AGENT_1_SCRATCHPAD.md`
   - `AGENT_1_FINAL_PHASE_F_ARCHITECTURE_AND_ORDERING.md`
