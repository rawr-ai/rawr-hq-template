# GT Move Single-Stack Unification Plan (ORPC Stack onto Coordination-WK Top)

## Summary
This pass will unify the active coordination work into one Graphite stack by moving the ORPC stack root onto the top branch of the remaining coordination interactive stack, then resolving expected rebase conflicts with a deterministic policy.  
The expected conflict surface is small and already identified: `apps/web/test/coordination.visual.test.ts` and `bun.lock`.  
End state: one continuous stack chain from `main` through `codex/coordination-wk-interactive-v1-*` and then `codex/orpc-v1-s00...s09`, with no detached ORPC side stack.

## Step 0: Write Canonical Plan Doc First
1. Create and populate this exact plan at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/agent-coordination-canvas-v1/RESTACK_SINGLE_STACK_GT_MOVE_PLAN.md`.
2. Create live orchestrator scratch notes at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/agent-coordination-canvas-v1/RESTACK_SINGLE_STACK_GT_MOVE_SCRATCHPAD.md`.
3. Log every conflict and chosen resolution in the scratchpad with timestamps.

## Step 1: Preflight and Safety Anchors
1. Confirm clean state on repo root and fetch metadata with `gt sync --no-restack`.
2. Capture current graph snapshot in scratch (`gt log --all` output summary).
3. Create rollback anchors before mutation:
1. `codex/backup-orpc-s00-pre-move` pointing at `codex/orpc-v1-s00-plan-bootstrap`.
2. `codex/backup-orpc-s09-pre-move` pointing at `codex/orpc-v1-s09-docs-skills-runbooks-finalize`.
3. `codex/backup-wk-top-pre-move` pointing at `codex/coordination-wk-interactive-v1-cutover-purge`.

## Step 2: Move ORPC Root onto Coordination-WK Top
1. Checkout ORPC stack root branch: `gt checkout codex/orpc-v1-s00-plan-bootstrap`.
2. Move the root branch onto the current coordination-wk top: `gt move --onto codex/coordination-wk-interactive-v1-cutover-purge`.
3. Let Graphite restack descendants automatically (S01..S09).

## Step 3: Conflict Resolution Playbook During `gt move`
1. For `apps/web/test/coordination.visual.test.ts`, resolve by combining both intents:
1. Keep ORPC transport mocking (`**/rpc/**`, `coordination/*` procedure names, `rpcSuccess`/`rpcError` envelopes).
2. Keep interactive-canvas selector upgrades (`getByRole` run button locator and `#coordination-workflow-name` input selector).
3. Keep newer canvas interaction tests (node select + add-node scenarios) intact.
2. For `bun.lock`, do not hand-merge hunks:
1. During rebase conflict, take target-side lockfile to unblock (`--ours` on the rebasing conflict).
2. Continue rebase with `gt continue`.
3. Defer final lock correctness to one post-restack regeneration step.
3. If any unexpected file conflicts appear, log file path and choose resolution by rule:
1. Preserve newer coordination-wk UI/interaction behavior.
2. Preserve ORPC endpoint/contract/client semantics.
3. If both are required, merge additively; do not drop either behavior.

## Step 4: Post-Move Hygiene Restack (Only If Needed)
1. Inspect graph with `gt log --all`.
2. If `codex/coordination-wk-interactive-v1-docs` still shows `needs restack`, run:
1. `gt checkout codex/coordination-wk-interactive-v1-docs`
2. `gt restack --upstack`
3. Apply the same conflict policy and continue via `gt continue`.

## Step 5: Lockfile and Verification
1. On stack top branch (`codex/orpc-v1-s09-docs-skills-runbooks-finalize`), regenerate lock deterministically with `bun install`.
2. If regeneration changes `bun.lock`, keep those changes in the top branch as a focused post-restack update.
3. Run verification gates:
1. `bun run typecheck`
2. `bun run test`
4. Run targeted smoke checks after full tests:
1. Coordination visual tests include ORPC RPC mocks and interactive canvas paths.
2. ORPC server/client flows still pass existing coordination/state tests.

## Step 6: Acceptance Criteria for “One Single Stack”
1. `gt log --all` shows this single chain:
1. `main` -> `codex/coordination-wk-interactive-v1-docs` -> `...-editor-surface` -> `...-design-parity` -> `...-behavior-gates` -> `...-cutover-purge` -> `codex/orpc-v1-s00-plan-bootstrap` -> `...` -> `codex/orpc-v1-s09-docs-skills-runbooks-finalize`.
2. No ORPC branch remains parented to `codex/coordination-fixpass-v1-cutover-purge`.
3. No branch in this active chain is marked `needs restack`.
4. Working tree is clean at end.

## Step 7: Rollback Strategy
1. If restack becomes unstable, abort current Graphite operation with `gt abort`.
2. Restore original positions from backup anchors created in Step 1.
3. Re-run with narrower scope and conflict-by-conflict logging from scratchpad.

## Important Changes or Additions to Public APIs/Interfaces/Types
1. No intentional public API/interface/type changes in this pass.
2. This pass is branch topology unification + conflict-safe preservation of already-shipped behavior.
3. Any accidental API drift detected during conflict resolution is treated as a blocker and must be corrected before completion.

## Test Cases and Scenarios
1. `gt move` completes with ORPC root reparented to `codex/coordination-wk-interactive-v1-cutover-purge`.
2. Conflict resolution in `apps/web/test/coordination.visual.test.ts` preserves both ORPC RPC mocking and interactive canvas tests.
3. `bun.lock` ends in regenerated, deterministic state after `bun install`.
4. `bun run typecheck` passes.
5. `bun run test` passes.
6. Final graph has one continuous stack and zero `needs restack` in the active chain.

## Assumptions and Defaults
1. Target branch for “top of remaining coordination-canvas stack” is `codex/coordination-wk-interactive-v1-cutover-purge`.
2. Work happens in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`.
3. Graphite remains the required workflow; no ad-hoc manual rebase outside Graphite commands.
4. Known high-probability conflicts are limited to `apps/web/test/coordination.visual.test.ts` and `bun.lock`.
5. Lockfile is treated as generated output and normalized once after stack movement.
