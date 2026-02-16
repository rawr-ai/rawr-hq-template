# SESSION_019c587a - Agent F Step 4 Scratchpad

## Scope
- Owner: Agent F (Step 4 only)
- Canonical target: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Step 4 goal: define workflow model/exposure defaults with ingest-first execution and composed-surface call paths.

## Step A - Skill Re-Introspection Notes (Completed Before Edits)

### Required skills
- `orpc`:
  - Workflow trigger surfaces should remain explicit API routers with clear visibility metadata.
  - Keep trigger routing contract-driven and avoid hidden cross-plugin coupling.
- `inngest`:
  - Execution model is Inngest-first for durable workflow execution.
  - Workflow-to-workflow orchestration should use Inngest-native primitives (`step.invoke`, `step.sendEvent`) rather than direct runtime imports.
- `elysia`:
  - Host route mounting remains a composed surface concern; plugin internals should avoid host-coupled import paths.
  - Keep ingress and trigger routes clearly separated by role.
- `architecture`:
  - Resolve workflow exposure defaults explicitly in canonical policy text.
  - Enforce gate conditions with explicit constraints, not implicit assumptions.

### Additional relevant skills used
- `graphite`:
  - Graphite-first process acknowledged; no commit actions for this step.
- `docs-architecture`:
  - Keep edits minimal and scoped to Step 4 workflow policy/matrix language.

## Step 4 Intent
1. Keep workflows ingest-first for execution model.
2. Make trigger router generation a default requirement for workflow plugins.
3. Preserve internal-by-default visibility with explicit per-procedure external promotion.
4. Add concrete internal/external usage matrix for trusted/server/operator vs promoted external callers.
5. Clarify workflow orchestration via Inngest-native composition, not plugin-to-plugin imports.

## Progress Log
- 2026-02-16 17:52:40 EST: Completed Step 4 skill re-introspection and logged workflow policy intent before edits.
- 2026-02-16 17:53:07 EST: Wrote Step 4 plan doc and completed pre-edit check-in; ready for focused Step 4 workflow policy edits.
- 2026-02-16 17:53:43 EST: Applied Step 4 canonical workflow policy/matrix updates and verified composed-surface call-flow constraints.

## End Output (Step 4)

### Exact edits
- Rewrote `Workflows Policy` section to make execution model explicit:
  - Added `Execution model default (Inngest-first / ingest-first)` and stated workflow execution runs through Inngest functions.
  - Added `Default workflow plugin requirement` stating workflow plugins must:
    - generate workflow trigger oRPC routers under `/api/workflows/<capability>/...`,
    - provide Inngest functions as execution surface.
- Tightened `Visibility policy`:
  - preserved internal-by-default behavior,
  - clarified explicit per-procedure promotion to external,
  - clarified internal trusted/server/operator default vs external promoted-procedure access.
- Strengthened orchestration/composition constraints:
  - explicit workflow-to-workflow orchestration via Inngest-native patterns (`step.invoke`, `step.sendEvent`) and/or package logic,
  - explicit cross-workflow call-flow via composed surfaces only (trigger routers + Inngest functions/events),
  - no direct plugin runtime imports.
- Updated `Internal vs External Trigger Usage Matrix` notes:
  - `internal` row now explicitly marks trusted/server/operator standard path,
  - `external` row now explicitly restricts calls to procedures promoted external, procedure-by-procedure.
- Updated acceptance check #7:
  - now explicitly requires no cross-plugin runtime imports and composed-surface-only cross-workflow call flow.

### Why Step 4 gate passes
- Workflow model is explicitly ingest-first/Inngest-first for execution.
- Workflow plugins are explicitly required to generate trigger routers and provide Inngest functions.
- Trigger visibility defaults are explicit: internal by default, with explicit per-procedure promotion.
- Internal/external usage matrix now concretely distinguishes trusted internal callers from external promoted-only callers.
- Policy now explicitly states no plugin-to-plugin import path and mandates composed-surface call flows.

### Follow-ons deferred
- No Step 5+ discovery/composition redesign changes were applied.
- No API boundary or domain topology rewrites were introduced beyond prior steps.
- No implementation/code changes were made; this remains documentation-policy convergence.
