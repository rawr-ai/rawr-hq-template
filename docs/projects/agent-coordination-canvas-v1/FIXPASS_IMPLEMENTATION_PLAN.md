# Agent Coordination Canvas Full Remediation Plan

Last updated: 2026-02-13  
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`  
Design source (pinned): `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`

## Mission
Deliver a complete, production-grade remediation that:
1. Restores strict 1:1 visual and structural parity with the MCP-owned coordination design.
2. Fixes run/wiring correctness (`Run` on unsaved workflow must save first, then run).
3. Preserves cohesive host shell + micro frontend composition (no split-product feeling).
4. Removes all legacy coordination UI paths, shims, flags, and stale docs/tests.

## Non-Negotiable Invariants
1. WorkflowKit remains the canvas/runtime engine.
2. Coordination API endpoint paths remain unchanged.
3. MCP design files are the UI source of truth for composition, styling tokens, spacing rhythm, and primitives.
4. Final merge contains zero transitional compatibility code.

## Phase 0 (First Action): Write It Down To Docs
This phase is mandatory and must complete before code changes.

1. Refresh canonical remediation docs:
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_IMPLEMENTATION_PLAN.md` (this document)
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_REVIEW_FINDINGS.md`
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_ORCHESTRATOR_SCRATCH.md`

2. Create and maintain per-agent docs:
- `docs/projects/agent-coordination-canvas-v1/agent-d1-fix-plan.md`
- `docs/projects/agent-coordination-canvas-v1/agent-d1-fix-scratch.md`
- `docs/projects/agent-coordination-canvas-v1/agent-df-fix-plan.md`
- `docs/projects/agent-coordination-canvas-v1/agent-df-fix-scratch.md`
- `docs/projects/agent-coordination-canvas-v1/agent-br-fix-plan.md`
- `docs/projects/agent-coordination-canvas-v1/agent-br-fix-scratch.md`
- `docs/projects/agent-coordination-canvas-v1/agent-qa-fix-plan.md`
- `docs/projects/agent-coordination-canvas-v1/agent-qa-fix-scratch.md`

3. Record MCP parity scope:
- Create parity matrix against MCP file list (component-by-component: exact, partial, missing, divergent).
- Record evidence links in findings doc with concrete file paths.

## Branch / Stack Choreography
Graphite stack (repair stack):
1. `codex/coordination-fixpass-v1-docs`
2. `codex/coordination-fixpass-v1-design-parity`
3. `codex/coordination-fixpass-v1-runtime-wiring`
4. `codex/coordination-fixpass-v1-bridge-behavior`
5. `codex/coordination-fixpass-v1-cutover-purge`

Preflight on every phase boundary:
1. `git status --short` must be empty.
2. `gt trunk` must be `main`.
3. `gt log short --stack` must be coherent.
4. Restack when required before submit.

If previous stack merges before completion, recreate the same branch names from `main` in the same order.

## Agent Topology and Responsibilities
Orchestrator owns sequencing, integration, conflict resolution, and decision logging.

1. D1 (design parity implementer/reviewer)
- Skills: `ui-design`, `web-design-guidelines`, `vercel-react-best-practices`
- Scope:
  - `apps/web/src/ui/App.tsx`
  - `apps/web/src/ui/coordination/components/**/*`
  - `apps/web/src/ui/coordination/styles/index.css`
  - `apps/web/tailwind.config.cjs`
- Deliverables:
  - 1:1 parity implementation notes
  - Diff audit of spacing, typography, icons, surface hierarchy, tokens

2. DF (runtime/wiring correctness)
- Skills: `elysia`, `inngest`
- Scope:
  - `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
  - `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
  - `apps/web/src/ui/coordination/adapters/api-client.ts`
  - `apps/server/src/coordination.ts`
  - `packages/coordination/**/*`
- Deliverables:
  - Save-before-run semantics
  - Structured error propagation and user-visible recovery behavior

3. BR (bridge seam hardening)
- Skills: `elysia`, `inngest`, `ui-design`, `vercel-react-best-practices`
- Scope:
  - `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
  - `apps/web/src/ui/coordination/types/workflow.ts`
  - canvas/status integration points
- Deliverables:
  - Single typed mapping contract from runtime to design-facing shape
  - No component-local ad hoc mapping logic

4. QA (blocking final gate)
- Skills: `web-design-guidelines`, `vercel-react-best-practices`
- Scope: visual parity, accessibility, regression suite, legacy purge verification
- Deliverable: explicit pass/fail report with file-backed evidence

Coordination cadence:
1. D1 + DF in parallel.
2. Orchestrator merges findings and locks accepted decisions.
3. BR executes after D1/DF lock.
4. QA blocks cutover until all gates pass.

## Implementation Phases

## Phase 1: Design Parity (`...-design-parity`)
Primary objective: eliminate dual-UI feeling and re-establish strict design parity.

Files:
1. `apps/web/src/ui/App.tsx`
2. `apps/web/src/ui/layout/AppShell.tsx`
3. `apps/web/src/ui/coordination/components/**/*`
4. `apps/web/src/ui/coordination/styles/index.css`
5. `apps/web/tailwind.config.cjs`

Required outcomes:
1. Single cohesive app shell contract across routes (no coordination-only product chrome split).
2. MCP coordination shell composition and panel hierarchy mounted inside the established host shell boundaries.
3. `WorkflowSidePanel` rendered and toggled per design behavior.
4. Missing MCP primitives restored under coordination scope (`Button`, `Card`, `Input`, `Toggle`) and used where required.
5. Replace icon drift with design-aligned icon system.
6. Remove BEM-style legacy coordination class system where superseded by MCP Tailwind/token architecture.
7. Preserve WorkflowKit canvas/editor in the designated design slot without flattening design component boundaries.

## Phase 2: Runtime Wiring Correctness (`...-runtime-wiring`)
Primary objective: guarantee correctness of run lifecycle and status behavior.

Files:
1. `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
2. `apps/web/src/ui/coordination/adapters/api-client.ts`
3. `apps/web/src/ui/coordination/components/CoordinationPage.tsx`
4. `apps/web/src/ui/coordination/components/canvas/WorkflowToolbar.tsx`
5. `apps/web/src/ui/coordination/hooks/useRunStatus.ts`

