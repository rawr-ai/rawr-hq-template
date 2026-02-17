# SESSION_019c587a — Agent I Recommendation (Position A)

## Decision
Keep `plugins/api/*` and `plugins/workflows/*` as separate plugin types.

Standardize overlap to one mandatory path:
1. If a workflow trigger is API-exposed, it is always authored as an **oRPC procedure** (contract + router).
2. That oRPC trigger always dispatches into **Inngest durable execution** (event send / function invoke).
3. Inngest Durable Endpoints are **additive ingress adapters only**, not a second authoring path for first-party trigger APIs.

This preserves split ownership while eliminating “pick your own path” drift.

## Why This Still Holds With Newer Inngest + oRPC
- oRPC is strongest as the API contract and client-generation harness (contract-first, dual transport handlers, OpenAPI generation, server-side clients).
- Inngest is strongest as the durable orchestration harness (durable step semantics, function retries, event/schedule execution).
- Durable Endpoints are useful, but the official docs still call out current constraints (including flow-control/body/status limitations), which makes them a poor primary replacement for typed API triggers.

Sources:
- Inngest Durable Endpoints: [docs](https://www.inngest.com/docs/features/durable-endpoints)
- Inngest Functions: [docs](https://www.inngest.com/docs/features/inngest-functions)
- Inngest serve endpoint: [docs](https://www.inngest.com/docs/reference/serve)
- oRPC contract-first: [define](https://orpc.dev/docs/contract-first/define-contract), [implement](https://orpc.dev/docs/contract-first/implement-contract)
- oRPC handlers + OpenAPI: [RPC handler](https://orpc.dev/docs/rpc-handler), [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [OpenAPI spec](https://orpc.dev/docs/openapi/openapi-specification), [OpenAPI client](https://orpc.dev/docs/openapi/client), [server-side calls](https://orpc.dev/docs/client/server-side-calls)

## Explicit Placement (Required)
| Capability Surface | Primary Location | Harness | Route/Mount | Authoring Rule |
| --- | --- | --- | --- | --- |
| Normal endpoints | `plugins/api/<capability>-api/src/{contract.ts,router.ts}` | oRPC | `/api/orpc/*` (and `/rpc/*` internal transport) | Always contract-first oRPC |
| Workflow-trigger APIs | `plugins/workflows/<capability>-workflows/src/{contract.ts,router.ts}` | oRPC -> Inngest bridge | `/api/workflows/<capability>/*` | Always oRPC trigger that dispatches to Inngest |
| Durable functions | `plugins/workflows/<capability>-workflows/src/functions/*` | Inngest | Served via `/api/inngest` execution ingress | Always Inngest function definitions |
| Durable endpoints | `plugins/workflows/<capability>-workflows/src/durable/*` (or equivalent adapter module) | Inngest Durable Endpoint | Host-mounted ingress-only path (not `/api/workflows/*`) | Never used as first-party trigger API replacement |

Inference: this keeps one standardized API-trigger story while still allowing Durable Endpoints where they add value (webhook-style ingress).

## Primary vs Additive Harness
- Primary harness for API surfaces and clients: **oRPC**.
- Primary harness for durable orchestration: **Inngest functions**.
- Additive harness: **Inngest Durable Endpoints** for special ingress cases only.

This matches current runtime separation:
- oRPC boundary/router + OpenAPI generation in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`.
- Inngest ingress mounted separately at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`.
- Inngest execution handler/function wiring in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:103` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:207`.

## Axes Evaluation (Required)

### 1) External client generation (single standardized approach)
Standard:
- All external client generation comes from oRPC/OpenAPI surfaces only.
- Workflow triggers that are externally callable are still oRPC procedures and therefore remain in the same OpenAPI/client toolchain.

Concrete wiring:
- Continue OpenAPI generation via `OpenAPIGenerator` + schema converter path in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`.
- Ensure workflow-trigger routers are part of the composed oRPC contract tree (as already defined in canonical proposal at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:122`).

### 2) Internal clients/internal calling (single rule or clean combo rule)
Clean combo rule:
1. API/plugin-internal synchronous calls use oRPC in-process router clients.
2. Cross-workflow async orchestration uses Inngest-native calls (`step.invoke` / `step.sendEvent`).

Concrete wiring:
- Keep/expand in-process client wrappers (canonical package policy).
- For workflow triggers, route handler dispatches to Inngest only through one shared helper module, e.g. `packages/core/src/workflows/dispatch.ts`.

### 3) Context creation/propagation
Standard:
- Create request context at oRPC ingress.
- Propagate correlation/auth metadata to Inngest event payload.
- Rehydrate into run status/timeline for end-to-end traceability.

Concrete wiring:
- Context currently created in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:314`.
- Run trace links and timeline persistence already exist in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:157` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:163`.
- Harden by adding explicit `requestId/actorId` propagation contract in workflow trigger input metadata.

### 4) Errors/logging/observability
Standard:
- API boundary errors normalized in oRPC (`ORPCError` codes/statuses).
- Workflow execution errors normalized in run status/timeline.
- Bridge must always stamp correlation IDs.

Concrete wiring:
- API error normalization already in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:80`.
- Workflow failure capture and timeline events already in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:200` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:253`.

### 5) Middleware/cross-cutting concerns
Standard split:
- HTTP/API concerns (auth, input shape, rate limits, CORS, API visibility gates) live in oRPC/Elysia boundary.
- Durable execution concerns (retries, idempotency, concurrency, debounce/throttle semantics) live in Inngest function definitions/config.

Why this matters:
- Collapsing these into one surface conflates two different policy planes and weakens least-surprise behavior.

## Migration Implications From Current Canonical Proposal
Current canonical proposal already enforces most split semantics (`/api/workflows/*` vs `/api/inngest`) in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:14` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`.

To harden to one standard path:
1. Remove Path A exception as default practice for API plugins; enforce boundary-owned oRPC authoring only.
   - Canonical doc currently retains Path A exception at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:76`.
2. Keep workflow triggers in workflow plugins, but mandate they are always oRPC trigger routers (no alternate durable-endpoint trigger path).
3. Promote Agent H simplification helpers to reduce manual wiring without collapsing surfaces:
   - `capability-composer.ts` (`Proposal 1`)
   - `surfaces.ts` typed builders (`Proposal 2`)
   - shared TypeBox/OpenAPI converter (`Proposal 4`)
   - Ref: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:31`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:130`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:268`.
4. Keep host ingress split as-is:
   - `/api/orpc*` and `/rpc*` in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`
   - `/api/inngest` in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`

## Counterarguments to Collapse

### Counterargument A: “Collapse into Inngest Durable Endpoints everywhere”
Why it fails:
- Weakens unified external client-generation path versus oRPC/OpenAPI.
- Durable Endpoints docs currently list limitations, which is a poor fit for canonical first-party API trigger semantics.
- Collapses API middleware concerns and durable-runtime concerns into one tool.

Where it can win:
- Narrow webhook ingress adapters where producer control is low and no client SDK contract is required.

### Counterargument B: “Collapse into oRPC only; no workflow plugins”
Why it fails:
- Loses durable-execution-first model (step durability/retries/orchestration semantics become ad hoc).
- Pushes long-running/retry policy into request/response layer.

Where it can win:
- Truly synchronous, short-lived tasks that are not workflows.

### Counterargument C: “Merge API + workflow plugin types into one capability plugin”
Why it fails:
- Blurs ownership and increases accidental coupling.
- Reintroduces policy drift between boundary and orchestration concerns.

Where it can win:
- Very small prototypes with one or two trivial capabilities, where governance overhead dominates.

## Recommendation Summary
Yes, keep split surfaces.

Harden the model by standardizing overlap to one rule:
- API-exposed workflow triggers are always oRPC-authored and mounted under `/api/workflows/<capability>/*`.
- Those triggers always dispatch into Inngest durable functions/events.
- Durable Endpoints remain additive ingress adapters only, never a parallel first-party trigger authoring path.

This delivers clearer boundaries, preserves best-in-class strengths of each harness, and reduces drift via a single overlap contract.
