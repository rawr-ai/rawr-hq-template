# Coordination Canvas UI Slice Pass (Worker-Driven, Graphite/Worktree Safe)

## Brief Summary
Run a focused visual/UX upgrade for the coordination canvas (`/coordination`) without changing workflow semantics, APIs, or Inngest execution behavior.  
This pass is design-system + interaction polish in slices, grounded in:
- `[$vercel-react-best-practices](/Users/mateicanavra/.codex-rawr/skills/vercel-react-best-practices/SKILL.md)`
- `[$web-design-guidelines](/Users/mateicanavra/.codex-rawr/skills/web-design-guidelines/SKILL.md)` (including fresh guideline fetch)
- Design philosophy from [Dammyjay93/interface-design @ 8c407c1](https://github.com/Dammyjay93/interface-design/tree/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude)

## Important Public API / Interface / Type Changes
1. No server/CLI/shared-type contract changes.
2. No changes to route paths or coordination API payloads.
3. UI-only changes in web app presentation, accessibility, and interaction polish.

## Execution Workflow (First Action = Write Plan)
1. Work in template worktree branch top:
- Repo/worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1`
- Stack top/base: `codex/coordination-canvas-v1-web`
2. Create a dedicated worker worktree off stack top:
- Suggested path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass`
- Suggested branch: `codex/coordination-canvas-v1-ui-slice-pass`
3. Graphite-safe rules:
- `gt sync --no-restack` before edits
- Restack only active stack when needed (`gt restack --upstack`)
- No ad-hoc rebases/force rewrites
- No cross-worktree edits

## Required Documentation Bootstrap (Must Happen Before Any Code Edits)
1. Write the agreed plan verbatim to:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/docs/projects/agent-coordination-canvas-v1/UI_SLICE_PASS_PLAN.md`
2. Create worker scratchpad:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/docs/projects/agent-coordination-canvas-v1/agent-ui-worker-scratch.md`
3. Update orchestrator scratch (integration log):
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/ORCHESTRATOR_NOTEBOOK.md`
4. Log every decision/deviation with timestamp.

## Worker Setup Packet (What the Worker Must Read First)
1. Skills:
- `/Users/mateicanavra/.codex-rawr/skills/vercel-react-best-practices/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/web-design-guidelines/SKILL.md`
2. External design canon at pinned commit:
- [interface-design SKILL.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/SKILL.md)
- [principles.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/references/principles.md)
- [validation.md](https://raw.githubusercontent.com/Dammyjay93/interface-design/8c407c1c42890010a9eb403a9f419b1eeadcfdad/.claude/skills/interface-design/references/validation.md)
3. Fresh guideline fetch required before final review:
- [web-interface-guidelines command.md](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

## Slice Implementation Plan (Decision-Complete)

### Slice 1: Design Foundation + Shell Cleanup
Files:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/apps/web/src/ui/layout/AppShell.tsx`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/apps/web/src/ui/layout/SidebarNav.tsx`
- New CSS files under `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/apps/web/src/ui/styles/`
Changes:
1. Replace heavy inline styles with class-based styling + CSS variables.
2. Establish token system (surface, text, border, accent, semantic states, spacing, radius, shadow/elevation).
3. Apply a deliberate non-default typography stack (sans + mono for data).
4. Make shell responsive (sidebar collapse behavior at small widths).
5. Preserve existing routing and nav behavior exactly.

### Slice 2: Coordination Canvas Information Architecture + Controls
Files:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ui-coordination-canvas-slice-pass/apps/web/src/ui/pages/CoordinationPage.tsx`
- CSS module/file for coordination page
Changes:
1. Keep all existing run/save/validate behavior unchanged.
2. Recompose page into clear regions:
- Header/value framing
- Action/control bar
- Canvas workspace panel
- Validation panel
- Run timeline/trace panel
3. Improve control affordance:
- Clear button hierarchy
- Readable select/input treatment
- Distinct success/error/warning badges
4. Command palette polish:
- Better layout, contrast, active-row clarity
- Keyboard focus clarity and empty/error states
5. Accessibility upgrades:
- `aria-live="polite"` for async status/error area
- Visible `:focus-visible` across interactive elements
- Labels/aria for controls where needed
- Ensure semantic button/link usage remains correct

### Slice 3: Motion, Responsiveness, and Guideline Compliance
Files:
- same web UI files + tests as needed
Changes:
1. Add meaningful, minimal transitions (no `transition: all`).
2. Honor `prefers-reduced-motion`.
3. Add content resilience:
- truncation/overflow handling
- `min-w-0` where flex text can break layout
4. Ensure mobile/desktop layout quality for `/coordination`.
5. Run a final guideline pass against fetched `command.md` and fix all high-signal violations.

## Verification Gates
1. Functional parity:
- `/coordination` loads without crash
- Canvas editor still renders and edits
- `Cmd/Ctrl+K` palette works
- Save/validate/run paths still operate
2. Build/test:
- `bun run --cwd apps/web test`
- `bun run --cwd apps/web build`
3. Manual UX checks:
- desktop + narrow viewport
- keyboard-only nav/focus visibility
- validation + run timeline readability
4. Dev startup sanity:
- `bun run dev:up` remains usable from parent worktree stack top.

## Test Cases and Scenarios
1. Open `/coordination`; no blank screen/crash.
2. Trigger command palette via keyboard; navigate commands with arrows + enter.
3. Save workflow and reselect from list.
4. Trigger invalid workflow and verify error presentation is legible/accessibly announced.
5. Run workflow and verify timeline/trace section remains readable during polling.
6. Resize to mobile-ish width; no overlap/cutoff of primary controls.
7. Focus traversal shows visible focus ring on all interactive controls.
8. Reduced-motion environment disables non-essential motion.

## Assumptions and Defaults
1. This is a UI slice pass, not a scope expansion.
2. Coordination engine/runtime contracts remain unchanged.
3. Worker is implementation owner; orchestrator integrates/reviews only.
4. Any visual preference tie-breaker defaults to clarity/readability and domain-specific styling over generic dashboard defaults.
5. If conflicts appear from concurrent merges, worker syncs with `gt sync --no-restack` and logs adaptations in scratchpad before continuing.
