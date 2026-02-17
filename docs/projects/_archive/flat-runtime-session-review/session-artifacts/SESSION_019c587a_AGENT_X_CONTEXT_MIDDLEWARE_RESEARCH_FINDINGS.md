# SESSION_019c587a — Agent X Context+Middleware Research Findings

## 1) Executive Findings
1. Keep two context envelopes by design:
- oRPC request context for caller-triggered APIs.
- Inngest function context for durable execution.
- Do not force a single universal context object across both harnesses.
2. Keep two middleware control planes by design:
- Boundary middleware for auth/visibility/network/policy checks.
- Durable runtime middleware and `step.*` controls for retries and execution lifecycle.
3. Keep route split explicit and enforced:
- `/api/workflows/*` is caller-facing trigger/status surface.
- `/api/inngest` is runtime ingress for Inngest `serve()` only.
4. Make middleware dedup explicit:
- Request once at host boundary.
- Context-cached/idempotent procedure middleware in oRPC.
- Function-run lifecycle hooks in Inngest with retry-safe side effects.

## 2) Detailed Findings

### 2.1 oRPC Context + Middleware
1. oRPC formally distinguishes initial context (provided at handle/call) and execution context (added through middleware), and supports combining both in one procedure chain.
2. Middleware can depend on context, mutate context through `next({ context })`, inspect input, and transform output.
3. Contract-first implementation uses `implement(contract)` and `os.router(...)` to enforce shape and runtime behavior consistently.
4. Server-side clients (`call`, `.callable`, `createRouterClient`) are first-class, which supports in-process composition without local HTTP self-calls.

### 2.2 oRPC Handler + Host Integration
1. Both `RPCHandler` and `OpenAPIHandler` accept per-request `context` at `handle(...)`.
2. Prefix alignment matters (`prefix` must match mounted route surface).
3. Elysia adapter guidance explicitly recommends `parse: "none"` for forwarded handler routes to avoid consumed-body errors.

### 2.3 oRPC Middleware Dedup Boundary
1. Manual dedupe pattern is context-based (middleware stores/reads already-computed dependency in context before redoing expensive work).
2. Built-in dedupe only applies when router-level middlewares are leading subset in identical order; this is narrower than “automatic dedupe everywhere”.

### 2.4 Inngest Context + Steps + Middleware
1. `serve()` owns runtime ingress and is the mechanism for function registration/invocation over HTTP.
2. `createFunction` handler context exposes `event`, `step`, `runId`, `logger`, `attempt` and related runtime values.
3. `step.run` is durable/retriable and independently retried per step ID.
4. Middleware lifecycle (`onFunctionRun`, `onSendEvent`, `transformInput`, `transformOutput`, etc.) allows typed dependency injection and instrumentation hooks.

### 2.5 Inngest Instrumentation
1. Built-in traces are always present.
2. Extended traces are OpenTelemetry-based and middleware-driven, with import-order caveats for auto instrumentation.

### 2.6 Trigger vs Runtime Split
1. Inngest docs show sending events from application routes and serving runtime callbacks at `/api/inngest`.
2. This aligns with packet policy that trigger/status APIs are caller-facing while runtime ingress is isolated.

## 3) Source-to-Claim Mapping

| Source | Supports |
| --- | --- |
| https://orpc.dev/docs/context | Initial vs execution context model and combined usage. |
| https://orpc.dev/docs/middleware | Middleware context/input/output transformations and dependency context requirements. |
| https://orpc.dev/docs/procedure | Procedure chain model, middleware application, validation order notes. |
| https://orpc.dev/docs/contract-first/define-contract | Contract-first artifact and contract router design. |
| https://orpc.dev/docs/contract-first/implement-contract | `implement(contract)` and enforced `os.router(...)` implementation flow. |
| https://orpc.dev/docs/client/server-side | `.callable`, `call`, router clients, server-side context passing. |
| https://orpc.dev/docs/rpc-handler | Handler integration, prefix/context injection, lifecycle/interceptors. |
| https://orpc.dev/docs/openapi/openapi-handler | OpenAPI surface integration with `handle(..., { prefix, context })`. |
| https://orpc.dev/docs/adapters/elysia | Elysia mounting with `parse: "none"` guidance for forwarded handlers. |
| https://orpc.dev/docs/best-practices/dedupe-middleware | Manual dedupe pattern and built-in dedupe constraints. |
| https://www.inngest.com/docs/reference/serve | Runtime ingress contract and `/api/inngest` method behavior. |
| https://www.inngest.com/docs/reference/functions/create | Function configuration/trigger/handler context model. |
| https://www.inngest.com/docs/reference/functions/step-run | Durable step semantics and independent retries. |
| https://www.inngest.com/docs/features/middleware | Middleware purpose and registration locations (client/function). |
| https://www.inngest.com/docs/reference/middleware/lifecycle | Hook model, `transformInput`/`transformOutput`, `finished` caveats. |
| https://www.inngest.com/docs/features/middleware/dependency-injection | Typed context injection into function handler args. |
| https://www.inngest.com/docs/events | Event sending model from application code and trigger behavior. |
| https://www.inngest.com/docs/getting-started/nextjs-quick-start | Concrete split pattern: app routes send events; `/api/inngest` serves runtime. |
| https://www.inngest.com/docs/platform/monitor/traces | Built-in/AI/extended trace layers. |
| https://www.inngest.com/docs/reference/typescript/extended-traces | Extended tracing middleware usage and import-order requirements. |

## 4) Open Questions (Must Stay Explicit)
1. Should this packet lock a canonical import-order pattern for `extendedTracesMiddleware()` in shared host bootstrap modules?
- Caveat: docs require early initialization for full auto instrumentation.
2. Should packet policy mandate explicit context-cached dedupe markers for heavy oRPC middleware, instead of relying on built-in dedupe heuristics?
- Caveat: built-in dedupe has strict ordering/subset preconditions.
3. Should function-finalization hooks (`finished`) be restricted to idempotent/non-critical side effects in examples?
- Caveat: docs state hook execution is not guaranteed exactly once.

## 5) Recommendations Applied in E2E_04
1. Model shared contracts and context types in explicit `context.ts` modules.
2. Use TypeBox-first schemas with static types in same file and `typeBoxStandardSchema as std` in snippets.
3. Keep host mounts explicit and split (`/api/workflows/*` vs `/api/inngest`).
4. Include a middleware dedup boundary section with run-once/per-request/per-run semantics and caveats.
