# Agent 4 Plan Verbatim (F5 Independent Review)

## Role
I4 independent review scope for Phase F closure on `codex/phase-f-f5-review-fix-closure`.

## Required Skills Introspection
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`

## Mandatory Workflow Introspection
1. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
2. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
3. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` -> not present in current environment.
4. Mapping note: canonical spec->milestone prompt path in this environment is `dev-spec-to-milestone.md`.

## Scope Lock
1. Review the full Phase F runtime diff chain `codex/phase-f-runtime-implementation..HEAD` (F1..F4 outputs now present in branch state).
2. Perform independent review from TypeScript + oRPC lenses with adversarial boundary-check expectations.
3. No code edits unless a blocking/high finding requires direct correction.
4. Leave orchestrator scratchpad untouched.
5. Do not commit.

## Review Surfaces
1. Runtime authority/lifecycle seams:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/test/repo-state.concurrent.test.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts`
2. Interface/policy seams:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/ids.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/runtime-router.ts`
3. Contract drift and gate hardening:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/orpc-contract-drift.test.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/workflow-trigger-contract-drift.test.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-f/*.mjs`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json`

## Execution Plan
1. Verify branch/worktree state and record pre-existing dirtiness (without mutating orchestrator artifacts).
2. Complete mandatory skill + workflow introspection reads before substantive review.
3. Enumerate and inspect full diff surface for `codex/phase-f-runtime-implementation..HEAD`.
4. Run adversarial review checks across ID normalization, contract edge constraints, additive schema posture, and authority-root seam behavior.
5. Severity-rank findings with anchored evidence; determine `approve` vs `changes-required`.
6. Run required verification command: `bun run phase-f:gates:full`.
7. Write required artifacts:
- `AGENT_4_PLAN_VERBATIM.md`
- `AGENT_4_SCRATCHPAD.md`
- `AGENT_4_FINAL_F5_INDEPENDENT_REVIEW.md`
- `F5_REVIEW_DISPOSITION.md`
