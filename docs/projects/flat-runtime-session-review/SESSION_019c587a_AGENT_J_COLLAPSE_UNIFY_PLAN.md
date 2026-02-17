# Session 019c587a — Agent J Collapse/Unify Plan

## Mission
Evaluate Position B: whether one API plugin surface can coherently host regular endpoints, Inngest durable endpoints, and endpoints that trigger durable functions while preserving semantics and reducing dual-path complexity.

## Constraint Guardrails
- Read required local artifacts first-party and upstream docs second-party.
- Do not edit canonical proposal docs; only author assigned outputs.
- Use explicit, evidence-backed claims and show wiring locations for any proposed abstraction.

## Axes-First Research Frame (Before Deep Read)
1. External client generation
- Question: Can one standardized client generation path cover all external consumers without semantic leakage?
- Success criteria: Single contract source and predictable generated clients; no special-case per durability mode.

2. Internal clients/internal calling
- Question: Can internal call sites follow one rule, or a clear combo rule, without runtime ambiguity?
- Success criteria: Deterministic invocation boundary (direct domain call vs transport call vs event trigger) with documented rule.

3. Context creation/propagation
- Question: Can request context and durable-run context be unified without losing lifecycle guarantees?
- Success criteria: Clear context envelope with adapter-specific hydration points.

4. Errors/logging/observability
- Question: Can error taxonomy and telemetry stay coherent across request-response and durable async flows?
- Success criteria: Shared error model + mapped transport/run statuses + trace correlation strategy.

5. Middleware/cross-cutting concerns
- Question: Can auth, validation, rate control, idempotency, and policy hooks be consistently applied?
- Success criteria: Shared policy layer with explicit adapter boundaries and no duplicate implementation paths.

## Research Sequence
1. Skill introspection notes capture (oRPC, Inngest, Elysia, TypeBox, TypeScript, Architecture, Web-search).
2. Read local required inputs:
- SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md
- SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md
- apps/server/src/orpc.ts
- packages/core/src/orpc/hq-router.ts
3. Gather upstream official evidence:
- oRPC docs (contract/handlers/adapters)
- Inngest docs (serve endpoint, triggers, durability semantics)
- Elysia docs (mounting/context/lifecycle)
- TypeBox/OpenAPI contract semantics where relevant
4. Score findings against 5 required axes.
5. Produce Position B recommendation:
- either support collapse with exact authoring/wiring model,
- or reject collapse with concrete failure modes and a better alternative.

## Deliverables
- Plan: SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_PLAN.md
- Scratchpad: SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_SCRATCHPAD.md
- Final recommendation: SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md

## Quality Gates
- Explicitly address durable endpoints and durable functions.
- State primary harness (oRPC vs Inngest) and additive harness role.
- Include strongest counterargument and rebuttal.
- Include official links for all upstream claims.

## Progress Log
- [x] Built axes-first frame before deep required doc read.
- [x] Introspected required skills and logged notes.
- [x] Read required session docs and required code files.
- [x] Collected upstream official documentation evidence.
- [x] Completed axis-based assessment in scratchpad.
- [ ] Draft final recommendation artifact.
- [x] Draft final recommendation artifact.
