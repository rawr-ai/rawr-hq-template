# Agent Coordination Canvas Fix Pass (1:1 Design + Correct Wiring, No Legacy)

## Summary
This fix pass corrects two hard failures in the current stack:
1. UI parity failure: current `/coordination` output does not match the MCP-owned design composition and token/styling architecture.
2. Runtime wiring failure: `Run` can target a non-persisted workflow, producing `WORKFLOW_NOT_FOUND` behavior.

The implementation is executed as a Graphite stack with explicit phase ownership and zero-legacy cutover requirements.

## Stack
Base: `codex/coordination-design-data-v1-cutover`

1. `codex/coordination-fixpass-v1-docs`
2. `codex/coordination-fixpass-v1-design-parity`
3. `codex/coordination-fixpass-v1-runtime-wiring`
4. `codex/coordination-fixpass-v1-bridge-behavior`
5. `codex/coordination-fixpass-v1-cutover-purge`

## Phase 0: Doc-First Gate
1. Create canonical docs before any code changes:
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_IMPLEMENTATION_PLAN.md`
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_REVIEW_FINDINGS.md`
- `docs/projects/agent-coordination-canvas-v1/FIXPASS_ORCHESTRATOR_SCRATCH.md`
2. Create per-agent plan + scratch docs.
3. Lock MCP source URL and parity constraints.

## Phase 1: Parallel Agent Discovery
1. D1 (design parity) and DF (runtime/wiring) run in parallel.
2. Orchestrator merges accepted findings to canonical review doc.
3. BR (bridge) starts only after D1+DF findings are locked.
4. QA starts last and blocks merge until all gates pass.

## Phase 2: Design Parity (`...-design-parity`)
Targets:
- `apps/web/src/ui/App.tsx`
- `apps/web/src/ui/coordination/components/**/*`
- `apps/web/src/ui/coordination/styles/index.css`
- `apps/web/tailwind.config.cjs`

Required outcomes:
1. Mount MCP shell composition for `/coordination`.
2. Render side panel with open/close behavior from design model.
3. Align classes/tokens to MCP Tailwind/tokenized architecture.
4. Keep WorkflowKit editor/provider mounted under design surface.
5. Include missing MCP primitive components in coordination scope if required by composition.

## Phase 3: Runtime Wiring (`...-runtime-wiring`)
Targets:
- `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
- `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
- `apps/web/src/ui/coordination/adapters/api-client.ts`
- `apps/web/src/ui/coordination/components/CoordinationPage.tsx`
- `apps/web/src/ui/coordination/components/canvas/WorkflowToolbar.tsx`

Required outcomes:
1. `Run` never calls `/run` with an unsaved workflow id.
2. Save-before-run flow: persist then run.
3. Structured envelope errors displayed and recoverable.
4. Remove hardcoded `:8288` monitor link path in UI.
5. Polling remains bounded and stale-safe.

## Phase 4: Bridge Hardening (`...-bridge-behavior`)
Targets:
- `apps/web/src/ui/coordination/adapters/workflow-mappers.ts`
- `apps/web/src/ui/coordination/types/workflow.ts`
- `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx`
- `apps/web/src/ui/coordination/components/status/RunStatusPanel.tsx`

Required outcomes:
1. Typed bridge between design workflow shape and `CoordinationWorkflowV1`.
2. Real data/actions flow through hooks/adapters only (no mocked state).
3. Validation/run/timeline panels reflect backend-compatible state.
4. Busy/running states remain consistent through async transitions.

## Phase 5: Cutover + Purge (`...-cutover-purge`)
1. Add temporary `/coordination-shadow` for visual parity verification.
2. Expand Playwright visual coverage (desktop + mobile states).
3. Add/accessibility checks for focus/labels/live regions/reduced motion.
4. Cut over `/coordination`, remove shadow route.
5. Purge legacy route/files/styles/references with grep zero-match gate.
6. Update docs/runbooks to final architecture only.

## Acceptance Gates
1. `bun run typecheck` passes.
2. Target tests pass:
- `apps/server/test/rawr.test.ts`
- `packages/coordination/test/coordination.test.ts`
- `packages/coordination-inngest/test/inngest-adapter.test.ts`
- `apps/web/test/*`
3. Playwright visual gate passes.
4. Legacy purge gate passes (zero references to removed artifacts).
5. `gt log short --stack` clean and submit-ready.

## Constraints
1. Keep endpoint paths unchanged.
2. Keep WorkflowKit as canvas/runtime engine.
3. MCP design source pinned: `https://www.magicpatterns.com/c/al2dvbu3fg4deehobyd5kg/preview`.
4. No compatibility shims/flags at final merge.
