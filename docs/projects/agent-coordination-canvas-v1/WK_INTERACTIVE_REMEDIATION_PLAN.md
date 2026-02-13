# WorkflowKit Interactive Canvas Remediation Stack (Decision-Complete)

## Summary
Replace the current static coordination canvas renderer with the real interactive WorkflowKit editor surface, while keeping the MCP design composition/styling 1:1 and preserving all runtime/data contracts (save-before-run, structured errors, polling safety, trace links).  
This is an implementation-ready Graphite stack plan with two-agent orchestration (max 2), no legacy/shims left behind.

## Implementation Workflow (2 Agents Max)
1. Orchestrator (this session) owns branch choreography, integration, and final gate decisions.
2. Agent A (`WK-Runtime`) owns interactive WorkflowKit surface migration and runtime behavior invariants.
3. Agent B (`WK-Design`) owns MCP parity pass over the interactive WorkflowKit surface.
4. Agents run in parallel for investigation deltas, then sequentially for implementation handoff.
5. Canonical docs stay current throughout:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/WK_INTERACTIVE_REMEDIATION_PLAN.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/WK_INTERACTIVE_REMEDIATION_FINDINGS.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/WK_INTERACTIVE_ORCHESTRATOR_SCRATCH.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/agent-wk-runtime-plan.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/agent-wk-runtime-scratch.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/agent-wk-design-plan.md`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/agent-wk-design-scratch.md`

## Graphite Stack
1. `codex/coordination-wk-interactive-v1-docs`
2. `codex/coordination-wk-interactive-v1-editor-surface`
3. `codex/coordination-wk-interactive-v1-design-parity`
4. `codex/coordination-wk-interactive-v1-behavior-gates`
5. `codex/coordination-wk-interactive-v1-cutover-purge`

Default base:
1. If current remediation stack is still active, branch from `codex/coordination-fixpass-v1-cutover-purge`.
2. If merged before implementation starts, recreate the same branch names from `main`.

## Phase 0 (First Action): Doc-First Commit
1. Refresh the seven WK interactive docs listed above before any code edits.
2. Record MCP source pin in plan/findings:
[https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview](https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview)
3. Record root-cause evidence explicitly:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx` static layout + hidden editor layer.
4. Commit docs-only branch first.

## Phase 1: Interactive Editor Surface (No Static Proxy)
Branch: `codex/coordination-wk-interactive-v1-editor-surface`

Primary files:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/CoordinationPage.tsx`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/FlowEdges.tsx`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/FlowNode.tsx`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/index.ts`

Required implementation decisions:
1. `FlowCanvas` becomes the visible WorkflowKit surface (not static nodes/edges).
2. Remove `hiddenEngine` architecture entirely.
3. Render `Provider` + `Editor` directly inside visible canvas container.
4. Do not render WorkflowKit `Sidebar` by default to avoid dual-right-panel UI and preserve design composition.
5. Rely on WorkflowKit add handles (`wf-add-handle` menu) for add-node interaction.
6. Delete `FlowEdges.tsx` and `FlowNode.tsx` if no longer referenced in live route.
7. Keep current toolbar and design side panel composition intact around the interactive editor.
8. Keep `/coordination` under shared host shell (no separate app shell route).

Acceptance criteria:
1. Canvas is pointer-interactive.
2. Nodes can be selected and moved.
3. New nodes can be added from WorkflowKit add handles.
4. No static node/edge renderer remains in active route path.

## Phase 2: 1:1 Design Parity on Interactive WorkflowKit
Branch: `codex/coordination-wk-interactive-v1-design-parity`

Primary files:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/styles/index.css`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/tailwind.config.cjs`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/CoordinationPage.tsx`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/WorkflowToolbar.tsx`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/status/RunStatusPanel.tsx`

Required implementation decisions:
1. Keep MCP structure (header, workspace, toolbar, side panel, status panel) 1:1.
2. Skin WorkflowKit classes under coordination scope:
`.wf-editor`, `.wf-editor-parent`, `.wf-node`, `.wf-node-title`, `.wf-node-description`, `.wf-add-handle`, `.wf-add-handle-menu`, `.wf-sidebar` (if ever enabled).
3. Override WorkflowKit CSS variables with coordination token values so WorkflowKit visuals match MCP flow-canvas language.
4. Preserve MCP spacing, typography, iconography, and button treatments while retaining interactivity.
5. Keep app-shell cohesion with existing host layout.

