# Session 019c587a — Agent J Collapse/Unify Scratchpad

## 0) Skill Introspection Notes (Mandatory)

### oRPC skill notes
- Contract-first is recommended baseline: shared contract artifact + `implement()` for handlers.
- One router can be exposed through dual transports (RPC + OpenAPI handlers).
- Keep prefix/mount boundaries precise to avoid adapter mismatch.
- OpenAPI path is strongest for external typed client generation; RPC path excels for internal TS-to-TS calls.

### Inngest skill notes
- Inngest is durable execution, not general request router.
- Durable semantics depend on step boundaries and stable step IDs.
- Serve endpoint is an adapter boundary that receives events/schedules and executes durable workflows.
- Best model tends to separate synchronous API ingress from durable orchestration execution.

### Elysia skill notes
- Elysia supports composable fetch handlers and route mounting.
- Lifecycle/hook order matters; body parsing can conflict with mounted handlers if not configured.
- Good host for both oRPC adapters and Inngest serve endpoint, but semantics differ by mounted surface.

### TypeBox skill notes
- JSON Schema artifacts are strongest when treated as portable contract modules.
- OpenAPI 3.1 alignment helps external contract generation.
- Validation and contract generation should be centralized, avoiding per-surface drift.

### TypeScript skill notes
- Preserve clear module boundaries and avoid “hybrid soup.”
- Use explicit domain/application vs adapter boundaries.
- Prefer consistent error/result strategy and typed envelopes across boundaries.

### Architecture skill notes
- Separate current state / target state / transition docs.
- Resolve spine decisions first (orchestration model), then boundary behavior.
- Any bridge abstraction must have explicit deletion or steady-state rationale.

### Web-search skill notes
- Use official docs first, triangulate with upstream repos where needed.
- Build source map and retain evidence breadcrumbs for each major claim.

## 1) Axes-First Evaluation Grid (Pre-read)

### Axis A: External client generation
- Hypothesis to test: single contract source can still expose durable triggers cleanly.

### Axis B: Internal clients/internal calls
- Hypothesis to test: one call rule may break when durable side effects require event semantics.

### Axis C: Context propagation
- Hypothesis to test: request context and run context can share an envelope but not lifecycle semantics.

### Axis D: Errors/logging/observability
- Hypothesis to test: one error taxonomy can map to both HTTP and async run outcomes.

### Axis E: Middleware/cross-cutting
- Hypothesis to test: shared policies can be centralized, while durability-specific controls remain adapter-local.

## 2) Source Map (to fill)
- Local docs/code: pending deep read.
- Upstream official docs: pending fetch.

## 3) Open Questions
- Should “durable endpoint” be represented as API endpoint facade + Inngest trigger, or as first-class same-shape procedure?
- If collapse is pursued, what is the primary harness and what becomes additive adapter?

## 4) Local Evidence Notes (Required inputs)

### SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md
- Canonical policy explicitly splits workflow trigger API (`/api/workflows/<capability>/...`) from Inngest execution ingress (`/api/inngest`) and labels ingress as machine endpoint only.
- Workflow plugin model already separates trigger router from Inngest functions (`triggerRouter` + `functions`).
- Composition model in `rawr.hq.ts` merges oRPC contract/router and Inngest functions as distinct artifacts.
- Host mounting semantics keep independent registrations (`registerOrpcRoutes` + `registerInngestRoute`).

### SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md
- Simplification guidance recommends reducing composition boilerplate but explicitly keeps split between workflow triggers and Inngest ingress.
- Proposal set favors typed composer helpers, shared TypeBox adapter, and context factory extraction — not semantic surface collapse.

### apps/server/src/orpc.ts
- oRPC router is contract-first via `implement<typeof hqContract, RawrOrpcContext>(hqContract)`.
- Two handlers are mounted from one router (`RPCHandler`, `OpenAPIHandler`) with distinct prefixes and shared context.
- OpenAPI schema generation uses TypeBox metadata converter (`__typebox`) via `ConditionalSchemaConverter`.
- `coordination.queueRun` route triggers durable execution by sending events through Inngest client (`queueCoordinationRunWithInngest`), while returning API-shaped response.

### packages/core/src/orpc/hq-router.ts
- Root contract composition is explicit and clean: one oRPC contract tree (`coordination`, `state`) used by host handlers.

### Additional runtime wiring (supporting)
- `apps/server/src/rawr.ts` mounts `/api/inngest` separately with `createInngestServeHandler(...)` and mounts oRPC routes via `registerOrpcRoutes(...)`.
- `packages/coordination-inngest/src/adapter.ts` shows strict durable semantics:
  - `serve()` endpoint wrapper for Inngest runtime calls.
  - event-driven enqueue via `client.send(...)`.
  - durable function execution with `createFunction(..., { event: ... }, ...)` and step-bound persistence via `step.run(...)`.

## 5) Upstream Source Map (Official)

