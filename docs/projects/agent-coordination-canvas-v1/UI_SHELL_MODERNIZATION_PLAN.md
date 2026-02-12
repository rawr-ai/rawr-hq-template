# UI Shell Modernization Plan

Owner: UI shell modernization implementation agent
Date: 2026-02-12
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-shell-modernization`
Branch: `codex/coordination-canvas-v1-ui-shell-modernization`

## Mission
Modernize the full web shell and UI surfaces into one cohesive design system with reliable light/dark theming while keeping the coordination canvas as the primary product surface.

## Constraints And Invariants
- Scope-limited to:
  - `apps/web/**`
  - `plugins/web/mfe-demo/**` (only for host-theme coupling)
  - `packages/ui-sdk/**` (only if theme-contract hook is required)
  - `docs/projects/agent-coordination-canvas-v1/**`
- Do not change server APIs, CLI behavior, coordination engine contracts, or workflow semantics.
- Graphite/worktree-safe execution only.
- Preserve or improve keyboard/focus-visible accessibility.
- Prevent behavioral regressions in save/validate/run coordination flows.

## Required Guidance Inputs (Used + Cited)
- Local skills:
  - `/Users/mateicanavra/.codex-rawr/skills/vercel-react-best-practices/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/web-design-guidelines/SKILL.md`
- External interface-design canon:
  - [interface-design SKILL.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/SKILL.md)
  - [principles.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/references/principles.md)
  - [validation.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/references/validation.md)
- React Flow docs:
  - [Learn](https://reactflow.dev/learn)
  - [API Reference](https://reactflow.dev/api-reference)
  - [Theming](https://reactflow.dev/learn/customization/theming)
- Final audit requirement (to fetch fresh right before final audit):
  - [Web Interface Guidelines command.md](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

## Current Baseline Snapshot
- Existing shell is custom CSS token-driven dark-only setup (`apps/web/src/ui/styles/tokens.css`).
- Multiple pages rely on inline styles (`HomePage`, `MountsPage`, `NotFoundPage`), preventing system-level consistency.
- Coordination page already has rich structure and keyboard controls; modernization must preserve logic and interaction behavior.
- MFE demo plugin uses hardcoded inline styles that are not theme-aware.

## Implementation Strategy
1. **Foundation: Tailwind + shadcn-compatible primitives**
- Add Tailwind configuration for `apps/web`.
- Introduce shared theme CSS variables for light/dark semantic tokens.
- Add utility helpers (`cn`) and a minimal reusable component layer (button/card/badge/select/surface) aligned to shadcn patterns.

2. **Theme System + Reliable Switching**
- Implement a theme controller (`light` | `dark` | `system`) with local persistence and system fallback.
- Apply root class/data-attribute switching in a single source of truth.
- Ensure focus-visible tokens and semantic states (success/warn/error/info) are contrast-safe in both themes.

3. **Host Shell Modernization (`apps/web` shell/layout/nav)**
- Refactor `AppShell` and `SidebarNav` to cohesive componentized styling.
- Add shell-level header actions (theme toggle + app identity) while preserving mobile nav behavior and skip-link accessibility.
- Replace legacy ad-hoc CSS with token-driven utilities and minimal scoped CSS where required.

4. **Canvas-First Coordination Surface**
- Keep canvas area visually dominant and maintain command palette/run/save/validate behavior untouched.
- Modernize surrounding panels/controls into unified components.
- Integrate React Flow-compatible theme variables/class hooks so embedded graph/editor surfaces respect app theme hierarchy.

5. **Mounts + Host MFE Surface Cohesion**
- Restyle `MountsPage` with the shared component system.
- Update `plugins/web/mfe-demo/src/web.ts` to consume host CSS variables for text/surface/border/accent so plugin UI remains coherent in both themes.

6. **Accessibility + UX Hardening**
- Verify keyboard navigation order, focus visibility, and semantic messaging (`aria-live`, dialogs, form labels).
- Ensure color contrast and state differentiation are clear in both light/dark.

7. **Validation, Final Audit, And Cleanup**
- Run required commands:
  - `bun install` (if deps changed)
  - `bun run --cwd apps/web test`
  - `bun run --cwd apps/web build`
  - startup smoke: `bun run --cwd apps/web dev` (prove launch)
- Fetch fresh guidelines from `command.md` before final UI audit and apply findings.
- Update scratchpad with decisions/deviations and test evidence.
- Commit with conventional commit message + informative body.

## Risk Controls
- Keep business logic methods untouched in coordination workflows (`saveWorkflow`, `runWorkflow`, validation polling).
- Make UI changes around structure/presentation; avoid API contract changes.
- Validate after each major stage to catch regressions early.

## Done Criteria
- Cohesive shell and page styling across `/`, `/coordination`, `/mounts`, and MFE host surfaces.
- Reliable light/dark toggle with persisted preference and system support.
- Canvas remains the primary visual/interaction surface.
- Required tests/build/dev smoke pass.
- Scratchpad contains timestamped decisions, tradeoffs, deviations, and external refs.
