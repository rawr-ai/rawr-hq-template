# SESSION_019c587a — Agent X Context+Middleware Research Scratchpad

## 0) Scope
- Docs-only task.
- Research first, then author canonical E2E tutorial.
- No runtime/package/plugin implementation changes.

## 1) Skill Intake (Read + Applied)
1. `deep-search`: seeded local map from packet docs, captured breadcrumbs, then synthesized map state.
2. `web-search`: used source-map protocol (official docs first, triangulation, caveats).
3. `orpc`: focused on context/middleware, contract-first, handlers, server-side clients.
4. `inngest`: focused on `serve`, function context/steps, middleware lifecycle, tracing.
5. `elysia`: used for mount boundaries and parse-safe forwarding pattern.
6. `typebox`: enforced TypeBox-first schema artifacts + `Static<typeof Schema>` in same file.

## 2) DeepSearch Breadcrumbs (Local Canonical Rules)
1. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `context.ts` is the default location for shared context contracts.
- TypeBox-first + static types in the same file is locked.
- Snippet alias default is `typeBoxStandardSchema as std`.
- Split semantics are locked: trigger routes separate from `/api/inngest`.
2. `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- Request context and durable run context are separate envelopes.
- Correlation should propagate from trigger boundary into durable payload/timeline.
3. `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- Boundary middleware and durable runtime controls are separate control planes.
4. `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- Trigger APIs are caller surfaces; durable execution remains in Inngest functions.

## 3) Web Source Map (Official + Primary)

### 3.1 oRPC
1. Context model (initial vs execution, combining both):
- https://orpc.dev/docs/context
2. Procedure + middleware chaining and validation order constraints:
- https://orpc.dev/docs/procedure
- https://orpc.dev/docs/middleware
3. Contract-first flow:
- https://orpc.dev/docs/contract-first/define-contract
- https://orpc.dev/docs/contract-first/implement-contract
4. Server-side invocation patterns:
- https://orpc.dev/docs/client/server-side
5. HTTP handler integration and context injection:
- https://orpc.dev/docs/rpc-handler
- https://orpc.dev/docs/openapi/openapi-handler
- https://orpc.dev/docs/adapters/http
- https://orpc.dev/docs/adapters/elysia
6. Middleware dedup semantics (manual + built-in constraints):
- https://orpc.dev/docs/best-practices/dedupe-middleware

### 3.2 Inngest
1. Runtime ingress semantics and `/api/inngest` behavior (`GET`/`POST`/`PUT`):
- https://www.inngest.com/docs/reference/serve
2. Function handler context + durable step APIs:
- https://www.inngest.com/docs/reference/functions/create
- https://www.inngest.com/docs/reference/functions/step-run
3. Middleware lifecycle + dependency injection:
- https://www.inngest.com/docs/features/middleware
- https://www.inngest.com/docs/features/middleware/dependency-injection
- https://www.inngest.com/docs/reference/middleware/lifecycle
4. Triggering model from app routes/events:
- https://www.inngest.com/docs/events
- https://www.inngest.com/docs/getting-started/nextjs-quick-start
5. Instrumentation/tracing:
- https://www.inngest.com/docs/platform/monitor/traces
- https://www.inngest.com/docs/reference/typescript/extended-traces

## 4) Source-Derived Constraints for E2E_04
1. Package layer should own reusable business middleware concerns (idempotent context enrichment, role preconditions), but avoid assuming network/runtime ingress behavior.
2. API plugin boundary should own caller auth/role/network policy and request-scoped context hydration.
3. Workflow trigger router should remain caller-facing and enqueue via `inngest.send`, not execute durable logic inline.
4. Inngest function runtime should own durable semantics (`step.run`, retries, attempt-aware behavior).
5. `/api/workflows/*` and `/api/inngest` must remain explicitly split in host route mounts.
6. Middleware dedup strategy should be explicit:
- request-level once at host boundary,
- procedure-level idempotent middleware in oRPC context,
- run-level hooks in Inngest middleware lifecycle.

## 5) Open Questions (Source-Backed Caveats)
1. Inngest `finished` hook semantics:
- Docs note it may not run on every execution and may run multiple times with parallelism/retries.
- Caveat: finalization/audit side-effects in this hook must be idempotent.
- Source: https://www.inngest.com/docs/reference/middleware/lifecycle
2. Inngest Extended Traces import ordering:
- Docs recommend loading `extendedTracesMiddleware()` before other imports for auto instrumentation.
- Caveat: shared runtime bootstrap patterns must preserve this order or explicitly use extend/manual modes.
- Source: https://www.inngest.com/docs/reference/typescript/extended-traces
3. oRPC built-in middleware dedupe is conditional:
- Works only when router middlewares are leading subset in same order.
- Caveat: cannot rely on implicit dedupe for arbitrary middleware ordering.
- Source: https://orpc.dev/docs/best-practices/dedupe-middleware
