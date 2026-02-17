# SESSION_019c587a — Agent M Router-First Scratchpad

## 0) Skill Introspection (Mandatory + Cited)

### `orpc`
Source: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- Confirms both contract-first and router-first are valid oRPC workflows.
- Confirms dual transport exposure from one router (`RPCHandler` + `OpenAPIHandler`).
- Flags transport/prefix/parser pitfalls that matter to boundary policy.

### `inngest`
Source: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- Reinforces Inngest as durability harness (step semantics, resumability), not general boundary API replacement.
- Emphasizes side effects in step boundaries and explicit serve ingress ownership.

### `elysia`
Source: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- Lifecycle order and route parser behavior are operationally significant when mounting adapter handlers.
- Supports explicit fetch-style mounting, useful for split harness host wiring.

### `typebox`
Source: `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- Treats JSON Schema artifacts as first-class contracts.
- Supports portability for OpenAPI 3.1 aligned pipelines.

### `typescript`
Source: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- Recommends explicit module boundaries, invariant-preserving APIs, and controlled refactor slices.
- Supports layered defaults instead of monolithic one-size-fits-all authoring rules.

### `architecture`
Source: `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
- Enforces spine-first decisions and explicit separation of current/target/transition.
- Requires no silent drift from accepted architecture invariants.

### `web-search`
Source: `/Users/mateicanavra/.codex-rawr/skills/web-search/SKILL.md`
- Source-map and triangulation method applied (official docs first, then synthesis).
- Tool hierarchy followed; Firecrawl attempted first, then native web fallback due credits.

## 1) Web Research Execution Notes
- Attempted `firecrawl_search` (multiple queries) but all failed with: insufficient Firecrawl credits.
- Continued with native web tool using official domains only (`orpc.dev`, `inngest.com`, `elysiajs.com`, `github.com/sinclairzx81/typebox`).
- Technical-source rule preserved: primary sources only.

## 2) Local Posture Anchors (Must Hold)
Primary posture document: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

Key locked constraints:
- Keep split semantics (API boundary vs durability harness).
- External SDK generation from one composed oRPC/OpenAPI surface.
- Internal default: in-process internal clients; no local HTTP self-calls.
- `/api/inngest` ingress remains runtime-only; workflow trigger APIs stay on oRPC surfaces.
- Durable Endpoints additive only; no second first-party trigger authoring path.

Line anchors:
- Locked decision + split: lines 15-23
- External client policy: lines 42-57
- Internal calling policy: lines 60-77
- Split vs collapse policy: lines 80-95
- Workflow/API boundary policy: lines 178-193
- Durable endpoint policy: lines 196-211
- Hard rules: lines 215-224

## 3) Required Local Input Synthesis

### Agent I (split harden)
File: `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- Recommends split plugin types with one overlap rule: API-exposed workflow triggers are oRPC procedures that dispatch into Inngest.
- Durable Endpoints remain additive ingress adapters.

### Agent J (collapse/unify)
File: `SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- Rejects full collapse into one surface.
- Recommends one composition model with dual harness semantics.

### Agent K (internal calling)
File: `SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
- Calls for deterministic internal call default (capability internal clients).
- Forbids ad hoc multi-style invocation in runtime code.

### Agent H (DX simplification)
File: `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- Finds over-wiring/duplication in composition.
- Suggests simplification helpers without removing split boundaries.

## 4) Current Runtime Wiring Facts (Code)

### oRPC boundary
File: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- Uses `implement<typeof hqContract,...>(hqContract)` (line 104).
- Exposes OpenAPI spec via `OpenAPIGenerator` + TypeBox converter (lines 282-296).
- Mounts both `/rpc*` and `/api/orpc*` via dedicated handlers (lines 340-375).

### Host split mounts
File: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
- Creates runtime adapter + Inngest bundle once (lines 101-107).
- Mounts `/api/inngest` separately (line 111).
- Registers oRPC routes separately (line 113).

### Root contract composition
File: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
- One composed contract tree (`coordination`, `state`) (lines 5-8).

