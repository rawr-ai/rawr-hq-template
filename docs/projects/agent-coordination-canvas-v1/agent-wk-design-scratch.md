# Agent WK Design Scratch

Date: 2026-02-13
Agent: WK-Design (`019c549b-e1b4-7f53-9841-109ddb66c3c0`)

## Findings
- Parity analysis confirms we currently mirrored MCP static composition, but that composition itself is non-interactive.
- Core parity gap for product requirement: design parity currently achieved via static graph renderers, not via interactive editor surface.

## MCP Source Validation (Orchestrator-confirmed)
- Direct MCP design files retrieved from:
  - `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`
- File evidence shows static mock architecture in source design package:
  - `components/canvas/FlowCanvas.tsx` uses fixed layout math + static node/edge rendering.
  - `hooks/useWorkflow.ts` and `hooks/useRunStatus.ts` are mock/demo hooks.

## Design Implication
- We must preserve 1:1 visual language (tokens, spacing, composition, toolbar/panel structure),
  but replace static canvas internals with WorkflowKit interactive surface as the functional layer.

## Recommended Direction
- Keep shell, header, toolbar, side panel, status panel composition aligned with MCP.
- Skin WorkflowKit editor to MCP visual system with scoped tokens/classes.
- Remove duplicate custom graph renderers from live route to avoid drift.
