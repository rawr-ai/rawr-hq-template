# WorkflowKit Interactive Canvas Findings

Status: Finalized (investigation complete)
Date: 2026-02-13
Owner: Orchestrator

## Scope
Determine why coordination canvas is non-interactive and define the path to an interactive WorkflowKit surface with 1:1 design parity.

## Canonical Findings
1. Visible canvas is static render, not interactive editor.
- Evidence:
  - `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx:21-37` computes fixed node positions.
  - `apps/web/src/ui/coordination/components/canvas/FlowEdges.tsx:17-33` draws static SVG edges.
  - `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx:75` mounts WorkflowKit editor subtree as hidden `pointer-events-none` layer.
2. WorkflowKit is still wired under the hood.
- Evidence:
  - `apps/web/src/ui/coordination/components/CoordinationPage.tsx:2` imports `Editor`, `Provider`, `Sidebar` from `@inngest/workflow-kit/ui`.
  - `apps/web/src/ui/coordination/components/CoordinationPage.tsx:162-171` mounts Provider/Editor.
  - `apps/web/src/ui/coordination/hooks/useWorkflow.ts:190-205` roundtrips editor changes via mapper adapters.
  - `packages/coordination-inngest/src/adapter.ts:392-460` uses WorkflowKit `Engine` for runtime execution.
3. MCP design source itself is static/mock by default.
- Evidence from MCP files (`mcp__design__get_design` + `mcp__design__read_files`):
  - `components/canvas/FlowCanvas.tsx` contains static layout math.
  - `hooks/useWorkflow.ts` and `hooks/useRunStatus.ts` are mock hooks.
4. Missing drag/add-node behavior is expected in current implementation.
- There is no interactive graph surface receiving pointer events.
- There is no add-node control wired to editor actions in the live UI.

## Root Cause
We preserved static design internals from MCP composition instead of replacing only the canvas internals with an interactive WorkflowKit surface.

## Required Correction
- Keep design shell/composition parity.
- Replace static `FlowCanvas` live usage with visible WorkflowKit editor surface.
- Keep runtime/data contracts unchanged.

## Non-Negotiable Invariants
1. WorkflowKit remains the live interactive canvas and execution model.
2. Save-before-run behavior remains enforced.
3. Endpoint paths remain unchanged.
4. No duplicate static canvas renderer in final live route.

## Implementation Guardrails (Locked)
1. WorkflowKit editor must be visible and primary in live route.
2. No hidden engine overlay patterns remain.
3. No static graph renderer remains in active composition.
4. Save-before-run and structured error behavior are regression-sensitive and must be preserved.
5. Add-node behavior must be validated via WorkflowKit add handles.
