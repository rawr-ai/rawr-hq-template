# SESSION_019c587a — Agent I Scratchpad (Position A)

## Skill Introspection Notes (Required)

### `orpc`
- Contract-first model is explicit: contract artifact + `implement()` + transport handlers.
- Same procedure surface can be exposed via RPC and OpenAPI handlers; transport choice can be standardized.
- Strong warning about drift and route/prefix mismatches; this is relevant to enforcing one overlap path.

### `inngest`
- Core value is durable execution with step memoization and resumability.
- Boundary guidance: side effects should be inside durable step boundaries.
- Good fit for long-running/retry/human-in-loop orchestration, not as a replacement for general API transport semantics.

### `elysia`
- HTTP runtime and lifecycle middleware chain are first-class.
- Fetch-based adaptation makes it suitable as an edge adapter for oRPC handlers and other runtimes.
- Order/scoping/middleware behavior must be explicit to avoid accidental policy gaps.

### `typebox`
- JSON Schema artifacts are first-class and portable.
- Useful as a schema contract backbone when exposing APIs externally.
- OpenAPI 3.1 alignment supports standardized external client generation paths.

### `typescript`
- Keep boundaries explicit and encode invariants at module seams.
- Prefer one stable API contract surface over many optional authoring variants.
- Compiler-guided migrations favor incremental adapter hardening over system collapse rewrites.

### `architecture`
- Separate current state, target state, and migration plan artifacts.
- Resolve spine decisions first (orchestration/composition), then boundaries, then domain details.
- Require concrete pointers and deletion targets for transitional bridges.

### `web-search`
- Build a source map and triangulate authoritative sources.
- Use official docs + upstream repositories as primary evidence.
- Record conflicts and unresolved questions explicitly.

## Axes-First Research Frame (Built Before Deep Doc Read)

### Position A Baseline
Keep plugin types split:
- API plugin = request/response contract and transport boundary.
- Workflow plugin = durable orchestration and event/schedule/async execution boundary.

But remove optional overlap ambiguity by defining one mandatory bridge for workflow triggers exposed through APIs.

### Evaluation Matrix
1. External client generation:
   - Which harness should own typed SDK/OpenAPI generation for external consumers?
   - Can this be single-path with no plugin-author choice?
2. Internal calling:
   - How do API handlers call workflows (or vice versa) without duplicate clients and policy drift?
   - Is there a single call contract for internal use?
3. Context propagation:
   - What context is created at ingress and how does it propagate to durable runs?
   - How are auth/request/trace identities preserved?
4. Errors/observability:
   - How are errors normalized at API boundaries vs workflow run boundaries?
   - What telemetry model links request spans to durable run spans?
5. Middleware/cross-cutting:
   - Which concerns stay at HTTP middleware layer (auth/rate/cors)?
   - Which concerns are workflow-level policies (retries/idempotency/concurrency)?

## Source Map Seed
- Local required docs/code (session analyses + current oRPC wiring).
- Official Inngest docs (durable execution + durable endpoint semantics).
- Official oRPC docs (contract-first, transports, OpenAPI/client generation).
- Elysia + TypeBox official references only where needed for adapter/schema implications.

## Open Questions To Resolve
- Should workflow-trigger APIs always enter through oRPC, with Inngest as downstream durable harness?
- Where do durable endpoints sit: API plugin edge, workflow plugin edge, or both with strict ownership rules?
- How should canonical proposal migration change if split is kept but overlap path is standardized?

## Required Local Input Notes

### Canonical package proposal (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`)
- Already defines the split semantics explicitly:
  - workflow trigger API: `/api/workflows/<capability>/...`
  - Inngest execution ingress: `/api/inngest` only.
  - Ref: lines 14, 42-43.
- Keeps API plugin default as boundary-owned Path B with narrow Path A reuse exception.
  - Ref: lines 63-90.
- Sets workflow-trigger visibility default to `internal` with explicit external promotion.
  - Ref: lines 106-107.
