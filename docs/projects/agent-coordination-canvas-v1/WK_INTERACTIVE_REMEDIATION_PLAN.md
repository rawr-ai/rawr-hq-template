# WorkflowKit Interactive Canvas Remediation Plan

Status: Implementation-ready
Date: 2026-02-13
Owner: Orchestrator

## Goal
Deliver an interactive coordination builder by making WorkflowKit editor the visible canvas surface, while preserving 1:1 MCP design parity for shell/layout/styles and keeping existing runtime contracts.

## First Action (Doc-First Rule)
1. Keep this plan, findings, and orchestrator scratch up to date before code edits.

## Branch Stack (proposed)
1. `codex/coordination-wk-interactive-v1-docs`
2. `codex/coordination-wk-interactive-v1-editor-surface`
3. `codex/coordination-wk-interactive-v1-design-parity`
4. `codex/coordination-wk-interactive-v1-behavior-gates`
5. `codex/coordination-wk-interactive-v1-cutover-purge`

If we stay on current stack, mirror these phases as sequential commits with same boundaries.

## Phase 1: Editor Surface Migration
Primary objective: remove static live renderer and show interactive WorkflowKit surface.

Files:
- `apps/web/src/ui/coordination/components/CoordinationPage.tsx`
- `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
- `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx`
- `apps/web/src/ui/coordination/components/canvas/FlowEdges.tsx`
- `apps/web/src/ui/coordination/components/canvas/FlowNode.tsx`

Changes:
1. Render `Provider` + `Editor` as visible primary canvas inside workspace.
2. Remove hidden editor mounting (`hiddenEngine`) path.
3. Remove static node/edge renderer from live route.
4. Keep toolbar + side panel composition unchanged structurally.

Acceptance:
- Canvas is draggable/interactive.
- Node interactions happen on live editor surface.

## Phase 2: 1:1 Design Parity Over Interactive Surface
Primary objective: preserve MCP shell/panel/toolbar visual parity while editor is interactive.

Files:
- `apps/web/src/ui/coordination/components/**/*`
- `apps/web/src/ui/coordination/styles/index.css`
- `apps/web/tailwind.config.cjs`

Changes:
1. Keep MCP composition boundaries for header/workspace/side panel/status panel.
2. Introduce scoped WorkflowKit skin classes/tokens under coordination container.
3. Align spacing, typography, iconography, borders, and glass treatments to MCP tokens.
4. Keep host shell cohesion (`/coordination` remains in shared AppShell).

Acceptance:
- Visual parity with MCP composition is maintained.
- No secondary/duplicated canvas abstraction remains.

## Phase 3: Wiring and Behavior Integrity
Primary objective: ensure runtime behavior remains correct after editor surface swap.

Files:
- `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
- `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
- `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
- `apps/web/src/ui/coordination/components/canvas/WorkflowToolbar.tsx`

Changes:
1. Preserve save-before-run invariant.
2. Preserve strict structured error surfacing for run/save/validate actions.
3. Preserve polling cancellation/backoff safety.
4. Keep monitor/trace links runtime-derived.

Acceptance:
- `Run` on dirty workflow still saves first.
- Error/live status surfaces remain correct.

## Phase 4: Interaction + Visual + A11y Gates
Primary objective: lock interactive behavior and parity with tests.

Files:
- `apps/web/test/coordination.visual.test.ts`
- Add interaction-focused tests (new file if needed)

Required tests:
1. Canvas pan/drag interactions function.
2. Add-node interaction path works (or is intentionally disabled with explicit UX copy and test).
3. Save-before-run flow still enforced.
4. Visual snapshots for desktop/mobile remain within threshold for key states.
5. A11y checks for focus, labels, live regions, reduced motion.

## Phase 5: Cutover and Purge
Primary objective: zero legacy static canvas artifacts.

Changes:
1. Remove live references to static graph renderer components.
2. Delete obsolete static renderer files if no longer used.
3. Update docs to reference interactive WorkflowKit surface only.
4. Enforce grep gate for removed symbols/paths.

## Risks and Mitigations
1. Styling drift from WorkflowKit internals.
- Mitigation: scope CSS overrides to coordination container and pin parity snapshots.
2. Runtime regression after editor swap.
- Mitigation: keep adapters/hooks unchanged first, migrate rendering only, then harden tests.
3. Interaction mismatch vs design static mock.
- Mitigation: treat MCP as visual/composition source; WorkflowKit as functional source.

## Completion Gates
1. `bun run --cwd apps/web typecheck` passes.
2. `bun run --cwd apps/web test` passes.
3. `bun run --cwd apps/web test:visual` passes.
4. Coordination package tests pass.
5. No static canvas live-path references remain.
