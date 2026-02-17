# Session 019c587a — Agent N ORPC Sanity Check Scratchpad

## Working Principles

- Independent assessment first; no automatic deference to prior recommendations.
- Ground conclusions in required source docs and optional runtime files.
- Keep scope constrained to contract/router structure and churn minimization.

## Evidence Log (to fill)

### Latest integrated recommendation + illustration
- Source: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
- Key claims:
  - Deliberate hybrid claim is explicit: boundary contract-first, internal leaf router/service-first (`:11-15`, `:21-33`).
  - Internal leaf illustration uses `operations/*` + `services/*` + `router.ts` and no dedicated contract artifact (`:69-97`, `:162-165`).
  - API plugin illustration introduces two shapes:
    - N=1: `contract.ts` + `router.ts` (`:169-175`)
    - N=3: `contracts/*.contract.ts` + `handlers/*.handler.ts` + recomposition via `contract.ts` + `router.ts` + `index.ts` (`:177-273`).
  - It explicitly says handlers can stay in `router.ts` for small N=1 (`:272`), but scaled example normalizes heavier split (`:180-190`, `:247-265`).

### Prior consensus docs
- `SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
  - Same hybrid posture: boundary contract-first, internal leaf router/service-first (`:6-8`, `:39-40`, `:106-108`).
  - API plugins should remain contract-first even when simple wrappers (`:54-57`, `:87-90`).
  - Defines contract-first around first-class `contract.ts` + `implement<typeof contract>` (`:33-35`).
  - Does not prescribe `contracts/` + `handlers/` decomposition.
- `SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
  - Same hybrid posture with boundary contract-first and internal leaf router-first (`:6-8`, `:33-35`, `:106-108`).
  - API plugin: router-first can be internal, but boundary contract-first default remains (`:48-52`, `:89-91`).
  - Requires normalized composition outputs (`{ contract, router }`) but does not require per-op file decomposition (`:74-79`, `:99-101`).
- `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - Canonical naming defaults are short role files: `contract.ts`, `router.ts`, `client.ts`, `index.ts` (`:237-241`).
  - Canonical inventory explicitly sets:
    - `packages/<capability>/src/{contract.ts,router.ts,client.ts}` (`:264-265`)
    - `plugins/api/<capability>-api/src/{contract.ts,router.ts,index.ts}` (`:266-267`)
    - `plugins/workflows/<capability>-workflows/src/{contract.ts,router.ts,functions/*,index.ts}` (`:268-269`)
  - Canonical file tree repeats the same, no `contracts/` or `handlers/` directories (`:582-606`).
  - Policy: one composed boundary contract for external SDK generation; internal contracts not external SDK source (`:42-45`, `:218`).
- `SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md`
  - Confirms split semantics and one-way standard per capability (`:51-69`).
  - Domain package includes one internal contract/router/client (`:62-64`).
  - Caller-facing API procedures use oRPC boundary contract/router only (`:64-66`).
  - No per-operation folder decomposition requirement.
- `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
  - Focus is reducing over-wiring/manual merge duplication.
  - Proposed authoring model assumes `packages/<capability>/src/{contract.ts,router.ts,client.ts,...}` and typed surface exports from plugin `index.ts` (`:449-467`).
  - API plugin examples highlight `index.ts` composition surfaces; no requirement for `contracts/` + `handlers/` split (`:166-177`, `:449-459`).

### Runtime grounding (optional)
- `apps/server/src/orpc.ts`
  - Runtime implements one root `hqContract` and maps handlers in one `os.router(...)` tree (`:104-107`, `:107-279`).
  - OpenAPI generated from one composed router (`:282-307`), supporting single external contract-source posture.
- `apps/server/src/rawr.ts`
  - Keeps ingress split: `/api/inngest` mount then oRPC registration (`:111-118`).
  - Aligns with posture’s split harness + single oRPC boundary path.

### ORPC docs spot check (if needed)
- `Define Contract`: contract-first examples show a single contract object/router and per-procedure contract objects; they do not mandate per-file decomposition.
- `Implement Contract`: shows `implement(contract)` + `os.router({...})` as core pattern; implementation granularity is optional.
- `Monorepo Setup`: recommends package-level structure patterns (contract/service/hybrid), explicitly says structure is suggestive/flexible.
- `Router to Contract`: warns that deriving contracts directly from router may leak internal logic unless minified, which supports boundary contract-first discipline.

## Concern-by-Concern Assessment

1. Internal vs external operations asymmetry:
   - Asymmetry itself is consistent with consensus: internal leafs can be lighter/router-first, boundaries remain contract-first.
   - What is questionable is *where* decomposition burden lands: integrated illustration keeps internal leafs in per-operation files but pushes API boundary to heavier `contracts/` + `handlers/` + recomposition, while posture canonical inventory expects only `contract.ts` + `router.ts` (+ `index.ts`) for plugins.
2. Over-separation/churn from per-operation decomposition:
   - Over-separation risk is real for API plugins at current maturity because consensus docs anchor simpler plugin file sets.
   - Internal per-operation split can be optional and justified only at higher operation counts/complexity.
3. Simpler `contract.ts` + `router.ts` alternative:
   - Strongly compatible with posture spec canonical file tree and naming rules.
   - Can still call local helpers from `operations/` optionally without making per-op contract/handler files mandatory.
4. Internal package operation split justification:
   - Justified conditionally: useful when operations require distinct middleware/context/error profiles or become large.
   - Not justified as a default if it creates boilerplate for N=1/N=2.
5. API plugin over-fragmentation risk:
   - High risk if the integrated N=3 example is interpreted as new baseline.
   - Directly in tension with canonical inventory (`plugins/api/.../{contract.ts,router.ts,index.ts}`) unless clearly labeled “optional large-surface variant.”

## Draft Conclusion (to refine)

- Consensus match or drift:
  - Policy-level match: yes (hybrid stance aligns with L/M/posture).
  - Illustration-level drift: yes (introduces extra API plugin fragmentation not present in consensus canonical inventory).
- Minimal least-churn recommendation:
  - Keep API/workflow plugin default as `contract.ts` + `router.ts` + optional `index.ts`.
  - Keep internal package default as `contract.ts` + `router.ts` + `client.ts`; optional `operations/` for complexity, not default.
  - Reserve `contracts/` and `handlers/` subfolders for explicit scale threshold only.
