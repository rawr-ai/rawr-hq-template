# Agent BR Scratch - Design to Runtime Bridge

## Ownership
- Axis: Binding design hooks/components to real runtime data and contracts.
- Priority: Zero mocked seams, no schema drift, no behavioral regressions.

## Required Context
1. Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
2. Design source files:
- `App.tsx`
- `components/CoordinationPage.tsx`
- `components/canvas/*`
- `components/status/*`
- `hooks/useWorkflow.ts`
- `hooks/useRunStatus.ts`
- `types/workflow.ts`
3. Runtime source files:
- `apps/web/src/ui/pages/CoordinationPage.tsx`
- `apps/server/src/coordination.ts`
- `packages/coordination/src/types.ts`
- `packages/coordination-inngest/src/browser.ts`
- `packages/coordination-inngest/src/adapter.ts`

## Required Skills
- `elysia`: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- `inngest`: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `ui-design`: `/Users/mateicanavra/.codex-rawr/skills/ui-design/SKILL.md`
- `vercel-react-best-practices`: `/Users/mateicanavra/.codex-rawr/skills/vercel-react-best-practices/SKILL.md`

## Introspection Tasks
1. Introspect each design hook and map to runtime source of truth.
2. Introspect adapter boundaries and conversion points.
3. Introspect failure/loading/polling states and required guarantees.
4. Introspect migration ordering with minimum regressions.

## Deliverables Back to Orchestrator
1. Binding contract table (design state -> endpoint/type).
2. Hook and adapter API signatures.
3. Polling hardening strategy and listener hygiene checks.
4. Joint visual + data verification checklist.

## Notes Log
- 2026-02-12T22:00:00Z: Scratchpad created before bridge implementation.
- 2026-02-12T22:22:00Z: Introspection complete with integrated DF + D1 context.
  - Confirmed seam bindings:
    1) workflow state -> `/rawr/coordination/workflows`
    2) run trigger -> `/rawr/coordination/workflows/:id/run`
    3) run/timeline status -> `/rawr/coordination/runs/:runId` and `/timeline`
    4) canvas model conversion -> `toWorkflowKitWorkflow` and `fromWorkflowKitWorkflow`
  - Bridge implementation priorities:
    1) extract typed API client adapter used by hooks and components
    2) centralize workflow/run state into `useWorkflow` and `useRunStatus`
    3) preserve existing keyboard, live-region, and polling semantics while modularizing
  - Bridge risk controls:
    1) keep endpoint paths and payload semantics unchanged
    2) keep WorkflowKit provider/editor under design shell
    3) verify CLI and UI consume aligned `ok` envelopes
- 2026-02-13T00:00:00Z: Bridge implementation complete.
  - Implemented typed API seam in `adapters/api-client.ts` for workflows/run/timeline endpoints with structured envelope parsing.
  - Implemented mapper seam in `adapters/workflow-mappers.ts` for WorkflowKit conversions and status tone/polling utilities.
  - Moved UI behavior into runtime-backed hooks:
    1) `useWorkflow` for workflow CRUD/validation/run queue
    2) `useRunStatus` for run polling/timeline lifecycle
    3) `useTheme` wrapper over host theme provider
  - Updated design `CoordinationPage` to consume hook+adapter seam with no mocked state path.
- 2026-02-13T00:10:00Z: Cutover consumed bridge outputs.
  - `/coordination` now runs entirely through bridge seam (`hooks/*` + `adapters/*`), with legacy page path removed.