Acceptance criteria:
1. Interactive editor surface visually matches MCP composition/token system.
2. No “two different products” feel between coordination and the rest of app shell.

## Phase 3: Wiring + Behavior Hardening
Branch: `codex/coordination-wk-interactive-v1-behavior-gates`

Primary files:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/hooks/useWorkflow.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/hooks/useRunStatus.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/types/workflow.ts`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/components/canvas/WorkflowToolbar.tsx`

Required implementation decisions:
1. Keep save-before-run invariant exactly as-is.
2. Keep strict structured error envelope display in UI.
3. Keep polling backoff/cancellation/stale-token protections unchanged.
4. Remove now-obsolete static-graph mapping model fields/types from live UI contracts.
5. Keep monitor links runtime-derived only.

Acceptance criteria:
1. `Run` on unsaved/dirty workflows still persists first.
2. No `WORKFLOW_NOT_FOUND` from unsaved run path.
3. Error/live status behavior unchanged from current fixed runtime behavior.

## Phase 4: Cutover + Purge + Gates
Branch: `codex/coordination-wk-interactive-v1-cutover-purge`

Primary files:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/test/coordination.visual.test.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/test/*` (add interaction test file if needed)
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/docs/projects/agent-coordination-canvas-v1/*`

Required implementation decisions:
1. Add interaction tests for draggable and add-node on WorkflowKit surface.
2. Keep and extend save-before-run test.
3. Keep and extend error live-region visual/a11y state snapshots.
4. Remove dead static canvas artifacts and references.
5. Update docs to final architecture only (interactive WorkflowKit canvas).

Legacy purge gate:
1. Zero references to hidden editor injection path.
2. Zero references to static flow node/edge renderer in live route.
3. Zero docs describing static canvas as source of truth.

## Important Public APIs / Interfaces / Types
1. Backend coordination endpoint paths remain unchanged:
`/rawr/coordination/workflows`  
`/rawr/coordination/workflows/:id`  
`/rawr/coordination/workflows/:id/validate`  
`/rawr/coordination/workflows/:id/run`  
`/rawr/coordination/runs/:runId`  
`/rawr/coordination/runs/:runId/timeline`
2. Frontend internal interface updates:
`CanvasWorkspace` no longer accepts static `nodes`/`edges` for primary rendering.
3. `FlowCanvas` contract changes to accept WorkflowKit editor inputs (workflow/trigger/actions/onChange) and render interactive editor directly.
4. Remove static graph-specific UI types if unused after migration (`WorkflowNodeModel`, `WorkflowEdgeModel`, related mapper outputs).
5. No change to `CoordinationWorkflowV1` schema in this pass.

## Test Cases and Scenarios
1. Canvas interactivity:
Drag a node in the visible canvas and verify pointer interactions are active.
2. Add-node behavior:
Use WorkflowKit add handle (`+`) and menu to add an action node; assert node count increases.
3. Save-before-run:
On dirty workflow, `save` happens before `run`.
4. Run error path:
Simulate run failure and assert live error region message and disabled/enabled button states.
5. Polling safety:
Switch runs/workflows and verify stale polling does not overwrite latest state.
6. Visual parity snapshots:
Desktop + mobile states for default, palette open, validation error, run active, run terminal timeline, run error.
7. Accessibility:
Focus visibility/order, labels, live region announcements, reduced-motion behavior.
8. No legacy static renderer:
grep gate confirms no active references to removed static renderer path.

## Completion Gates
1. `git status --short` clean at each branch boundary.
2. `gt log short --stack` coherent and restack-clean.
3. `bun run --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web typecheck` passes.
4. `bun run --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web test` passes.
5. `bun run --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web test:visual` passes.
6. Targeted coordination package tests pass.
7. Docs and scratchpads are updated to final interactive architecture.
8. Stack submission uses `gt submit --stack --ai`.

## Assumptions and Defaults
1. WorkflowKit version remains `@inngest/workflow-kit@0.1.3`.
2. MCP design is the visual/composition source; WorkflowKit is the functional editor source.
3. Built-in WorkflowKit `Sidebar` is not shown by default to preserve MCP side-panel parity and avoid dual panel UI.
4. Add-node interaction uses WorkflowKit add handles and action menu.
5. Node positional persistence beyond current workflow schema is out of scope for this remediation pass.
6. No compatibility shims or static-canvas fallback survives final cutover.
