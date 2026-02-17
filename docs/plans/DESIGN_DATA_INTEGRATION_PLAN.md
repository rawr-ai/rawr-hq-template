# Agent Coordination Canvas: 1:1 Design + Runtime Integration Stack

Status: In Progress  
Owner: Orchestrator (Codex)  
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`  
Branch (current): `codex/coordination-design-data-v1-docs`

## Summary
Integrate the Magic Patterns design source 1:1 into the coordination canvas while preserving real WorkflowKit/Inngest behavior and hardening runtime contracts.  
Execution uses a Graphite stack on `main`, orchestrated by one lead agent plus 3 focused sub-agents (`data flow`, `design 1:1`, `bridge`).  
Rollout is `shadow -> gated parity -> full cutover`, then remove legacy code/paths/docs/tests tied to the old UI.

## Locked Decisions
1. Canvas engine: keep WorkflowKit, adapt it to the design architecture and visual system.
2. Rollout: shadow route first, then full cutover with zero legacy left behind.
3. Runtime depth: full hardening in this stack.

## Phase 0: Preflight and Branch/Worktree Choreography
1. Coordination stack preflight:
```bash
gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 sync --no-restack
gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 restack --upstack
gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 submit --stack --ai
```
2. If that worktree path is unavailable, verify that the stack is already merged and continue from `main`.
3. New implementation worktree and stack root:
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
gt sync --no-restack
gt checkout main
git pull --ff-only
git worktree add /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1 -b codex/coordination-design-data-v1-docs
```
4. Stack branches in order:
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1
gt create -am "feat(coordination): add typed runtime API hardening" codex/coordination-design-data-v1-runtime
gt create -am "feat(coordination): import 1:1 design component architecture" codex/coordination-design-data-v1-design
gt create -am "feat(coordination): bridge design hooks to real runtime data" codex/coordination-design-data-v1-bridge
gt create -am "feat(coordination): cut over route and remove legacy surfaces" codex/coordination-design-data-v1-cutover
```

## Phase 1: Scratchpad and Orchestration Protocol
1. Orchestrator docs:
- `docs/projects/agent-coordination-canvas-v1/DESIGN_DATA_INTEGRATION_PLAN.md`
- `docs/projects/agent-coordination-canvas-v1/ORCHESTRATOR_SCRATCH.md`
2. Per-axis scratchpads:
- `docs/projects/agent-coordination-canvas-v1/agent-df-dataflow-scratch.md`
- `docs/projects/agent-coordination-canvas-v1/agent-d1-design-scratch.md`
- `docs/projects/agent-coordination-canvas-v1/agent-br-bridge-scratch.md`
3. Agent assignment:
- DF: runtime/server/contracts; skills `elysia`, `inngest`.
- D1: design parity/component architecture; skills `ui-design`, `vercel-react-best-practices`, `web-design-guidelines`.
- BR: seam bindings/hooks/adapters; skills `elysia`, `inngest`, `ui-design`, `vercel-react-best-practices`.
4. Coordination cadence:
- DF + D1 in parallel.
- BR after DF + D1 outputs are integrated.
- Orchestrator resolves conflicts and records timestamped decisions.

## Phase 2: Runtime Hardening (`...-runtime`)
1. Add shared API response/error contracts:
- New: `packages/coordination/src/http.ts`
- Export via `packages/coordination/src/index.ts` and `packages/coordination/src/node.ts`
2. Standardize coordination server responses:
- File: `apps/server/src/coordination.ts`
- Success: `ok: true` typed payloads.
- Error: `ok: false`, `error: { code, message, retriable, details? }`.
3. Keep existing endpoint paths unchanged:
- `/rawr/coordination/workflows`
- `/rawr/coordination/workflows/:id`
- `/rawr/coordination/workflows/:id/validate`
- `/rawr/coordination/workflows/:id/run`
- `/rawr/coordination/runs/:runId`
- `/rawr/coordination/runs/:runId/timeline`
4. Update CLI parsing for error envelopes:
- `apps/cli/src/lib/coordination-api.ts`
- `apps/cli/src/commands/workflow/coord/create.ts`
- `apps/cli/src/commands/workflow/coord/validate.ts`
- `apps/cli/src/commands/workflow/coord/run.ts`
- `apps/cli/src/commands/workflow/coord/status.ts`
- `apps/cli/src/commands/workflow/coord/trace.ts`

## Phase 3: 1:1 Design Architecture Import (`...-design`)
1. Mirror design structure in web app:
- `apps/web/src/ui/coordination/components/CoordinationPage.tsx`
- `apps/web/src/ui/coordination/components/canvas/*`
- `apps/web/src/ui/coordination/components/status/*`
- `apps/web/src/ui/coordination/components/shell/*`
- `apps/web/src/ui/coordination/types/workflow.ts`
- `apps/web/src/ui/coordination/styles/index.css`
2. Keep shell behavior intact:
- `apps/web/src/ui/layout/AppShell.tsx`
- `apps/web/src/ui/layout/SidebarNav.tsx`
3. Preserve design naming/composition boundaries.

## Phase 4: Bridge Layer (`...-bridge`)
1. Implement hook seam (no mocked state):
- `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
- `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
- `apps/web/src/ui/coordination/hooks/useTheme.ts`
2. Implement adapters:
- `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
- `apps/web/src/ui/coordination/adapters/api-client.ts`
3. WorkflowKit integration rules:
- Design component tree remains intact.
- Canvas uses real WorkflowKit provider/editor.
- Use shared conversions from `packages/coordination-inngest/src/browser.ts`.
4. Polling hardening:
- Replace fixed-loop polling with bounded backoff/jitter.
- Keep run/timeline fetches parallel.
- Prevent duplicate listeners and stale async commits.

## Phase 5: Shadow Route, Parity Gates, Cutover, Legacy Purge (`...-cutover`)
1. Add temporary shadow route:
- `/coordination-shadow` in `apps/web/src/ui/App.tsx`
2. Add Chromium screenshot gate:
- `apps/web/test/coordination.visual.test.ts`
- Deterministic mocked API response fixtures.
- Checked-in baselines and strict diff threshold.
3. Run latest web interface guideline audit and fix findings.
4. Full cutover:
- Switch `/coordination` to new integrated page.
- Remove `/coordination-shadow`.
- Delete old monolithic page/styles and transitional wrappers/flags.
5. Legacy purge gate:
- Remove dead files/references/docs/tests.
- Grep-based zero-legacy checks.

## Important Public API / Interface / Type Changes
1. Shared HTTP response/error types in `@rawr/coordination`.
2. Structured coordination error envelope with code/retriable semantics.
3. Endpoint URLs unchanged.
4. Web coordination UI moved from monolith to design-mirrored modules.
5. CLI coordination commands consume structured error/success payloads.

## Test Cases and Scenarios
1. `GET /rawr/coordination/workflows` returns typed success payload after save.
2. Invalid workflow save returns structured validation error.
3. `POST /rawr/coordination/workflows/:id/run` returns queued/running status and trace links.
4. Duplicate `runId` behavior remains idempotent.
5. Timeline endpoint preserves lifecycle event ordering.
6. Command palette keyboard contract works (`Cmd/Ctrl+K`, arrows, Enter, Escape).
7. Run button state transitions are correct (`busy/polling/validation`).
8. Validation panel reflects backend-compatible checks.
9. Visual regression test passes in Chromium (desktop/mobile).
10. Accessibility checks pass (focus, labels, live region, reduced motion).
11. CLI `workflow coord create/validate/run/status/trace` passes with new envelopes.
12. Legacy purge check reports zero old route/file/reference leftovers.

## Completion Gates
1. `bun run typecheck` passes.
2. Targeted tests pass:
- `apps/server/test/rawr.test.ts`
- `packages/coordination/test/coordination.test.ts`
- `packages/coordination-inngest/test/inngest-adapter.test.ts`
- `apps/web/test/*`
3. Visual gate passes.
4. Docs/runbooks reflect only new architecture.
5. `gt log` clean and stack submit via `gt submit --stack --ai`.

## Assumptions and Defaults
1. Planning was non-mutating; this file is execution policy.
2. Coordination stack is merged to `main` before this stack ships.
3. WorkflowKit remains engine under design architecture.
4. Design source URL is pinned to `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`.
5. Shadow route is temporary and removed before merge.
