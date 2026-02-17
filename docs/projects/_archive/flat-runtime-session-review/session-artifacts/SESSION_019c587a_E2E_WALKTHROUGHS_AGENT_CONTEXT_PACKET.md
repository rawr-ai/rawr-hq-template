# SESSION_019c587a E2E Walkthrough Agent Context Packet

## Why This Exists
This packet gives all walkthrough agents the same source-of-truth context so outputs stay aligned and non-contradictory.

## Canonical Source Set (Read First)
1. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
2. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
3. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
4. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
5. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
6. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
7. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
8. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
9. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
10. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
11. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
12. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## Locked Policies
1. TypeBox-first schemas.
2. Boundary API and workflow trigger APIs remain split from Inngest runtime ingress.
3. `/api/workflows/...` is caller-trigger path; `/api/inngest` is runtime ingress.
4. Domain package default shape:
   - `domain/ service/ procedures/ router.ts client.ts errors.ts index.ts`
5. API plugin default shape:
   - `contract.ts + operations/* + router.ts + index.ts`
6. No black boxes: all composition/mounting glue shown concretely.

## Mandatory Output Structure
1. Goal and use-case framing
2. Topology diagram
3. Canonical file tree
4. Key file code examples
5. Wiring steps (host -> composition -> plugin/package -> runtime)
6. Runtime sequence walkthrough
7. Rationale and trade-offs
8. What can go wrong (guardrails)
9. Policy consistency checklist

## Quality Bar
- Reader can implement from this doc alone.
- No contradictory naming.
- No TypeBox->Zod drift.
- No ambiguous endpoint semantics.
- No unresolved section hidden; unknowns are explicit.