- Composition stays centralized in `rawr.hq.ts` with merged `orpc.contract`, `orpc.router`, and `inngest.functions`.
  - Ref: lines 122-125.

### Agent H review (`SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`)
- Recommends simplification without collapsing surfaces:
  - capability composer, typed surface builders, shared TypeBox converter, context factory, internal-client binder.
  - Ref: lines 31, 130, 208, 268, 369.

### Current runtime wiring (`apps/server/src/orpc.ts`)
- Current oRPC host already demonstrates:
  - contract-first implementation (`implement<typeof hqContract, RawrOrpcContext>(hqContract)`).
  - context-bound handler wiring.
  - OpenAPI generation path with TypeBox `__typebox` converter.
  - RPC and OpenAPI handler mounts (`/rpc`, `/api/orpc`).
  - Ref: lines 105, 282-296, 339-377.

### Current root contract (`packages/core/src/orpc/hq-router.ts`)
- Single top-level oRPC contract namespace currently merges coordination + state.
  - Ref: lines 5-8.

## Additional Runtime Context (Current Repo)
- Inngest ingress is mounted directly at host boundary (`/api/inngest`) in `apps/server/src/rawr.ts`.
  - Ref: lines 105-113.
- Inngest execution harness in `packages/coordination-inngest/src/adapter.ts`:
  - `createInngestServeHandler(...)` wraps `serve(...)`.
  - `createCoordinationInngestFunction(...)` defines durable function via `client.createFunction(...)`.
  - Queueing API sends events into Inngest (`client.send(...)`).
  - Ref: lines 103-107, 207-240, 175-183.

## Web Research Notes (Official / Upstream)

### Inngest
- Durable Endpoints are an Inngest feature for wrapping HTTP endpoints with durable semantics, but documented caveats include:
  - flow control not currently supported,
  - `POST` request body not currently supported,
  - custom status code handling currently limited.
  - Source: https://www.inngest.com/docs/features/durable-endpoints
- Inngest functions are durable, event/schedule/cron-triggered, and compose with `step.run`/`step.sendEvent`/`step.invoke`.
  - Source: https://www.inngest.com/docs/features/inngest-functions
- Standard serve endpoint pattern is still explicit host ingress (`serve(...)`, commonly `/api/inngest` in framework examples).
  - Source: https://www.inngest.com/docs/reference/serve
  - Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start

### oRPC
- Contract-first workflow is first-class (`define-contract` + `implement-contract`).
  - Source: https://orpc.dev/docs/contract-first/define-contract
  - Source: https://orpc.dev/docs/contract-first/implement-contract
- oRPC supports dual transport handlers (`RPCHandler` and `OpenAPIHandler`) over one router surface.
  - Source: https://orpc.dev/docs/rpc-handler
  - Source: https://orpc.dev/docs/openapi/openapi-handler
- OpenAPI generation can be produced directly from a router and supports schema conversion hooks (matches local `ConditionalSchemaConverter` usage).
  - Source: https://orpc.dev/docs/openapi/openapi-specification
- Internal calling can be standardized with server-side router clients (`createRouterClient` / JSONified router client forms).
  - Source: https://orpc.dev/docs/client/server-side-calls
- External SDK generation is supported via OpenAPI client generation from `OpenAPIHandler`-compatible specs.
  - Source: https://orpc.dev/docs/openapi/client

## Position A Working Thesis (Pre-write)
- Keep split plugin types because oRPC and Inngest remain orthogonal strengths:
  - oRPC excels at API contract + transport + client generation.
  - Inngest excels at durable orchestration + retries + evented execution semantics.
- Standardize overlap to one path:
  - workflow-trigger APIs are always oRPC boundary procedures,
  - those procedures enqueue/invoke Inngest durable execution,
  - Inngest Durable Endpoints are additive-only, not a second authoring default.
- Migration should harden shape validation and composition wiring, not collapse harnesses.
