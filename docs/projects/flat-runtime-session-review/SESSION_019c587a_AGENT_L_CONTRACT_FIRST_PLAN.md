# SESSION_019c587a — Agent L Contract-First Plan (Option A)

## Mission
Assess whether contract-first should remain default, be narrowed, or be adjusted in the current architecture, while preserving the locked posture and split-harness policy.

## Non-Negotiable Constraints
1. Use official upstream docs before conclusions.
2. Anchor all recommendations to the accepted posture spec (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`).
3. Preserve split semantics (`oRPC boundary` + `Inngest durability`) and avoid silent policy regressions.
4. Limit edits to Agent L analysis artifacts only.

## Required Inputs (Read Order)
1. Posture spec (locked rules and normative boundaries).
2. Agent I/J/K recommendation deltas (split hardening, collapse rejection, internal-calling constraints).
3. Agent H DX simplification review (boilerplate reduction options that keep split semantics).
4. Current runtime code (`apps/server/src/orpc.ts`, `apps/server/src/rawr.ts`, `packages/core/src/orpc/hq-router.ts`, `packages/coordination-inngest/src/adapter.ts`).
5. Mandatory skills (orpc, inngest, elysia, typebox, typescript, architecture, web-search) for method and guardrails.

## Analysis Method
1. Extract locked invariants from posture spec and convert to explicit regression gates.
2. Verify runtime code still reflects those invariants.
3. Build a source map from official docs (oRPC first, then Inngest/Elysia/TypeBox where relevant).
4. Evaluate contract-first value by layer:
- pure/internal package boundaries,
- API plugins,
- workflow trigger surfaces,
- durable function/runtime surfaces,
- composition model.
5. Compare three authoring stances:
- contract-first everywhere,
- router-first default,
- deliberate hybrid.
6. Choose recommendation via policy-first rubric:
- preserves hard rules,
- reduces drift risk,
- keeps external client-generation stable,
- lowers unnecessary authoring overhead.

## Question-to-Output Mapping
1. Pure/internal packages: determine when dedicated contract-first materially pays off; define promotion threshold.
2. API plugins: determine whether simple wrappers stay router-first or should remain contract-first at boundary.
3. Workflows: separate trigger-router authoring from durable execution authoring.
4. Identify where contract-first is truly high-value in this architecture.
5. Provide canonical definitions (contract-first vs router-first vs deliberate hybrid) in repo context.
6. Evaluate whether auto-composition can be simplified using contract-first without violating split posture.

## Regression Gates (Must Pass)
1. No change to locked split semantics or ingress ownership (`/api/orpc|/rpc` vs `/api/inngest`).
2. No second first-party trigger authoring path.
3. No erosion of single external SDK generation source (composed oRPC/OpenAPI).
4. No policy that encourages in-process HTTP self-calls as default.
5. Any simplification must remain explicit/non-black-box at host mount boundaries.

## Deliverables
1. `SESSION_019c587a_AGENT_L_CONTRACT_FIRST_PLAN.md` (this file).
2. `SESSION_019c587a_AGENT_L_CONTRACT_FIRST_SCRATCHPAD.md` (evidence + source map + skill citations + working notes).
3. `SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md` (final recommendation, compatibility statement, implications, counterargument/response, official links).

## Done Criteria
- All six questions answered directly.
- Recommendation is explicit: keep / adjust / switch default.
- Compatibility with posture spec is explicit and testable.
- Layer implications are concrete (package, API plugin, workflow plugin, composition).
- If recommending change, authoring-model deltas are precise and regression-safe.
