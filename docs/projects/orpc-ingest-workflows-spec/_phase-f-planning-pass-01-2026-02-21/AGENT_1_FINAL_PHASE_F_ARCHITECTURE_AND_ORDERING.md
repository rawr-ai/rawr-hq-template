# Agent 1 Final: Phase F Architecture and Ordering

## Recommended Slice Order
`F0 -> F1 -> F2 -> F3 -> F4 (conditional, artifact-mandatory) -> F5 -> F5A -> F6 -> F7`

## Architecture Scope Hypothesis
1. `F1`: Runtime core lifecycle seam hardening under locked route/identity invariants.
2. `F2`: Interface and policy hardening (type/schema/contract layer).
3. `F3`: Structural evidence and gate hardening with cleanup-safe verifier behavior.
4. `F4`: Conditional decision closure/disposition (target D-004 threshold), with always-on disposition artifact.

## F4 Trigger/Defer Policy
1. Trigger only when quantitative duplication threshold and correctness-drift signal are both present.
2. Triggered path:
   - publish `F4_TRIGGER_EVIDENCE.md`
   - publish `F4_DISPOSITION.md`
   - update `DECISIONS.md` for D-004 status transition
   - rerun impacted full gates.
3. Deferred path:
   - publish `F4_DISPOSITION.md` with explicit no-trigger evidence and hardened watchpoints
   - no D-004 status transition.

## Carry-Forward Patterns Applied
1. Per-slice branch discipline and forward-only execution.
2. Independent review and structural assessment as separate mandatory gates.
3. Conditional decision slices with explicit disposition artifacts.
4. Cleanup as gate-impacting and re-verified step.
5. Readiness artifact mandatory before next-phase kickoff.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
8. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:17`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:42`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:50`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:56`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:148`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:212`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:235`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md:27`
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md:34`

## Assumptions
1. Phase F will focus on D-016 deferred mechanics and associated seam hardening.
2. D-009 and D-010 remain locked and out of reopen scope.
3. Existing gate infrastructure is extendable without topology changes.

## Risks
1. Ambiguous F4 trigger thresholds may cause inconsistent closure behavior.
2. Overlap between F1/F2/F3 could create branch collisions if path boundaries are not enforced.
3. Structural pass may drift into architecture changes without strict guardrails.

## Unresolved Questions
1. Exact quantitative threshold for D-004 trigger in F4.
2. Whether E6/E7 publication lag must be fully drained before F runtime branch submissions.
