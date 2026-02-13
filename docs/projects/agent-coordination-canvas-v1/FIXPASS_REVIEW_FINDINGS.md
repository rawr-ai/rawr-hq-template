# Fix Pass Review Findings (Canonical)

Date: 2026-02-12
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`

## Findings

### 1) Design shell mismatch
- Severity: High
- Evidence:
  - `apps/web/src/ui/App.tsx` mounts generic `AppShell` + `SidebarNav` for coordination route.
  - MCP source expects dedicated coordination shell composition (`App.tsx`, `components/shell/*`).
- Impact: `/coordination` visual composition diverges from design ownership model.

### 2) Missing side-panel integration
- Severity: High
- Evidence:
  - `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx` does not render `WorkflowSidePanel`.
- Impact: missing design-required interaction model and metadata editing surface.

### 3) Styling model mismatch
- Severity: High
- Evidence:
  - `apps/web/src/ui/coordination/styles/index.css` currently uses legacy `coordination__*` BEM-heavy styling model.
  - MCP source uses Tailwind class composition with tokenized variables.
- Impact: visual parity and maintainability drift.

### 4) Run wiring bug (unsaved workflow)
- Severity: Critical
- Evidence:
  - `apps/web/src/ui/coordination/hooks/useWorkflow.ts`: `queueRun()` calls `runWorkflowById(activeWorkflow.workflowId, ...)` with no persisted-state guard.
  - `apps/server/src/coordination.ts` correctly returns `WORKFLOW_NOT_FOUND` when workflow does not exist.
- Impact: clicking Run can fail for fresh/unsaved workflows.

### 5) Hardcoded monitor URL
- Severity: Medium
- Evidence:
  - `apps/web/src/ui/coordination/components/CoordinationPage.tsx` hardcodes port `:8288` for monitor link.
- Impact: environment-specific behavior; incorrect/non-portable links.

### 6) Design import incompleteness
- Severity: Medium
- Evidence:
  - MCP file map includes `components/ui/Button`, `Card`, `Input`, `Toggle`; live route composition does not fully preserve MCP component architecture.
- Impact: partial parity, increased divergence risk.

## Root Causes
1. Design architecture was partially imported but not mounted at route shell boundary.
2. Bridge layer preserved existing behavior without enforcing persisted-workflow preconditions for run.
3. Styling and visual-gate additions validated current output instead of strict MCP parity.

## Required Fix Policy
1. Enforce 1:1 design architecture at route composition level.
2. Enforce save-before-run semantics in hook layer.
3. Replace hardcoded monitor link with runtime-derived trace links.
4. Complete cutover with no legacy artifacts retained.
