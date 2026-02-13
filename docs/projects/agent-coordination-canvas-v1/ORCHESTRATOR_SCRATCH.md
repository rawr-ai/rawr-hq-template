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
- [x] Runtime hardening branch complete with tests.
- [x] Design architecture import branch complete with tests.
- [x] Bridge branch complete with tests.
- [ ] Shadow route visual gate added and passing.
- [ ] Full cutover and legacy purge complete.
- [ ] Final `typecheck` + targeted test suite green.

## Execution Log
- 2026-02-12T23:20:00Z: Runtime hardening implemented on `codex/coordination-design-data-v1-runtime`.
  - Added shared HTTP envelope types and helpers in `packages/coordination/src/http.ts` and exported via package entrypoints.
  - Standardized server responses in `apps/server/src/coordination.ts` to structured failures (`code/message/retriable/details`) while preserving all route paths.
  - Updated CLI coordination client/commands to consume envelope responses with typed success payloads and structured failures.
  - Added runtime envelope assertions in `apps/server/test/rawr.test.ts` and `packages/coordination/test/coordination.test.ts`.
  - Verification run:
    - `bun run --cwd packages/coordination typecheck`
    - `bun run --cwd apps/server typecheck`
    - `bun run --cwd apps/cli typecheck`
    - `bun test apps/server/test/rawr.test.ts --test-name-pattern coordination`
    - `bun test packages/coordination/test/coordination.test.ts packages/coordination-inngest/test/inngest-adapter.test.ts`
- 2026-02-12T23:50:00Z: Design architecture import implemented on `codex/coordination-design-data-v1-design`.
  - Pulled live Magic Patterns source map from MCP URL `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`.
  - Mirrored design component structure into `apps/web/src/ui/coordination/components/{CoordinationPage,canvas,status,shell}`.
  - Added coordination-local type and style modules:
    - `apps/web/src/ui/coordination/types/workflow.ts`
    - `apps/web/src/ui/coordination/styles/index.css`
  - Routed existing page entrypoint to new architecture via `apps/web/src/ui/pages/CoordinationPage.tsx`.
  - Preserved WorkflowKit provider/editor canvas behavior and keyboard palette behavior inside design-mirrored composition.
  - Verification run:
    - `bun run --cwd apps/web typecheck`
    - `bun run --cwd apps/web test`
- 2026-02-13T00:00:00Z: Bridge layer implemented on `codex/coordination-design-data-v1-bridge`.
  - Added typed data adapters:
    - `apps/web/src/ui/coordination/adapters/api-client.ts`
    - `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
  - Added real runtime hooks:
    - `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
    - `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
    - `apps/web/src/ui/coordination/hooks/useTheme.ts`
  - Refactored `apps/web/src/ui/coordination/components/CoordinationPage.tsx` to consume hooks/adapters instead of inline mocked fetch/state logic.
  - Polling now uses bounded backoff+jitter with token-based stale-update guards and terminal-state stop behavior.
  - Verification run:
    - `bun run --cwd apps/web typecheck`
    - `bun run --cwd apps/web test`
