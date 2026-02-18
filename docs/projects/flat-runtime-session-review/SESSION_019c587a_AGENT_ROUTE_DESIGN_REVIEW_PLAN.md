# SESSION_019c587a Agent Route Design Review Plan

## Mission
Review route/API surface design for the ORPC + Inngest packet and current runtime wiring, focused on route structure quality, caller clarity, and long-term maintainability. This is a route/API review, not a full architecture reset.

## Scope Boundaries
- In scope:
  - Route namespace strategy (`/rpc`, `/api/orpc`, `/api/workflows/<capability>/*`, `/api/inngest`)
  - Caller-mode separation (browser/network vs server-internal vs runtime ingress)
  - RPC transport vs OpenAPI transport intent and documentation clarity
  - Internal vs external route split explicitness and ingress placement semantics
- Out of scope:
  - Full architecture redesign
  - Runtime code implementation changes
  - Migration execution plan beyond route/API posture recommendations

## Canonical Anchors (Read First)
1. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
2. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
3. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
4. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
5. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
6. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
7. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
8. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
9. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
10. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

## Relevant Skills (Introspection)
- `orpc`: required to assess dual transport posture (`RPCHandler` vs `OpenAPIHandler`, client link implications).
- `inngest`: required to assess ingress semantics and runtime-only boundary for `/api/inngest`.
- `architecture`: required to evaluate design sufficiency under constraints without over-resetting.
- `deep-search`: required to map packet policy claims against actual host/router code evidence.
- `rawr-hq-orientation`: required to keep analysis aligned with repo boundary conventions.

## Review Method
1. Establish canonical baseline from packet + decision locks.
2. Extract concrete route/caller constraints and non-negotiable invariants.
3. Reality-check host/router code:
   - `apps/server/src/orpc.ts`
   - `apps/server/src/rawr.ts`
   - `packages/core/src/orpc/hq-router.ts`
   - `packages/coordination/src/orpc/contract.ts`
   - `packages/coordination-inngest/src/adapter.ts`
   - `apps/web/src/ui/lib/orpc-client.ts`
   - `apps/cli/src/lib/coordination-api.ts`
4. Compare canonical target posture vs current runtime posture.
5. Evaluate:
   - Correctness now
   - Suitability at scale
   - Clarity of internal vs external split
   - Clarity of RPC link vs OpenAPI link usage
   - Ingress placement policy (`/api/inngest`)
6. Classify recommendations by impact:
   - `keep as-is`
   - `tighten docs`
   - `structural correction`

## Primary Evaluation Questions
- Why `api/workflows` vs `/workflows`?
- Why not `api/<capability>/workflows`?
- What is `/rpc` for vs `/api/orpc` for, and who should hit which?
- Is internal vs external separation explicit enough today?
- Do specs clearly document RPC link vs OpenAPI link usage and client expectations?
- Should Inngest ingress remain `/api/inngest` or move to internal-only pattern?

## Deliverables
- Plan:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md`
- Scratchpad:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_SCRATCHPAD.md`
- Final analysis:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`

## Acceptance Criteria
- Canonical packet is treated as source-of-truth baseline.
- Analysis remains route/API-surface scoped.
- Current runtime code paths are checked and referenced.
- Explicit answers are provided for all required route questions.
- Recommendations are pragmatic and impact-labeled.