### oRPC
- Contract-first + implementer pattern: https://orpc.dev/docs/contract-first/define-contract, https://orpc.dev/docs/contract-first/implement-contract
- Dual handler model with explicit prefixes/context:
  - RPC handler: https://orpc.dev/docs/rpc-handler
  - OpenAPI handler: https://orpc.dev/docs/openapi/openapi-handler
- External OpenAPI client link: https://orpc.dev/docs/openapi/client/openapi-link
- Internal server-side client patterns (`createRouterClient`, callable/call): https://orpc.dev/docs/client/server-side
- Elysia adapter guidance including parser caveat (`parse: 'none'`): https://orpc.dev/docs/adapters/elysia

### Inngest
- Serve endpoint model and `/api/inngest` default path: https://www.inngest.com/docs/learn/serving-inngest-functions
- `serve()` internals (`GET` metadata, `POST` invoke, `PUT` register): https://www.inngest.com/docs/reference/serve
- Durable execution semantics and step/request model: https://www.inngest.com/docs/learn/how-functions-are-executed
- Step semantics (`step.run` retry + persisted success state): https://www.inngest.com/docs/learn/inngest-steps
- Function creation trigger model (`event` / `cron`): https://www.inngest.com/docs/reference/functions/create
- Event send API return shape (`ids`): https://www.inngest.com/docs/reference/events/send
- Durable endpoints behavior + current limitations (beta): https://www.inngest.com/docs/learn/durable-endpoints

### Elysia
- Lifecycle ordering and hook scope behavior: https://elysiajs.com/essential/life-cycle
- Mount/interoperability via Fetch handlers: https://elysiajs.com/patterns/mount

### TypeBox
- JSON Schema-first runtime + static type alignment (maintainer repo): https://github.com/sinclairzx81/typebox

## 6) Axes Scorecard (Evidence-based)

### Axis A: External client generation (single standardized approach)
- Observation:
  - oRPC provides one contract that can be exposed via RPC and OpenAPI handlers.
  - OpenAPI client path is standardized with `OpenAPILink`.
  - Durable endpoints (Inngest) introduce redirect-on-retry behavior and beta limitations (no flow control, POST body not yet supported), which are not naturally represented in a normal oRPC/OpenAPI procedure contract.
- Assessment:
  - Full collapse into one API surface weakens client contract clarity.
  - Best standard: keep oRPC/OpenAPI as external client contract source; represent durable execution as trigger-style API procedures.

### Axis B: Internal clients/internal calling (single rule or clean combo rule)
- Observation:
  - oRPC server-side internal calls are first-class via `createRouterClient`.
  - Durable execution path is event-triggered (`inngest.send`) and function-triggered (`createFunction`), not direct request/response invocation.
- Assessment:
  - One universal call rule is not semantically valid.
  - Clean combo rule is viable: synchronous internal logic via oRPC/domain services; durable execution via Inngest events/functions.

### Axis C: Context creation/propagation
- Observation:
  - oRPC context is injected per HTTP handler invocation (`RawrOrpcContext`).
  - Inngest runtime context is reconstructed from event + step execution context and run metadata.
  - Elysia lifecycle and parsing behavior are route/hook-order dependent.
- Assessment:
  - Shared context envelope can exist at capability dependency layer, but request context and durable-run context are not interchangeable.

### Axis D: Errors/logging/observability
- Observation:
  - oRPC path uses typed/structured HTTP errors (`ORPCError`) and request-level response semantics.
  - Durable path uses run state transitions, step retries, timeline persistence, and trace links.
  - Durable endpoints can return redirect behavior on retry path, which changes consumer handling model.
- Assessment:
  - A single error semantic surface would blur important operational distinctions.
  - Better to map between two consistent models rather than force one model.

### Axis E: Middleware/cross-cutting concerns
- Observation:
  - oRPC has handler plugins/interceptors and Elysia route middleware/hook ordering.
  - Inngest has function-level durability controls; durable endpoints currently miss flow-control support.
- Assessment:
  - Full middleware collapse is not presently coherent across all three endpoint classes.
  - Shared policy modules should be reused, but adapter application points remain separate.

## 7) Provisional Decision
Reject full collapse into one API plugin surface for all three endpoint semantics.

Rationale:
- It increases semantic leakage (client behavior, context, errors, middleware) rather than reducing dual-path complexity.
- Existing architecture already has a workable minimal split: one capability composition model with two harnesses (oRPC boundary + Inngest execution).

## 8) Better Alternative (to flesh in final doc)
- Keep one capability descriptor/composition model.
- Keep separate execution harnesses:
  - Primary API harness: oRPC (RPC + OpenAPI exposure).
  - Additive durability harness: Inngest (functions + `/api/inngest` serve endpoint).
- Represent durable execution initiation as explicit trigger procedures in oRPC, not by collapsing execution ingress into standard API surface.