### Inngest durability harness
File: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`
- Runtime ingress handler creation (`createInngestServeHandler`) (line 103).
- Durable function creation (`client.createFunction`) with retries (lines 214-219).
- Event enqueue (`client.send`) for trigger dispatch (line 175).
- Durable execution boundaries in `step.run` calls across run lifecycle and desks (lines 253+).

## 5) Official Source Map (Web)

### oRPC
1. Contract-first define/implement:
- https://orpc.dev/docs/contract-first/define-contract
- https://orpc.dev/docs/contract-first/implement-contract
2. Router-first and suitability:
- https://orpc.dev/docs/router-first
- https://orpc.dev/docs/router-first/define-router
3. Router-to-contract and disadvantages:
- https://orpc.dev/docs/router-first/router-to-contract
4. Server-side invocation methods:
- https://orpc.dev/docs/client/server-side-calls
5. OpenAPI path:
- https://orpc.dev/docs/openapi/openapi-handler
- https://orpc.dev/docs/openapi/openapi-specification

### Inngest
1. Serve ingress semantics (`GET` metadata, `PUT` register, `POST` run):
- https://www.inngest.com/docs/reference/serve
2. Durable endpoint posture + current limits:
- https://www.inngest.com/docs/learn/durable-endpoints
3. Durable functions and options:
- https://www.inngest.com/docs/reference/functions/create
4. Step durability primitives:
- https://www.inngest.com/docs/reference/functions/step-run
- https://www.inngest.com/docs/reference/functions/step-invoke

### Elysia
- Lifecycle order/scope:
  - https://elysiajs.com/essential/life-cycle

### TypeBox
- JSON Schema-first runtime type system:
  - https://github.com/sinclairzx81/typebox

## 6) Official Findings (Facts vs Inference)

### Fact set A: oRPC supports both styles, with context-specific guidance
- Contract-first docs call contract-first highly recommended, especially for larger/public/shared API contexts.
- Router-first docs frame router-first as fast iteration fit for internal/private APIs and prototypes.
- Router-first docs explicitly say if API is public/shared or needs strict change control, contract-first is usually better.
Inference:
- A blanket router-first default across all layers is not aligned with oRPC’s own recommended boundary conditions.

### Fact set B: router-to-contract is useful, but has trade-offs
- oRPC shows `router.$contract` / `toContractRouter(...)` patterns.
- Docs list disadvantages: implementation-bound contract shape, possible exposure of unnecessary details, metadata limitations.
Inference:
- Router-first can be safe for leaf/internal modules, but direct promotion to public contract boundary needs governance gates.

### Fact set C: Inngest durable ingress semantics differ from caller API semantics
- `serve()` docs define runtime endpoint duties (`GET` introspection, `PUT` registration, `POST` execution).
- Durable Endpoints docs still mark feature as public beta and document limitations (flow control, POST body, custom status handling constraints).
Inference:
- Inngest ingress should not replace first-party caller-trigger API boundaries in this architecture.

### Fact set D: Durable execution semantics are step-oriented
- `createFunction` and step primitives (`step.run`, `step.invoke`) are durability/runtime controls.
Inference:
- Workflow execution code should stay Inngest-native; router-first discussion applies mainly to trigger boundary/wrappers, not durable engine internals.

## 7) Question-by-Question Working Answers

### Q1) Pure/internal packages
- Yes, router-first can reduce overhead for internal package procedures that are not external SDK boundaries.
- Keep contract clarity by requiring exported normalized contract artifacts before composition.

### Q2) API plugins
- Router-first improves operation-first ergonomics, but only if boundary policy is preserved.
- For externally exposed or policy-heavy surfaces, contract-first remains safer default.

### Q3) Workflows
- Trigger APIs: contract-first (or router-first with mandatory contract normalization) is needed for stable external shape.
- Workflow wrappers/internal orchestration helpers: router-first-style ergonomics can help.
- Durable execution handlers remain Inngest-native regardless.

### Q4) Where contract-first still makes sense
- Public/shared APIs.
- Any namespace contributing to generated external SDK/OpenAPI guarantees.
- Surfaces needing strict metadata/version/governance control.

### Q5) Canonical definitions in this repo
- Contract-first: contract artifact first, router implementation second, boundary ownership explicit.
- Router-first: define router/procedures first, derive contract from router as needed.
- Deliberate hybrid: router-first in leaf internals; contract-first at external/policy boundary surfaces.

### Q6) Auto-composition coherence if leaf modules favor router-first
- Coherent if composition consumes a normalized descriptor (`contract + router + optional functions`) and rejects ambiguous surfaces.
- Non-regression guard: no derived/internal contract is directly used as external SDK source without boundary normalization.

## 8) Candidate Decision
Recommended posture: **Adjust default to deliberate hybrid**, not full global router-first switch.
- Keep contract-first default at boundary surfaces.
- Allow router-first default in internal leaf modules where external contract drift risk is low.
- Keep split harness unchanged (oRPC boundary, Inngest durability).

## 9) Non-Regression Checklist
- [x] One external SDK source (composed oRPC/OpenAPI) retained.
- [x] `/api/inngest` remains runtime ingress only.
- [x] Workflow triggers stay explicit caller-trigger oRPC surfaces.
- [x] No second first-party trigger authoring path introduced.
- [x] Internal call policy can remain deterministic (internal client wrappers).
