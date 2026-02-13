# Fix Pass Review Findings (Canonical)

Last updated: 2026-02-13  
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`  
Design source (pinned): `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`

## Findings (Current)

### 1) Cohesive shell failure (two-product feel)
- Severity: Critical (`P0`)
- Evidence:
  - `apps/web/src/ui/App.tsx` route composition creates a coordination-specific shell path that diverges from non-coordination routes.
  - `apps/web/src/ui/layout/AppShell.tsx` still owns host shell behavior for the rest of the app.
- Impact:
  - Users perceive two different products instead of one shell with coordinated micro frontend surfaces.
  - Design parity reviews become unstable because shell authority is split.

### 2) Canvas parity gap (missing/placeholder visual primitives)
- Severity: High (`P1`)
- Evidence:
  - `apps/web/src/ui/coordination/components/canvas/FlowEdges.tsx` is placeholder behavior (no design edge rendering).
  - `apps/web/src/ui/coordination/components/canvas/FlowNode.tsx` does not implement full MCP node visual contract.
- Impact:
  - Core canvas visuals do not match the MCP source model.
  - “1:1 parity” claim is invalid at the most visible surface.

### 3) Styling/token authority split
- Severity: High (`P1`)
- Evidence:
  - Coordination visuals are influenced by overlapping systems:
    - `apps/web/src/ui/styles/globals.css`
    - `apps/web/src/ui/coordination/styles/index.css`
    - `apps/web/tailwind.config.cjs`
  - Current composition drifts from MCP Tailwind/token ownership and spacing rhythm.
- Impact:
  - Inconsistent spacing, color surfaces, and component density.
  - Changes regress easily due to multiple competing style authorities.

### 4) Run wiring bug (unsaved workflow run path)
- Severity: Critical (`P0`)
- Evidence:
  - `apps/web/src/ui/coordination/hooks/useWorkflow.ts` run path can use non-persisted workflow IDs.
  - Backend contract in `apps/server/src/coordination.ts` correctly returns `WORKFLOW_NOT_FOUND` for missing IDs.
- Impact:
  - Clicking Run on fresh or dirty unsaved workflow can fail with “workflow not found.”
  - Primary workflow action is unreliable.

### 5) Hardcoded monitor URL behavior
- Severity: Medium (`P2`)
- Evidence:
  - `apps/web/src/ui/coordination/components/CoordinationPage.tsx` contains environment-specific hardcoded monitor port assumptions.
- Impact:
  - Incorrect links outside local assumptions.
  - Non-portable behavior across environments.

### 6) Design primitive + API drift
- Severity: Medium (`P2`)
- Evidence:
  - MCP parity set includes UI primitives and semantic status model, but live route has partial adoption:
    - iconography drift in shell components
    - status API drift (`tone` vs canonical `status` semantics)
    - incomplete use of MCP primitives (`Button`, `Card`, `Input`, `Toggle`) in final composition
- Impact:
  - Visual language and interaction semantics diverge from source design.

## Root Causes
1. Route-level composition was allowed to fork shell authority instead of enforcing one cohesive host-shell contract.
2. Runtime integration replaced or bypassed design-facing component contracts rather than injecting data through strict seams.
3. Styling parity was treated as “close enough” instead of a hard source-of-truth token/class contract.
4. Save-before-run invariants were not enforced at the hook boundary.

## Required Fix Policy
1. Enforce one cohesive shell model across routes, with coordination as an integrated micro frontend surface.
2. Enforce strict MCP parity for component composition, primitives, iconography, and tokenized styling.
3. Enforce save-before-run and structured error handling in UI hooks/adapters.
4. Remove hardcoded monitor behavior; derive links from runtime responses.
5. Cut over fully and remove all legacy/transitional surfaces.

## Resolution Status (2026-02-13)
1. `P0` Cohesive shell failure: Resolved.
  - `/coordination` now renders through the same host shell contract as other routes in `apps/web/src/ui/App.tsx`.
  - Route-specific coordination shell wrapper is removed from active composition.
2. `P1` Canvas parity gap: Resolved.
  - Design node/edge rendering implemented in `apps/web/src/ui/coordination/components/canvas/FlowNode.tsx`, `apps/web/src/ui/coordination/components/canvas/FlowEdges.tsx`, and `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx`.
  - Workflow data is mapped into the design graph contract via `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`.
3. `P1` Styling/token authority split: Mitigated and aligned.
  - Coordination token surface is centralized in `apps/web/src/ui/coordination/styles/index.css`.
  - Visual parity is gated with updated Playwright snapshots in `apps/web/test/coordination.visual.test.ts`.
4. `P0` Unsaved run wiring bug: Resolved.
  - Save-before-run invariant enforced in `apps/web/src/ui/coordination/hooks/useWorkflow.ts`.
  - Toolbar run path now catches surfaced runtime errors and reports via UI live region in `apps/web/src/ui/coordination/components/CoordinationPage.tsx`.
5. `P2` Hardcoded monitor URL behavior: Resolved.
  - Monitor links are derived from runtime trace links through `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`.
6. `P2` Primitive/API drift: Resolved.
  - Status API unified to explicit `status` semantics across mapper/types/components in:
    - `apps/web/src/ui/coordination/types/workflow.ts`
    - `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
    - `apps/web/src/ui/coordination/components/status/*`
  - Legacy unused coordination shell wrappers removed:
    - `apps/web/src/ui/coordination/components/App.tsx`
    - `apps/web/src/ui/coordination/components/shell/*`
    - `apps/web/src/ui/coordination/hooks/useTheme.ts`

## Residual Notes
1. `bun run typecheck` still fails due pre-existing unrelated issue in `@rawr/plugin-mfe-demo` resolving `@rawr/ui-sdk`.
2. `bun test apps/server/test/rawr.test.ts` still has one unrelated pre-existing plugin web module failure (`serves plugin web modules when enabled`); coordination route tests pass.

## Addendum: Interactive Canvas Root Cause (2026-02-13)
1. Visible canvas behavior is static render-only (`FlowCanvas`/`FlowEdges`) while WorkflowKit editor subtree is mounted hidden with `pointer-events-none`.
2. WorkflowKit runtime and adapters remain active under the hood; issue is UI surface mounting, not runtime removal.
3. MCP design source itself is static/demo (FlowCanvas + mock hooks), so parity import must be treated as visual/composition baseline, not functional editor baseline.
