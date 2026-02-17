# SESSION_019c587a — Agent K Recommendation (Position C)

## Executive Decision (Strict Standard)
Adopt a **single default internal calling standard**: internal server-side callers use the capability’s **in-process oRPC internal client wrapper** (`packages/<capability>/src/client.ts`) for cross-boundary calls. Keep domain packages transport-neutral, keep workflow triggers distinct from Inngest ingress, and keep one runtime-owned Inngest client instance.

This preserves the canonical constraints already locked in session docs while removing the practical “four ways to call” drift risk.

## 1) Normative Standard (MUST/SHOULD)

### 1.1 External Client Generation (Single Standard)
1. **MUST** generate external SDKs from one composed boundary contract tree only: `packages/core/src/orpc/hq-router.ts` (extended to include workflow trigger namespaces), exposed via `/api/orpc/openapi.json`.
2. **MUST NOT** generate external SDKs from package-internal contracts.
3. **SHOULD** keep OpenAPI generation using one shared TypeBox converter helper (not duplicated per package).

Why:
- `hqContract` is already the aggregate contract root (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`).
- Runtime already generates OpenAPI from a composed router (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`).

### 1.2 Internal Calling (Single Default + Explicit Exceptions)
1. **Default MUST**: cross-boundary internal calls go through `create<Capability>InternalClient(context)`.
2. **MUST NOT** call local HTTP endpoints (`/rpc`, `/api/orpc`) from in-process server code.
3. **MUST NOT** use ad hoc alternative oRPC invocation styles (`router.call`, `contract.call`, `createContractRouterClient`) in production runtime code.
4. **MUST NOT** call `inngest.send` directly from API boundary handlers.
5. **Allowed exceptions**:
- Tests may use `router.call`/`contract.call` in test-only files.
- Migration shims may temporarily wrap legacy call styles only in explicitly named adapter files (with deletion target).