Required outcomes:
1. `Run` cannot execute against non-persisted workflow IDs.
2. Save-before-run orchestration:
- if dirty/unsaved -> persist -> run persisted ID -> begin status/timeline polling
- if clean/persisted -> run immediately
3. Structured envelope errors surfaced to users with actionable recovery text.
4. Remove hardcoded `:8288` behavior and derive monitor/trace links from runtime response contracts.
5. Polling hardened for:
- bounded backoff/jitter
- terminal-state stop
- cancellation on unmount/workflow switch
- stale async commit prevention

## Phase 3: Bridge + Behavior Hardening (`...-bridge-behavior`)
Primary objective: lock a single, typed design<->runtime seam.

Files:
1. `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
2. `apps/web/src/ui/coordination/types/workflow.ts`
3. `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
4. `apps/web/src/ui/coordination/components/status/RunStatusPanel.tsx`
5. `apps/web/src/ui/coordination/components/status/StatusBadge.tsx`

Required outcomes:
1. Single canonical mapping contract between UI shape and `CoordinationWorkflowV1`.
2. Design component tree remains 1:1 while data/actions are injected via hooks/adapters only.
3. Status semantics standardized (`status` contract, no divergent `tone` semantics).
4. Run/validation/timeline panels reflect live backend state with correct disabled/running/error transitions.
5. Remove duplicate or conflicting transformation logic from components.

## Phase 4: Cutover + Purge (`...-cutover-purge`)
Primary objective: verify parity in shadow, cut over, then remove all superseded artifacts.

Files:
1. `apps/web/src/ui/App.tsx`
2. `apps/web/test/coordination.visual.test.ts`
3. coordination-related docs/runbooks/tests referencing old structures

Required outcomes:
1. Add temporary `/coordination-shadow` only for parity verification.
2. Add/expand visual gates (Chromium desktop + mobile) for key states:
- default
- side-panel open/closed
- command palette open
- validation error
- run in progress
- run terminal state with timeline
3. Add accessibility assertions:
- focus visibility and focus order
- form labels and control names
- live-region announcements for run status transitions
- reduced-motion compliance
4. Cutover `/coordination` to final implementation.
5. Remove `/coordination-shadow` and all transitional routing/flags.
6. Purge legacy coordination files/classes/tests/docs with zero-match grep gate.

## Verification Matrix
Functional:
1. `Run` on unsaved workflow performs save-before-run and never sends invalid ID.
2. `WORKFLOW_NOT_FOUND` is surfaced with structured recovery path.
3. Timeline ordering and terminal states match backend events.
4. Command palette keyboard contract: `Cmd/Ctrl+K`, arrows, `Enter`, `Escape`.
5. Side panel behavior matches MCP design interaction model.

Visual:
1. MCP parity checks pass for spacing, typography, color tokens, iconography, surface layering, and component density.
2. Playwright visual snapshots pass below agreed diff threshold across desktop/mobile.

Accessibility:
1. Focus-visible styling present and consistent.
2. Controls are labeled and keyboard reachable.
3. Live status updates are announced correctly.
4. Reduced-motion mode avoids disruptive animation.

## Completion Gates
1. `bun run typecheck` passes or remaining failures are proven unrelated and tracked.
2. Targeted tests pass:
- `apps/server/test/rawr.test.ts`
- `packages/coordination/test/coordination.test.ts`
- `packages/coordination-inngest/test/inngest-adapter.test.ts`
- `apps/web/test/*`
3. Visual regression gate passes in Chromium desktop/mobile.
4. Legacy purge gate passes with zero stale references.
5. Docs are final-state only (no deprecated architecture guidance).
6. `gt log short --stack` clean, restacked, and submit-ready with `gt submit --stack --ai`.

## Explicit No-Legacy Policy
At final merge, none of the following may remain:
1. Deprecated coordination routes or shadow-only scaffolding.
2. Deprecated BEM coordination style surfaces replaced by MCP tokenized model.
3. Duplicate shell implementations that create split-product experience.
4. Transitional shims/feature flags that preserve old behavior.
5. Docs/tests describing superseded coordination architecture.

## Risk Controls
1. Any divergence from MCP composition/tokens must be logged in findings with rationale and explicit approval.
2. Any runtime contract changes require matching typed client updates and test coverage.
3. Any unresolved parity issue blocks cutover.
