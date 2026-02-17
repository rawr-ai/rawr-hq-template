# SESSION_019c587a Agent K — Internal Calling + Packaging Plan

## Mission
Define a strict, implementation-ready standard for internal calling and packaging boundaries (Inngest placement, workflow placement, trigger ownership, and anti-fragmentation rules), for Position C in the architecture debate.

## Axes-First Research Frame (Pre-read)
This frame is intentionally established before deep reading existing proposal/review docs.

### Axis 1: External Client Generation (Single Standard)
- Goal: one canonical generated client path for external consumers.
- Questions:
  - Is external client generation sourced from package-level router contracts (`@orpc/contract` patterns) or runtime adapters?
  - Can we lock generation to one source-of-truth router tree to prevent drift?

### Axis 2: Internal Calling / Internal Clients (Single Rule or Clean Combo)
- Goal: avoid “4 ways to call” and set one default internal trigger path.
- Candidate rule types to evaluate:
  - Rule A: All internal domain invocations go through direct function/service ports; only boundary crossings go through oRPC.
  - Rule B: Internal callers must use an in-process oRPC caller.
  - Rule C: Hybrid with hard constraints by boundary (domain vs runtime orchestration vs transport).
- Decision criteria: type safety, observability consistency, testability, accidental network hops, and cognitive load.

### Axis 3: Context Creation / Propagation
- Goal: deterministic context model from transport edge to domain + workflow runtime.
- Questions:
  - Which layer owns request context assembly (auth, request IDs, tenant, logger)?
  - How does event/workflow context map from API request context without tight coupling?

### Axis 4: Errors / Logging / Observability
- Goal: one error taxonomy and tracing/logging contract across API calls + workflows.
- Questions:
  - Where should domain errors be mapped to transport/workflow failures?
  - Which layer owns cross-cutting instrumentation to avoid duplicate logging paths?

### Axis 5: Middleware / Cross-Cutting Concerns
- Goal: no duplicated policy stacks.
- Questions:
  - Should auth/rate-limit/validation stay transport-only while idempotency/retries stay workflow-only?
  - What middleware belongs in oRPC vs Elysia plugin vs workflow handlers?

## Research Steps
1. Introspect required skills and capture notes in scratchpad.
2. Read required local inputs (session docs + current `orpc` wiring code).
3. Perform official-source web validation (oRPC, Inngest, Elysia, TypeBox; optionally TS architectural references).
4. Synthesize one strict standard with explicit default + exceptions.
5. Draft final recommendation with concrete file-location/wiring examples.

## Output Contract
- Recommendation must include:
  - Single default internal calling standard.
  - Explicit exceptions with guardrails.
  - Workflow placement rule (package vs runtime plugin layer).
  - Inngest client placement + trigger API ownership.
  - API-exposed trigger overlap rule.
  - Concrete location and wiring (no black-box abstractions).

## Execution Status
- [x] Axes-first frame established before deep reading.
- [x] Required skills introspected and notes logged.
- [x] Required local inputs read and mapped to Position C concerns.
- [x] Official-source web research completed with links captured.
- [x] Final recommendation draft (strict standard + wiring) completed.
