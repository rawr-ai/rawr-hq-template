# SESSION_019c587a — Agent J (Position B) Collapse/Unify Recommendation

## Verdict
Reject full collapse into one API plugin surface.

Short answer to the primary question:
- One surface can share authoring conventions, but cannot coherently collapse regular endpoints, Inngest durable endpoints, and durable-function triggers into a single semantic API boundary without increasing ambiguity.
- Keep one capability composition model, but keep two harnesses: **oRPC as primary API harness** and **Inngest as additive durability harness**.

## Why full collapse fails (evidence-first)

### 1) External client generation breaks as a single standard
Required axis: external client generation.

- oRPC supports a clean single contract exposed via RPC and OpenAPI handlers (`RPCHandler`, `OpenAPIHandler`), and external typed clients through `OpenAPILink`.
  - Local wiring: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`
  - oRPC docs: [RPC Handler](https://orpc.dev/docs/rpc-handler), [OpenAPI Handler](https://orpc.dev/docs/openapi/openapi-handler), [OpenAPI Link](https://orpc.dev/docs/openapi/client/openapi-link)
- Inngest durable endpoints (beta) currently have execution-specific HTTP behavior (redirect on retry) and feature gaps (flow control unsupported, POST body not yet supported).
  - Docs: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
- If durable endpoints are folded into the same external contract surface as regular oRPC procedures, generated-client expectations become inconsistent.

Conclusion: single external client standard should remain oRPC/OpenAPI; durable execution should stay behind trigger contracts and run-status APIs.

### 2) Internal calling cannot be one rule without semantic loss
Required axis: internal clients/internal calling.

- Internal synchronous calls are first-class in oRPC (`createRouterClient`) and current package/client model.
  - Local shape: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
  - oRPC docs: [Server-side client](https://orpc.dev/docs/client/server-side)
- Durable execution is event/run-driven (`client.send`, `createFunction`, `step.run`) and intentionally async/resumable.
  - Local wiring: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:175`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:214`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:253`
  - Docs: [How functions execute](https://www.inngest.com/docs/learn/how-functions-are-executed), [Inngest steps](https://www.inngest.com/docs/learn/inngest-steps), [Events send](https://www.inngest.com/docs/reference/events/send)

Conclusion: clean combo rule beats false unification.
- Rule: call domain/oRPC directly for request-response; trigger durable work via Inngest event/function path.

### 3) Context propagation is structurally different
Required axis: context creation/propagation.

- oRPC request context is constructed per HTTP call (`RawrOrpcContext`) and passed into handlers.
  - Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:41`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:314`
- Inngest run context is reconstructed from event + run + step execution boundaries.
  - Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:91`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:243`
- Elysia lifecycle order and parser behavior already require adapter-specific handling.
  - Docs: [Elysia lifecycle](https://elysiajs.com/essential/life-cycle), [oRPC Elysia adapter](https://orpc.dev/docs/adapters/elysia)

Conclusion: share dependency envelope, not execution context object.

### 4) Error and observability semantics diverge by design
Required axis: errors/logging/observability.

- oRPC path uses request-scoped typed HTTP errors (`ORPCError`) and status returns.
  - Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:80`
- Durable path tracks run-state lifecycle and timeline events (queued/running/completed/failed), plus trace links.
  - Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:150`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:298`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:333`
- Inngest `serve` contract is runtime-facing (`GET` metadata, `POST` invoke, `PUT` register), not generic caller API semantics.
  - Docs: [Serve reference](https://www.inngest.com/docs/reference/serve)

Conclusion: forcing one error/observability envelope obscures critical operational state.

### 5) Middleware/cross-cutting cannot collapse cleanly today
Required axis: middleware/cross-cutting concerns.

- Request middleware (auth/rate policy/schema shaping) fits oRPC/Elysia boundary routes.
- Durable middleware concerns are step/retry/concurrency/idempotency-oriented and attach in Inngest function model.
- Durable endpoints are not feature-parity with full Inngest function flow controls yet.
  - Docs: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints), [Create function](https://www.inngest.com/docs/reference/functions/create)

Conclusion: keep shared policy modules, but distinct adapter application points.

## Primary harness and additive harness (explicit)
- **Primary harness: oRPC**
  - Owns external boundary contract, route shape, and client-generation standard.
  - Local host mount: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`
- **Additive harness: Inngest**
  - Owns durable execution semantics and worker ingress.
  - Local ingress mount: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`

## Better alternative to full collapse
Keep semantic split, collapse only authoring/composition boilerplate.

### Standardized model
1. One capability descriptor/composer API (single registration step).
- Suggested location: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/composition/capability-composer.ts`
- Pattern already proposed in prior review: `defineCapability(...)` + `composeCapabilities(...)`.

2. Capability exports remain dual-surface by semantics.
- `api: { contract, router }` for regular + trigger endpoints.
- `workflows: { triggerContract, triggerRouter, functions }` for durable execution.
- Existing canonical policy basis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`

3. Host wiring remains explicitly split.
- Register API routes with `registerOrpcRoutes(...)`.
- Register Inngest execution ingress at `/api/inngest`.
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`

4. Durable endpoints handling (explicit)
- Treat Inngest durable endpoints as optional, internal/operator-facing adapter, not primary public API contract.
- If used, mount and govern them under workflow execution ownership, not as replacement for oRPC trigger APIs.

5. Durable functions handling (explicit)
- Caller-facing trigger API stays in oRPC.
- Trigger handler emits Inngest events / queue requests and returns accepted/run metadata.
- Current concrete pattern: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:163`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:123`

## Strongest counterargument and rebuttal
Counterargument:
- Inngest durable endpoints allow HTTP-style authoring with durable `step.run`, so we should collapse all endpoint types into one API surface and simplify DX.

Rebuttal:
- Today this increases, not decreases, dual-path complexity for this stack:
  1. Durable endpoints are beta with explicit capability gaps (flow control, POST body support).
  2. Retry/redirect semantics are execution-specific and not equivalent to standard boundary API contracts.
  3. oRPC/OpenAPI remains the stronger standardized contract and external client-generation path.
  4. Local architecture already encodes this split and explicitly warns against collapsing `/api/workflows/*` and `/api/inngest`.
     - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:481`

## Final Position B recommendation
- Reject full one-surface collapse.
- Adopt **single capability authoring/composition model + dual harness execution model** as steady state.
- Keep oRPC boundary contract as the only standardized external client surface; keep Inngest as durable execution substrate, triggered by explicit API procedures.
