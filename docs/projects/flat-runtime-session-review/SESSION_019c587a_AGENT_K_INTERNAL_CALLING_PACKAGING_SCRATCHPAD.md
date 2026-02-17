# SESSION_019c587a Agent K — Internal Calling + Packaging Scratchpad

## Working Notes
- This document records skill introspection notes, source evidence, and decision tradeoffs.
- Conclusions are provisional until all required inputs + web validation are completed.

## Skills Introspection Notes

### `orpc` SKILL
- Default pattern is contract-first (`@orpc/contract` + `implement()`), with contract as first-class artifact.
- The same router can be exposed via `RPCHandler` and `OpenAPIHandler`; route-prefix/body parsing alignment is a known pitfall.
- Monorepo guidance favors clear contract package vs implementation/runtime adapters.
- Internal reliability concerns (timeouts/retries/headers) should be centralized in client/link setup, not repeated per caller.
- Testing guidance emphasizes no-network tests and drift checks against contracts.

### `inngest` SKILL
- Inngest is durable execution; step memoization means handler code can replay while `step.*` boundaries avoid duplicate side effects.
- Stable step IDs are mandatory for correctness; top-level side effects are risky.
- Recommended architecture keeps workflow definitions as durable units and adapters at app edges.
- Central worker service is the default recommendation unless ownership boundaries justify split endpoints.
- Security/reliability defaults (signing keys, flow control primitives) should be standardized, not caller-specific.

### `elysia` SKILL
- Elysia is fetch-native and plugin/lifecycle order-sensitive; registration order matters for hooks/middleware effects.
- Cross-framework handoff requires `parse: 'none'` to avoid consumed request bodies.
- Schema-first validation + typed status returns are preferred for predictable error surfaces.
- Runtime integrations should keep transport concerns at edge and avoid leaking them into domain packages.

### `typebox` SKILL
- TypeBox is JSON-Schema-first: schema artifacts should be reusable contracts, not runtime-local definitions.
- OpenAPI 3.1 alignment is preferred when JSON Schema fidelity matters.
- Validator compilation should happen once centrally (startup/module init), not ad hoc in call sites.
- Avoid accidental dual track between `typebox` and `@sinclair/typebox`.

### `typescript` SKILL
- Choose boundaries first (inside domain invariants vs outside I/O orchestration).
- Use one consistent error strategy per subsystem; avoid mixed exception/union handling without clear boundary mapping.
- Quarantine unknown/input parsing at boundaries; keep internal calls strongly typed and minimal-surface.
- Compiler-guided incremental refactors are preferred over big-bang rewrites.

### `architecture` SKILL
- Keep current-state, target-state, and migration-transition artifacts separated.
- Resolve architecture decisions in dependency order: spine → boundaries → domain.
- Make ambiguity explicit via decision packets; avoid implicit “hybrid soup.”
- Every bridge/abstraction needs explicit deletion target to prevent permanent transitional complexity.

### `web-search` SKILL
- Use source-map methodology: official docs first, then corroborating sources.
- Triangulate critical claims across primary and secondary sources.
- Prefer structured scraping/search workflow over ad hoc browsing.
- Record source-specific breadcrumbs to prevent unsupported “black-box” claims.

## Required Input Notes

### SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E
- Locked defaults already encode Position C spine: one internal router + one in-process client per domain package, split workflow trigger API (`/api/workflows/*`) from Inngest ingress (`/api/inngest`), and disallow plugin-to-plugin runtime imports (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:9`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:14`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:17`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:113`).
- Workflows policy already expects a dual surface from workflow plugins: trigger router + Inngest functions (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:101`).
- Composition currently central/manual and merges both oRPC and Inngest surfaces (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:116`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:123`).

### SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW
- Confirms current direction but highlights wiring duplication and repeated client creation as top DX risks (`SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:10`, `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:13`).
- Reinforces keeping trigger-vs-ingress split unchanged (`SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:16`).
- Proposes helper abstractions (`composeCapabilities`, typed surfaces, `withInternalClient`) to reduce manual variability (`SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:31`, `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:130`, `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:369`).

### apps/server/src/orpc.ts
- Current runtime router implementation sits at app layer and wires package contracts into one router (`apps/server/src/orpc.ts:104`, `apps/server/src/orpc.ts:107`).
- Runtime context currently carries both storage/runtime adapter and `inngestClient`, which allows direct enqueue from API procedure handlers (`apps/server/src/orpc.ts:41`, `apps/server/src/orpc.ts:45`, `apps/server/src/orpc.ts:163`, `apps/server/src/orpc.ts:187`).
- Local TypeBox OpenAPI converter lives in app route module (duplication risk) (`apps/server/src/orpc.ts:282`).
- Routes expose both RPC and OpenAPI handlers with `parse: "none"` guard (correct Elysia interop) (`apps/server/src/orpc.ts:339`, `apps/server/src/orpc.ts:359`).

### packages/core/src/orpc/hq-router.ts
- `hqContract` is an aggregate contract over capability contracts; currently limited to coordination + state namespaces (`packages/core/src/orpc/hq-router.ts:5`).
- This makes it the natural single source for external client generation once workflow trigger namespaces are folded in.

### Supplemental local context (target worktree)
- Host route registration creates Inngest bundle once and passes same client to `/api/inngest` handler + oRPC context (`apps/server/src/rawr.ts:105`, `apps/server/src/rawr.ts:111`, `apps/server/src/rawr.ts:117`).
- `coordination-inngest` package exposes `createInngestClient`, `createInngestServeHandler`, queue helper, and `createFunction` wiring; this is runtime-integration package behavior, not pure domain logic (`packages/coordination-inngest/src/adapter.ts:99`, `packages/coordination-inngest/src/adapter.ts:103`, `packages/coordination-inngest/src/adapter.ts:123`, `packages/coordination-inngest/src/adapter.ts:207`).
- TypeBox adapter logic is currently duplicated in package contracts (`packages/coordination/src/orpc/schemas.ts:268`, `packages/state/src/orpc/contract.ts:41`).

## Web Research Notes (Official/Upstream)

### oRPC
- Server-side clients are explicitly intended for server internal usage and monorepos with separate contract/server/client packages.
  - https://orpc.dev/docs/client/server-side
- oRPC exposes multiple internal invocation styles (`createRouterClient`, `createContractRouterClient`, `router.call`, `contract.call`), which confirms fragmentation risk if not standardized.
  - https://orpc.dev/docs/client/server-side
- Context should be created at adapter boundary and can be extended via middleware.
  - https://orpc.dev/docs/context
  - https://orpc.dev/docs/middleware
- OpenAPI and RPC handlers are first-class dual exposure model.
  - https://orpc.dev/docs/openapi/openapi-handler
  - https://orpc.dev/docs/rpc-handler

### Inngest
- Recommended setup centers on a single exported Inngest client used to define functions and send events.
  - https://www.inngest.com/docs/reference/typescript/inngest
- Default route for serving functions is `/api/inngest` (or equivalent) via framework adapter.
  - https://www.inngest.com/docs/learn/inngest-quick-start
  - https://www.inngest.com/docs/reference/serve
- Durable execution guidance: place non-deterministic/side-effectful work in `step.run`; cross-function orchestration uses `step.invoke`/events.
  - https://www.inngest.com/docs/reference/functions/step-run
  - https://www.inngest.com/docs/reference/functions/step-invoke
  - https://www.inngest.com/docs/reference/functions/create

### Elysia
- Lifecycle order is registration-sensitive; transport handoff routes should avoid body pre-consumption.
  - https://elysiajs.com/essential/life-cycle
  - https://elysiajs.com/patterns/mount

### TypeBox / OpenAPI
- TypeBox positions schemas as runtime JSON Schema artifacts with static inference.
  - https://github.com/sinclairzx81/typebox
- OpenAPI 3.1 aligns with JSON Schema 2020-12, supporting JSON-schema-first contract strategy.
  - https://spec.openapis.org/oas/v3.1.0

## Decision Matrix by Axis

### Axis 1: External Client Generation
- Evidence:
  - `hqContract` already aggregates capability contracts (`packages/core/src/orpc/hq-router.ts:5`).
  - Host currently generates OpenAPI from runtime router (`apps/server/src/orpc.ts:282`).
  - oRPC supports dual handlers from one router (official docs).
- Provisional decision:
  - Standardize on one external source: composed boundary contract tree (`hqContract` + workflow trigger namespaces), published through OpenAPI.
  - No external client generation from package-internal contracts.

### Axis 2: Internal Calling
- Evidence:
  - Canonical session already mandates internal package client wrapper (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:52`).
  - oRPC offers multiple internal invocation APIs (official docs), so standardization is needed.
  - Current runtime queue path directly calls Inngest adapter from API handler (`apps/server/src/orpc.ts:187`).
- Provisional decision:
  - Default internal caller path = capability internal client wrapper (`packages/<capability>/src/client.ts`) for cross-boundary in-process calls.
  - Ban ad hoc alternative styles (`router.call`, direct `inngest.send`, direct package-runtime adapter calls) outside explicit owner modules.

### Axis 3: Context Propagation
- Evidence:
  - Current app-level context includes runtime + inngest client (`apps/server/src/orpc.ts:41`).
  - Agent H recommends capability-owned context factories (`SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md:208`).
  - oRPC context docs favor adapter-created initial context and middleware refinement.
- Provisional decision:
  - Edge builds `RequestContext`; package factories map to `CapabilityContext`; workflow trigger context is separate (`canCallInternal`, actor, correlation IDs) and not reused blindly.

### Axis 4: Errors/Observability
- Evidence:
  - Runtime throws `ORPCError` with explicit status codes (`apps/server/src/orpc.ts:80`, `apps/server/src/orpc.ts:96`).
  - Coordination runtime tracks run status/timeline and trace links around queue/send path (`apps/server/src/orpc.ts:200`, `packages/coordination-inngest/src/adapter.ts:150`, `packages/coordination-inngest/src/adapter.ts:175`).
  - Inngest durable guidance expects step-scoped effects and deterministic retry behavior.
- Provisional decision:
  - Keep one error taxonomy at boundary (oRPC codes) and one run lifecycle telemetry contract for workflows.
  - Trigger procedures should record queue attempts/failures uniformly and avoid duplicate logging across layers.

### Axis 5: Middleware/Cross-cutting
- Evidence:
  - Canonical policy separates API/trigger boundary from ingress (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`).
  - oRPC middleware supports auth/guard/context injection.
  - Inngest handles retries/concurrency/throttle primitives at workflow layer.
- Provisional decision:
  - Boundary middleware owns auth/visibility/rate-limit.
  - Workflow layer owns retries/idempotency/timeouts.
  - Domain package internal router keeps minimal policy (input validation + invariant checks), no host-specific auth/routing middleware.

## Open Questions to Resolve in Recommendation
- Should workflow trigger routers always live in `plugins/workflows/*` or can runtime-integration packages host them when no separate plugin exists yet?
- How strict should the ban list be for internal invocation styles to prevent “four ways to call” while preserving test ergonomics?
- Should queueing helpers like `queueCoordinationRunWithInngest` be private to workflow trigger adapters vs exported utility API?
