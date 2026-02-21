# Agent 1 Final: Phase E Architecture and Ordering

## Recommended Ordering
1. `E0` planning closure + steward drift-check.
2. `E1` dedupe policy hardening.
3. `E2` finished-hook policy hardening.
4. `E3` structural evidence gates.
5. `E4` decision closure for `D-009`/`D-010`.
6. `E5` independent review/fix closure.
7. `E5A` structural assessment.
8. `E6` docs and cleanup.
9. `E7` Phase F readiness.

## Dependency Logic
1. `E1` precedes `E4` because D-009 closure must use landed runtime evidence.
2. `E2` precedes `E4` because D-010 closure must use landed finished-hook behavior/evidence.
3. `E3` precedes `E4` to guarantee cleanup-safe, durable evidence/disposition verification.
4. `E5` and `E5A` are hard gates before docs/readiness.

## Failure Triggers
1. Dedupe hardening still depends on implicit built-in dedupe semantics.
2. Finished-hook behavior can cause critical side effects or exactly-once assumptions.
3. Disposition/evidence verification depends on scratch or ephemeral files.
4. Decision closure language remains ambiguous or non-actionable.

## Closure Recommendation
1. Lock `D-009` and `D-010` only if runtime+gate evidence proves policy language can be hardened without route/model drift.
2. If not lockable, keep open with explicit deferred rationale and hardened watchpoints in `E4_DISPOSITION.md`.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:202`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D7_PHASE_E_READINESS.md:1`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_E_PREP_NOTE.md:1`

## Assumptions
1. Phase D baseline is stable and clean.
2. Route-family invariants stay immutable in Phase E.

## Risks
1. Over-tightening decisions without durable evidence.
2. Gate fragility if evidence still references ephemeral artifacts.

## Unresolved Questions
1. Whether D-009 and D-010 both lock in Phase E or one carries forward.
