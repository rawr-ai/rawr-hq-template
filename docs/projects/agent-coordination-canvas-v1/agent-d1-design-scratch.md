# Agent D1 Scratch - 1:1 Design Architecture Integration

## Ownership
- Axis: 1:1 design component architecture import and visual parity.
- Priority: Preserve design source organization while keeping host shell behavior and accessibility quality.

## Required Context
1. Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
2. Design source URL:
- `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`
3. Target files:
- `apps/web/src/ui/App.tsx`
- `apps/web/src/ui/layout/AppShell.tsx`
- `apps/web/src/ui/layout/SidebarNav.tsx`
- `apps/web/src/ui/pages/CoordinationPage.tsx`
- `apps/web/src/ui/styles/globals.css`
- `apps/web/src/ui/styles/coordination-page.css`

## Required Skills
- `ui-design`: `/Users/mateicanavra/.codex-rawr/skills/ui-design/SKILL.md`
- `vercel-react-best-practices`: `/Users/mateicanavra/.codex-rawr/skills/vercel-react-best-practices/SKILL.md`
- `web-design-guidelines`: `/Users/mateicanavra/.codex-rawr/skills/web-design-guidelines/SKILL.md`

## Introspection Tasks
1. Introspect design source file structure and component boundaries.
2. Introspect current web coordination monolith and split candidates.
3. Introspect required visual/accessibility parity requirements.
4. Introspect route and shell invariants that must remain intact.
5. Introspect visual test tooling gaps for Chromium screenshot gate.

## Deliverables Back to Orchestrator
1. Component mapping matrix from design source to repo paths.
2. Strict parity checklist for UI behavior and accessibility.
3. Ordered refactor slices for design architecture import.
4. Visual regression gate plan and implementation details.

## Notes Log
- 2026-02-12T22:00:00Z: Scratchpad created before web architecture edits.
- 2026-02-12T22:16:00Z: Introspection complete.
  - Current `apps/web/src/ui/pages/CoordinationPage.tsx` is a monolith that already contains design regions needed for modularization:
    1) header
    2) controls
    3) canvas stage
    4) status/timeline panels
    5) command palette
  - Current CSS token system in `apps/web/src/ui/styles/globals.css` + `coordination-page.css` is suitable for migration into a design-mirrored module tree.
  - Required design branch outputs:
    1) split into `apps/web/src/ui/coordination/components/{CoordinationPage,canvas,status,shell}`
    2) add local `types/workflow.ts`
    3) move styles into `apps/web/src/ui/coordination/styles/index.css` and component styles
  - Accessibility and parity constraints to preserve:
    1) keyboard palette controls (`Cmd/Ctrl+K`, arrows, Enter, Escape)
    2) `aria-live` status messaging
    3) visible focus states and reduced-motion behavior
  - Visual gate requirement:
    1) add Chromium screenshot tests for default canvas, palette-open, validation-error, and run-timeline states.
