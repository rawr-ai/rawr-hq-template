# Orchestrator Scratch - Coordination Design/Data Integration

## Session Setup
- Date: 2026-02-12
- Repo: RAWR HQ-Template
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
- Branch: `codex/coordination-design-data-v1-docs`
- Graphite trunk: `main`

## Operating Rule
- Keep this file as the timestamped decision log, integration notes, and conflict-resolution ledger.
- No implementation edits occur before plan and scratchpads are created.

## Baseline Checks
- [x] Worktree exists and points to `main`.
- [x] Branch created with `codex/` prefix.
- [x] Plan doc created before implementation edits.
- [x] Orchestrator scratchpad created.
- [x] Agent scratchpads created.

## Locked User Constraints
1. 1:1 design integration with no UI shortcuts.
2. WorkflowKit remains the engine.
3. Shadow route allowed only for gated verification, then full cutover.
4. Zero legacy leftovers after cutover.
5. Full runtime hardening in same stack.

## Agent Coordination Plan
- Agent DF (data flow): runtime/API contracts and Inngest/Elysia fidelity.
- Agent D1 (design 1:1): component architecture parity with design source.
- Agent BR (bridge): hook and adapter seam binding design to runtime.

## Integration Cadence
1. Start DF + D1 in parallel.
2. Integrate findings into this scratchpad.
3. Start BR with integrated context and deltas.
4. Resolve conflicts and lock branch-by-branch implementation tasks.

## Decisions
- 2026-02-12T22:00:00Z: If prior coordination worktree path is missing, treat stack as merged if `gt log` only shows `main`.
- 2026-02-12T22:00:00Z: Proceed with new stack rooted from `main`.
- 2026-02-12T22:16:00Z: DF + D1 findings integrated before BR kickoff.
  - Runtime shape is already strong but needs standardized typed HTTP envelopes and CLI parsing alignment.
  - UI structure already contains all design regions; work is architectural decomposition into design-mirrored modules with no behavior loss.
  - Visual gate must include Chromium screenshot checks for key states.

## Open Risks
1. Missing browser screenshot tooling in repo may require Playwright bootstrap.
2. Design source contains placeholder hooks/types that must be bound without behavior drift.
3. Runtime error envelope changes will require CLI updates in lockstep.

## Integrated Context Packet for BR
1. Runtime invariants to preserve:
  - endpoint paths unchanged
  - run lifecycle semantics unchanged
  - WorkflowKit editor integration unchanged
2. Design invariants to preserve:
  - modular component architecture matching design source naming
  - keyboard and accessibility semantics preserved
  - tokenized visual system and canvas-first composition retained
3. BR must output:
  - design hook/state -> runtime endpoint/type binding table
  - adapter signatures and migration-safe seam plan
  - polling hardening details with listener hygiene

## BR Integration Outcome
- 2026-02-12T22:22:00Z: BR findings integrated.
  - Confirmed stable seam contracts between design hooks and runtime endpoints.
  - Confirmed migration-safe adapter split:
    1) `api-client.ts` for typed endpoint calls
    2) `workflow-mappers.ts` for canvas model conversions
    3) `useWorkflow` and `useRunStatus` as the behavior boundary
  - Confirmed rollout order remains safe:
    1) runtime envelopes
    2) design module import
    3) hook/adapter bridge
    4) shadow route gate
    5) full cutover + purge

## Verification Checklist (to update during execution)
- [ ] Runtime hardening branch complete with tests.
- [ ] Design architecture import branch complete with tests.
- [ ] Bridge branch complete with tests.
- [ ] Shadow route visual gate added and passing.
- [ ] Full cutover and legacy purge complete.
- [ ] Final `typecheck` + targeted test suite green.
