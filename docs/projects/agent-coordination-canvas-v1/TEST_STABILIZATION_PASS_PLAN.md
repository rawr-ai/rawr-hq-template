# Test Stabilization Pass Plan (Fast Green Gate + Optional Heavy Phases)

## Summary
This plan stabilizes the repo’s test system so `bun run test` is reliably green and fast, while preserving full coverage through explicit heavy phases (`CLI-heavy` + `Playwright visual`) that remain runnable and documented.

It resolves all current failures by:
1. Aligning stale test assertions to current command behavior (mirroring shared `rawr-hq` contracts where applicable).
2. Enforcing runner boundaries (Playwright visual test never run by root Vitest).
3. Splitting test execution into fast/default vs heavy/optional phases.
4. Making heavy CLI suites deterministic via dedicated config (longer timeout + reduced parallel contention), not by inflating all test timeouts globally.

## Locked Decisions
1. Mirror shared expectations from `rawr-hq` for shared command contracts.
2. Fix root test instability by separating heavy phases, not by blanket timeout increases on the default gate.
3. Keep visual tests Playwright-only and exclude them from root Vitest.
4. Use orchestrator + one implementation agent (single execution owner for this pass).

## Orchestration Model
1. Orchestrator: integration owner, Graphite hygiene, final validation.
2. Agent TS-Impl: executes all code/test/docs changes in one branch slice to minimize merge risk.
3. Optional Agent TS-Verify: read-only rerun loop (3x fast gate + heavy gate confirmation) before submit.

## Execution Bootstrap (First Action)
1. Write canonical plan doc:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/projects/agent-coordination-canvas-v1/TEST_STABILIZATION_PASS_PLAN.md`
2. Write orchestrator scratchpad:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/projects/agent-coordination-canvas-v1/TEST_STABILIZATION_PASS_SCRATCH.md`
3. If using agent:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/projects/agent-coordination-canvas-v1/agent-test-stabilization-plan.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/projects/agent-coordination-canvas-v1/agent-test-stabilization-scratch.md`

## Graphite Branch Plan
1. Base: `codex/orpc-v1-s09-docs-skills-runbooks-finalize`
2. New top branch: `codex/test-stabilization-v1-fast-heavy-gates`
3. One branch for this pass (sequential, tightly coupled changes).

## Implementation Slices

### S00 — Baseline Capture + Contract Diff Reference
1. Capture failing baseline with:
- `bun run test`
2. Capture shared contract references from personal repo (`rawr-hq`) for:
- `apps/cli/test/workflow-forge-command.test.ts`
- `apps/cli/test/stubs.test.ts`
3. Log exact fail taxonomy in scratch:
- assertion drift vs timeout pressure vs runner mismatch.

### S01 — Fix Deterministic Assertion Drift (Mirror Shared Contract)
1. Update:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/apps/cli/test/workflow-forge-command.test.ts`
2. Change expected step names to current behavior:
- `["scaffold", "tests"]`
3. Update:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/apps/cli/test/stubs.test.ts`
4. Replace brittle empty-list expectation with semantic shared contract:
- default `plugins web list --json` includes operational plugins.
- fixture/example plugins excluded by default.
- `--all` includes fixture plugins like `@rawr/plugin-hello`.
5. Keep template-safe assertions (do not hardcode personal-repo-only plugin IDs).

### S02 — Enforce Runner Boundary (Vitest vs Playwright)
1. Update root Vitest project config:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/vitest.config.ts`
2. Ensure `apps/web/test/coordination.visual.test.ts` is excluded from root Vitest web project.
3. Preserve Playwright ownership via existing script:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/apps/web/package.json` `test:visual`

### S03 — Split Fast vs Heavy Test Phases
1. Add fast config:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/vitest.fast.config.ts`
2. Add heavy CLI config:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/vitest.heavy.cli.config.ts`
3. Heavy CLI config characteristics:
- run `cli` project only
- include heavy files explicitly
- `testTimeout` elevated (for heavy phase only)
- reduced file contention (`fileParallelism: false` and/or `maxWorkers: 1`)
4. Heavy CLI suite inventory:
- `apps/cli/test/stubs.test.ts`
- `apps/cli/test/plugins-command-surface-cutover.test.ts`
- `apps/cli/test/plugins-converge-and-doctor.test.ts`
- `apps/cli/test/plugins-sync-drift.test.ts`
- `apps/cli/test/plugins-status.test.ts`
- `apps/cli/test/security-posture.test.ts`
- `apps/cli/test/journal.test.ts`
- `apps/cli/test/workflow-harden.e2e.test.ts`
5. Update root scripts:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/package.json`
6. Final script contract:
- `test` -> fast green gate
- `test:vitest` -> fast vitest run
- `test:all` -> fast + heavy CLI + visual
- `test:heavy:cli`
- `test:heavy:visual`
- `test:heavy` -> cli + visual
7. Keep single-build invariant (no duplicated pretest build invocation).

### S04 — Targeted Heavy Reliability Hardening (Only Where Needed)
1. Add focused timeout annotations only to genuinely heavy test blocks if still needed after S03 (not global).
2. Normalize `runRawr` helper options in heavy files where output/IO is high:
- ensure adequate `maxBuffer`
- keep HOME/XDG isolation deterministic
3. Do not change production command behavior for timeout-only issues.

### S05 — Docs + Runbook Alignment
1. Update root usage docs for new gate model:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/process/HQ_USAGE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/process/HQ_OPERATIONS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl/docs/process/AGENT_LOOPS.md`
2. Document:
- default fast gate expectation
- when to run heavy CLI and visual suites
- troubleshooting for Playwright dependency setup.

### S06 — Validation + Stability Proof
1. Required:
- `bun run typecheck`
- `bun run test` (fast gate) x3 consecutive runs
2. Required heavy checks:
- `bun run test:heavy:cli`
- `bun run test:heavy:visual` (if Playwright browsers present; otherwise run setup then rerun)
- `bun run test:all`
3. Targeted shared-contract checks:
- `bunx vitest run apps/cli/test/workflow-forge-command.test.ts apps/cli/test/stubs.test.ts`
4. Acceptance:
- all commands above green in final branch state.

## Important Changes to Public Interfaces
1. Developer test command interface changes in root `package.json`:
- `bun run test` becomes the fast/stable default gate.
- New explicit heavy/all scripts become canonical for deeper coverage.
2. No runtime API/protocol changes.
3. No ORPC contract/interface changes.

## Test Cases and Scenarios

### Contract Drift
1. `workflow forge-command --json --dry-run` step names match current command surface (`scaffold`, `tests`).
2. `plugins web list` default visibility semantics match shared policy (operational default, fixtures gated to `--all`).

### Runner Boundary
1. Root Vitest no longer attempts to execute Playwright file `apps/web/test/coordination.visual.test.ts`.
2. `bun run --cwd apps/web test:visual` remains the visual test entrypoint.

### Fast/Heavy Phase Behavior
1. `bun run test` succeeds and remains stable across 3 runs.
2. `bun run test:heavy:cli` succeeds with heavy suite configuration.
3. `bun run test:all` succeeds end-to-end in environments with Playwright setup.

## Assumptions and Defaults
1. Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl`
2. Graphite workflow remains mandatory.
3. No `.github/workflows` exists in this repo; script/runbook contract is the source of truth.
4. Heavy phase is optional for default local loop, but must remain runnable and green.
5. If a heavy test still flakes after phase split, stabilize via targeted fixture/setup fixes before widening timeout scope.
