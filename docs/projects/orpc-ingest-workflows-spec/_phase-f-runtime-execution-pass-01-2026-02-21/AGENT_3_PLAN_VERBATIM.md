# Agent 3 Plan Verbatim (F3 Structural Evidence Gates)

## Role
I3 execution scope for `F3` structural evidence + gate hardening on `codex/phase-f-f3-structural-evidence-gates`.

## Required Skills Introspection
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`

## Grounding
1. Runtime packet/order/invariants:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_F_PREP_NOTE.md`
2. Phase F planning packet sources via `git show` from `codex/phase-f-planning-packet`:
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_EXECUTION_PACKET.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_IMPLEMENTATION_SPEC.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_ACCEPTANCE_GATES.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_WORKBREAKDOWN.yaml`
3. Prior verifier style and durable-evidence patterns:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-d/_verify-utils.mjs`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-d/verify-d4-disposition.mjs`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-e/_verify-utils.mjs`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-e/verify-e3-evidence-integrity.mjs`

## Scope Lock (F3 Only)
1. Implement/land only F3 structural evidence + gate hardening wiring.
2. No runtime route-family or manifest authority changes.
3. No architecture pivots.
4. Keep errors strict/explicit and gate behavior deterministic.
5. Leave orchestrator-owned scratch artifacts untouched.

## Target Paths
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/_verify-utils.mjs`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f2-interface-policy-contract.mjs`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f3-evidence-integrity.mjs`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f4-trigger-scan.mjs`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/verify-f4-disposition.mjs`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json`

## Execution Plan
1. Create `scripts/phase-f` verifier utility scaffold mirroring strict D/E behavior.
2. Implement F1/F2 structural verifiers with explicit script-contract assertions and strict seam-policy checks.
3. Implement F3 evidence-integrity verifier to enforce durable artifact dependencies and closure/exit script chains.
4. Implement F4 scan/disposition verifiers:
- scan emits deterministic counters to `F4_TRIGGER_SCAN_RESULT.json`.
- disposition requires explicit `state: triggered|deferred` in `F4_DISPOSITION.md`.
- trigger evidence file required only for triggered state.
5. Add full Phase F quick/full/closure/exit script wiring in `package.json`, including F5/F5A/F6/F7 gate chain in exit.
6. Run required verification commands and capture exact outputs, including expected F4 disposition gate failure if disposition artifact is absent.
7. Publish required Agent 3 runtime artifacts with evidence map, assumptions, risks, unresolved questions, and command outcomes.
