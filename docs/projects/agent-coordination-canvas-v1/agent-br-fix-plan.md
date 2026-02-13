# Agent BR Fix Plan (Bridge Behavior)

## Mission
Harden design-to-runtime seam contracts without compromising design composition boundaries.

## Skills
- `elysia`
- `inngest`
- `ui-design`
- `vercel-react-best-practices`

## Scope
- `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
- `apps/web/src/ui/coordination/types/workflow.ts`
- `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
- `apps/web/src/ui/coordination/components/status/RunStatusPanel.tsx`

## Planned Work
1. Normalize workflow model mapping contract.
2. Bind component states to real hook/adapters only.
3. Ensure run/validation/timeline surfaces match runtime semantics.
