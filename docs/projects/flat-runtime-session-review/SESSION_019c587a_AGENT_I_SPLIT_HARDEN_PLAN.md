# SESSION_019c587a — Agent I (Position A) Plan

## Mission
Defend keeping API plugins and workflow plugins as distinct plugin types while standardizing overlap to one mandatory path when workflow triggers are API-exposed.

## Constraints
- Do not edit canonical proposal docs.
- Do not touch files outside assigned Agent I outputs.
- Ground claims in required code/doc inputs and upstream official documentation.

## Required Axes
1. External client generation (single standardized approach)
2. Internal clients/internal calling (single rule or clean combo rule)
3. Context creation/propagation
4. Errors/logging/observability
5. Middleware/cross-cutting concerns

## Process Plan
1. Skill introspection notes (required): `orpc`, `inngest`, `elysia`, `typebox`, `typescript`, `architecture`, `web-search`.
2. Build axes-first evaluation frame before deep docs read.
3. Read required local inputs:
   - `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
   - `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
   - `apps/server/src/orpc.ts`
   - `packages/core/src/orpc/hq-router.ts`
4. Run web research against official/upstream sources:
   - Inngest docs (including Durable Endpoints / durable execution semantics)
   - oRPC docs (contract-first, handlers, client generation, OpenAPI path)
   - Relevant TypeBox / Elysia references only as needed for overlap questions
5. Synthesize Position A recommendation:
   - Keep split surfaces
   - One standardized overlap pattern
   - Explicit placement of normal endpoints, durable endpoints, durable functions, workflow-trigger APIs
   - Primary harness vs additive harness
   - Migration implications from current canonical proposal
   - Counterarguments and failure/win conditions
   - Concrete abstractions and wiring locations (no black-box claims)
6. Produce final artifact:
   - `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`

## Evidence Quality Gates
- Every non-obvious claim maps to at least one code/doc source.
- Prefer official docs over secondary commentary.
- Distinguish facts vs inference.
- Include source links inline in the recommendation.

## Execution Log
- Done: required skill introspection and notes captured in scratchpad.
- Done: axes-first frame captured before deep required-doc reads.
- Done: required local inputs reviewed (2 session docs + 2 code files).
- Done: official web research completed for Inngest + oRPC overlap questions.
- Done: Position A recommendation written with explicit placement/migration/counterarguments.
