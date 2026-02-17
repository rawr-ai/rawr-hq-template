# SESSION_019c587a E2E Walkthroughs Orchestrator Scratchpad

## Mission
Produce three self-contained tutorial-style end-to-end walkthrough docs (basic, intermediate, advanced micro-frontend) aligned with the ORPC+Inngest packet policies.

## Locked Inputs
- Canonical overview:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Canonical packet:
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
- Recommendation alignment:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## Target Deliverables
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

## Required Section Shape (for each example)
1. Goal and use-case framing
2. End-to-end topology diagram (text or mermaid)
3. Canonical file tree
4. Key files with concrete code examples
5. Wiring steps from host -> composition -> plugin/package -> runtime path
6. Runtime sequence walkthrough (request/event flow)
7. Rationale and trade-offs
8. What can go wrong (failure modes/guardrails)
9. Consistency checks against packet policies

## Non-Negotiable Policies
- TypeBox-first
- Split semantics must remain explicit (`/api/workflows/...` trigger path vs `/api/inngest` runtime ingress)
- Domain package default shape: `domain/ service/ procedures/ router.ts client.ts errors.ts index.ts`
- API plugin default shape: `contract.ts + operations/* + router.ts + index.ts`
- No hand-waving for composition/mounting/harness glue
- No architecture drift from current packet decisions

## Integration Tasks (post-agent)
- Cross-review three docs for naming drift and contradiction.
- Update navigation links in:
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- If advanced example has unresolved boundary gaps, record them in:
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`

## Steering Update (Agent C)
- Reframed advanced example away from presupposed API-client consumption path.
- Agent C must solve underlying problem: micro-frontend access to needed logic/workflow behavior without duplicating semantics.
- API-plugin consumption is optional, not required.
- Agent C must evaluate shared-package-first strategy and workflow invocation model uncertainty.