Why:
- oRPC server-side docs explicitly expose multiple invocation options; without a default, teams drift.
- Session canon already mandates one internal router + one internal client per domain package (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:9`).

### 1.3 Workflow Placement Boundary (Package vs Runtime Plugin)
1. **Domain packages (`packages/<capability>`) MUST NOT** define Inngest serve endpoints or host mounts.
2. **Domain packages SHOULD** contain pure domain logic + internal oRPC contract/router/client only.
3. **Workflow runtime artifacts MUST** live in workflow runtime layer:
- preferred: `plugins/workflows/<capability>-workflows/src/{contract.ts,router.ts,functions/*,index.ts}`
- acceptable shared runtime integration: `packages/*-inngest` for reusable adapter/compiler logic
4. **Workflow trigger routers MUST** remain separate from Inngest ingress.

Why:
- Canonical doc already enforces transport-neutral domain packages and split trigger vs ingress (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:23`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:35`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`).

### 1.4 Inngest Client Placement + Trigger Ownership
1. **MUST** create exactly one runtime Inngest client instance per process at host composition edge.
2. **MUST** mount Inngest execution ingress only at `/api/inngest` in host app.
3. **MUST** treat workflow trigger routers as the owner of enqueue semantics (`inngest.send`).
4. **MUST** treat Inngest function modules as the owner of durable execution semantics (`createFunction`, `step.run`, `step.invoke`, `step.sendEvent`).

Current code alignment:
- Host already creates bundle once and mounts ingress (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts:105`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts:111`).
- Inngest adapter already encapsulates client+functions creation (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination-inngest/src/adapter.ts:99`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination-inngest/src/adapter.ts:207`).

## 2) API-Exposed Workflow Trigger Overlap Rule
When a workflow trigger is API-exposed, there is still only **one trigger contract/router owner** (workflow plugin/runtime layer).

1. API plugin may expose wrapper procedures for external ergonomics/auth policy.
2. Those wrappers **must delegate** to the workflow trigger internal client.
3. API plugin **must not** define a second direct `inngest.send` path for the same trigger.
4. Visibility remains explicit per trigger procedure (`internal` default, explicit `external` promotion).

This preserves one business trigger path while allowing boundary-specific auth and shape adaptation.

## 3) Call Path Canonical Matrix (Anti-Fragmentation)
| Caller intent | Canonical path | Disallowed alternatives |
| --- | --- | --- |
| Domain/API/workflow code needs capability action | `packages/<capability>/src/client.ts` internal client | direct HTTP self-call; random `router.call`; direct plugin import across plugins |
| Need to trigger workflow run | workflow trigger router (`/api/workflows/<capability>/*`) via internal client | direct `inngest.send` from arbitrary API/service modules |
| Workflow-to-workflow orchestration | Inngest-native (`step.invoke` / `step.sendEvent`) | direct runtime plugin-to-plugin import |
| Inngest runtime execution | `/api/inngest` ingress + registered functions | caller-trigger API misuse as ingress substitute |
| External client use | generated SDK from composed OpenAPI | package-internal contract SDK generation |

## 4) Required Axes Resolution

### Axis A: External Client Generation
- Single standard: composed boundary tree only (`hqContract` + workflow trigger namespaces), emitted as OpenAPI from one endpoint.

### Axis B: Internal Clients/Internal Calling
- Single default: in-process internal client wrapper.
- Clean exceptions: tests + temporary migration adapters only.

### Axis C: Context Creation/Propagation
- Edge creates `RequestContext` in `registerOrpcRoutes`.
- Capability packages expose context factories to derive `CapabilityContext`.
- Workflow triggers receive `WorkflowTriggerContext` (auth + enqueue dependencies).
- Inngest functions receive event context and map trace/correlation through runtime adapter.

### Axis D: Errors/Logging/Observability
- Boundary returns/throws oRPC-typed errors (`ORPCError`) only.
- Trigger enqueue failures map to one stable error code family (for example `RUN_QUEUE_FAILED`).
- Workflow run state/timeline written in one adapter path (existing coordination runtime pattern).

### Axis E: Middleware/Cross-Cutting
- Boundary middleware: auth, visibility guard, rate limit, request policy.
- Workflow runtime: retries, idempotency behavior, concurrency controls.
- Domain internals: validation + invariants, minimal boundary policy.

## 5) Concrete Location + Wiring (No Black Box)

### 5.1 Keep/Add these ownership boundaries
1. `packages/<capability>/src/contract.ts`
- internal package contract only.
2. `packages/<capability>/src/router.ts`
- internal router only (transport-neutral).
3. `packages/<capability>/src/client.ts`
- **the** internal calling API for that capability.
4. `plugins/workflows/<capability>-workflows/src/contract.ts`
- trigger contract (capability-relative paths).
5. `plugins/workflows/<capability>-workflows/src/router.ts`
- trigger router owning enqueue semantics.
6. `plugins/workflows/<capability>-workflows/src/functions/*`
- `createFunction` handlers with `step.*` orchestration.
7. `apps/server/src/rawr.ts`
- create one Inngest bundle and mount `/api/inngest`.
8. `apps/server/src/orpc.ts`
- mount `/rpc` + `/api/orpc`, expose OpenAPI, inject request context.

### 5.2 Immediate tightening for current codebase
1. Move direct queueing concern behind a workflow trigger surface, then call that surface from boundary handlers instead of direct `queueCoordinationRunWithInngest` use in general API paths.
2. Centralize TypeBox standard-schema + OpenAPI converter in one shared package and import from contracts + host generator.
3. Enforce internal-call lint/policy: forbid direct `Inngest.send` outside workflow trigger modules and runtime adapters.

## 6) Why this is the best Position C answer
- It preserves the session’s strongest architectural choices (clear split of trigger API vs ingress, package purity, no plugin runtime cross-imports).
- It resolves the concrete DX risk Agent H identified (manual wiring + repeated client setup) without reopening boundary decisions.
- It converts oRPC’s intentionally flexible internal invocation API surface into one deterministic team rule.
- It gives a single place to reason about workflow trigger behavior, auth gating, and observability.

## Sources
### Required local inputs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`

### Official / upstream web sources
- [oRPC server-side clients](https://orpc.dev/docs/client/server-side)
- [oRPC context](https://orpc.dev/docs/context)
- [oRPC middleware](https://orpc.dev/docs/middleware)
- [oRPC OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler)
- [oRPC RPC handler](https://orpc.dev/docs/rpc-handler)
- [Inngest TypeScript Inngest client](https://www.inngest.com/docs/reference/typescript/inngest)
- [Inngest quick start (serve route)](https://www.inngest.com/docs/learn/inngest-quick-start)
- [Inngest serve reference](https://www.inngest.com/docs/reference/serve)
- [Inngest create function](https://www.inngest.com/docs/reference/functions/create)
- [Inngest step.run](https://www.inngest.com/docs/reference/functions/step-run)
- [Inngest step.invoke](https://www.inngest.com/docs/reference/functions/step-invoke)
- [Elysia lifecycle](https://elysiajs.com/essential/life-cycle)
- [Elysia mount pattern](https://elysiajs.com/patterns/mount)
- [TypeBox repository/docs](https://github.com/sinclairzx81/typebox)
- [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0)
