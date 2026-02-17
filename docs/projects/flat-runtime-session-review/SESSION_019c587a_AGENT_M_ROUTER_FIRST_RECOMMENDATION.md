# SESSION_019c587a — Agent M Router-First Recommendation

## Recommendation
**Adjust default (deliberate hybrid), do not globally switch to router-first.**

1. Keep **contract-first as default for boundary-owned surfaces** (API plugins and workflow trigger APIs that define caller-visible contracts).
2. Allow **router-first as default for leaf/internal modules** where the surface is internal-only and not the external SDK source.
3. Keep split harness posture unchanged:
- oRPC = caller boundary + contract/openapi/client path.
- Inngest = durable execution harness.
- Durable Endpoints = additive ingress only.

This gives most router-first DX gains without violating locked posture rules.

## Explicit Compatibility With Current Posture Spec
This recommendation is **compatible** with `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` and introduces no silent regressions:

1. External SDK generation remains single-source from composed oRPC/OpenAPI (spec lines 42-57, 216-218).
2. `/api/inngest` remains runtime ingress only (spec lines 215-217; runtime mount in `apps/server/src/rawr.ts:111`).
3. Workflow trigger APIs remain caller-trigger oRPC surfaces that dispatch to Inngest (spec lines 178-193).
4. No second first-party trigger authoring path is introduced (spec lines 199-200, 222).
5. Internal-call discipline can remain deterministic via internal clients (spec lines 60-77, 223-224).

## Canonical Definitions (Repo Context)
1. **Contract-first**
- Define explicit contract artifact first (`oc.router` + route metadata + schemas), then implement via `implement(...)`.
- Best for public/shared/stable boundary contracts and strict governance.

2. **Router-first**
- Define router/procedures first; derive contract from router when needed (`router.$contract` / router-to-contract path).
- Best for internal/private/rapid iteration surfaces.

3. **Deliberate hybrid**
- Router-first for internal leaf authoring.
- Contract-first for boundary surfaces and any namespace participating in external client/OpenAPI guarantees.

## Answers To Required Questions

### 1) Pure/internal packages
**Yes, router-first can reduce overhead**, especially where contract and router are currently duplicated. However, clarity is preserved only if each router-first leaf emits a normalized contract artifact before composition.

Why:
- oRPC router-first explicitly targets fast iteration/private APIs.
- Agent H shows composition over-wiring pain points.
- Posture still requires one composed external contract source.

### 2) API plugins
**Partially yes.** Operation-first/router-first improves local ergonomics, but boundary APIs with external consumers should stay contract-first by default.

Why:
- oRPC docs position contract-first as recommended for larger/public/shared APIs.
- router-to-contract has documented disadvantages (implementation leakage, metadata control constraints).

### 3) Workflows
**Router-first helps wrapper ergonomics, not durable execution ownership.**

- Workflow trigger APIs: retain boundary contract discipline (contract-first default).
- Workflow internals/wrappers: router-first patterns can reduce boilerplate.
- Durable execution handlers remain Inngest-native (`createFunction`, `step.run`, `step.invoke`).

### 4) Where contract-first still makes sense under this model
Contract-first remains the default for:
1. Any caller-visible API intended for external SDK/client generation.
2. Workflow trigger namespaces exposed to external callers.
3. Surfaces requiring strong versioning/change-control metadata.
4. Cross-team shared contracts where implementation details must stay decoupled.

### 5) Clarified definitions in our architecture
- Contract-first = boundary contract ownership model.
- Router-first = local implementation-first model.
- Deliberate hybrid = boundary contract-first + leaf router-first, with promotion gates.

### 6) Auto-composition coherence if leaf modules favor router-first
**Yes, coherence is preserved** if composition requires normalized descriptors and enforces policy gates.

Required shape:
- Every capability contributes `{ contract, router }` to composition, regardless of authoring path.
- External/OpenAPI composition accepts only normalized contract surfaces.
- Derived router contracts are not auto-exposed externally without boundary checks.

## Concrete Implications By Layer

### Package layer (internal domain packages)
- Favor router-first authoring for internal procedures to reduce local boilerplate.
- Require export of normalized contract artifact for composer ingestion.
- Keep domain packages transport-neutral and free of Inngest serve mounts.

### API plugin layer
- Keep contract-first default for caller-visible endpoints.
- Permit router-first internally only when results are normalized before boundary exposure.
- Preserve one boundary contract tree feeding OpenAPI generation.

### Workflow plugin layer
- Keep trigger API and execution ingress semantics split.
- Trigger APIs remain explicit oRPC caller surfaces.
- Durable execution remains Inngest function modules.
- Durable Endpoints remain additive ingress adapters only.

### Composition layer
- Keep one composed contract/router tree and one Inngest function bundle.
- Add schema/metadata guardrails so router-derived contracts cannot bypass boundary policy.

## If Adopting This Adjustment: Authoring-Model Delta

### What changes
1. Leaf/internal module default authoring becomes router-first.
2. Boundary module default remains contract-first.
3. Composition requires normalized capability descriptor outputs.

### Why this has no regressions
1. It does not alter runtime mounts (`/api/orpc`, `/rpc`, `/api/inngest`).
2. It does not add a second trigger path.
3. It preserves single-source external SDK generation.
4. It keeps internal-call and durability ownership rules intact.

## Best Counterargument and Response

### Counterargument
If router-first is favored anywhere, teams may drift into exposing implementation-derived contracts, weakening external contract governance and reintroducing policy ambiguity.

### Response
That risk is real, so the default is only adjusted for **leaf/internal** modules. Boundary surfaces remain contract-first by policy. Composition gates (normalized descriptors + external exposure checks) prevent leakage from leaf router-first code into external contract surfaces.

## Evidence Anchors (Local)
- Posture spec: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Split harden: `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- Collapse/unify: `SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- Internal calling: `SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
- DX simplification: `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- Runtime wiring:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`

## Official Source Links

### oRPC
- Contract-first define: https://orpc.dev/docs/contract-first/define-contract
- Contract-first implement: https://orpc.dev/docs/contract-first/implement-contract
- Router-first: https://orpc.dev/docs/router-first
- Router-to-contract: https://orpc.dev/docs/router-first/router-to-contract
- Server-side calls: https://orpc.dev/docs/client/server-side-calls
- OpenAPI handler: https://orpc.dev/docs/openapi/openapi-handler
- OpenAPI spec generation: https://orpc.dev/docs/openapi/openapi-specification

### Inngest
- Serve reference: https://www.inngest.com/docs/reference/serve
- Durable Endpoints: https://www.inngest.com/docs/learn/durable-endpoints
- Create function: https://www.inngest.com/docs/reference/functions/create
- `step.run`: https://www.inngest.com/docs/reference/functions/step-run
- `step.invoke`: https://www.inngest.com/docs/reference/functions/step-invoke

### Elysia + TypeBox
- Elysia lifecycle: https://elysiajs.com/essential/life-cycle
- TypeBox repository/docs: https://github.com/sinclairzx81/typebox
