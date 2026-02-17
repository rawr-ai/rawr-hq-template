# SESSION_019c587a — ORPC + Inngest/Workflows Posture Spec (Converged)

## 1) Scope + Locked Decision

### Scope
This document is the standalone canonical posture for how this system composes:
- oRPC boundary APIs,
- workflow trigger APIs,
- Inngest durable execution,
- optional Durable Endpoint ingress adapters,
under TypeBox + oRPC + Elysia + Inngest.

This is a policy/spec artifact, not a migration checklist.

### Locked Decision (Accepted)
1. Keep split semantics between API boundary and durable execution; reject full runtime-surface collapse.
2. Use **oRPC as primary API harness** (contracts, routers, OpenAPI, external client generation).
3. Use **Inngest functions as primary durability harness** (durable orchestration, retries, step semantics).
4. Treat **Inngest Durable Endpoints as additive ingress adapters only**, never as a second first-party trigger authoring path.

### Original Tensions Explored
1. Collapse into one plugin/surface for simplicity vs preserve semantic correctness across non-equivalent runtime models.
2. Enable flexible internal calling styles vs enforce one deterministic default to prevent drift.
3. Reduce composition boilerplate vs avoid hiding ownership and runtime boundaries.
4. Reuse one client-generation path vs introduce ingress-specific behaviors that weaken contract guarantees.

## 2) Axes Catalog

Axes researched and locked in this posture:
1. External client generation.
2. Internal clients/internal calling.
3. Split vs collapse posture.
4. Context creation and propagation.
5. Errors/logging/observability.
6. Middleware/cross-cutting concerns.
7. Host hooking/composition.
8. Workflows vs APIs boundaries.
9. Durable Endpoints vs durable functions posture.

## 3) Per-Axis Policy

### Axis 1: External Client Generation
**Policy**
1. External SDK/client generation MUST come from one composed boundary oRPC/OpenAPI surface.
2. Package-internal contracts MUST NOT be used for external SDK generation.

**Why**
- One contract tree preserves stable external semantics and prevents drift.
- Runtime already exposes one OpenAPI artifact path from composed router state.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`
- oRPC: [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [OpenAPI client](https://orpc.dev/docs/openapi/client), [OpenAPI spec](https://orpc.dev/docs/openapi/openapi-specification)

**Trade-offs**
- Trade-off: some internal contracts remain intentionally unexposed.
- Material impact: acceptable; this is the point of preserving boundary ownership.

### Axis 2: Internal Clients/Internal Calling
**Policy**
1. Default internal cross-boundary calls MUST use capability in-process internal clients (`packages/<capability>/src/client.ts`).
2. Server runtime code MUST NOT self-call local HTTP (`/rpc`, `/api/orpc`) for in-process calls.
3. Boundary handlers SHOULD NOT directly call `inngest.send` unless they are designated workflow trigger routers.

**Why**
- Prevents “four ways to call” drift and preserves deterministic call intent.
- Keeps transport-neutral domain/package semantics.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
- Agent K: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md:19`
- oRPC: [Server-side clients](https://orpc.dev/docs/client/server-side)

**Trade-offs**
- Trade-off: slightly less flexibility for ad hoc call shortcuts.
- Material impact: positive; consistent invocation semantics outweigh flexibility.

### Axis 3: Split vs Collapse
**Policy**
1. Split is retained as canonical: API boundary and durability harness are distinct.
2. Full collapse into one surface is rejected.

**Why**
- External API contract semantics and durable execution semantics are non-equivalent.
- Inngest ingress/runtime behavior should not define first-party API contract behavior.

**References**
- Agent J: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md:3`
- Integrated synthesis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md:51`
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve), [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)

**Trade-offs**
- Trade-off: two harnesses remain.
- Material impact: acceptable because responsibilities are non-overlapping and intentional.

### Axis 4: Context Creation/Propagation
**Policy**
1. Request context MUST be created at oRPC ingress and injected per request.
2. Durable run context MUST be derived from event payload + runtime adapter in Inngest execution.
3. Correlation metadata SHOULD be propagated from trigger boundary to durable run payload/timeline.

**Why**
- Request lifecycle and durable run lifecycle are distinct execution models.
- Explicit propagation keeps trace continuity without conflating context types.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:41`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:314`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:91`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:175`
- Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle)

**Trade-offs**
- Trade-off: two context envelopes instead of one universal object.
- Material impact: non-issue; execution semantics require this distinction.

### Axis 5: Errors/Logging/Observability
**Policy**
1. API boundary errors MUST use oRPC typed error semantics (`ORPCError` + status/code).
2. Durable execution state MUST be recorded as run/timeline lifecycle events in runtime adapter.
3. Trigger-to-run correlation SHOULD be attached to trace links and persisted status.

**Why**
- Request-response errors and asynchronous run lifecycle errors serve different operators and clients.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:80`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:200`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:149`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:298`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:333`

**Trade-offs**
- Trade-off: two reporting shapes (API errors vs run/timeline status).
- Material impact: intended; each shape matches its operational surface.

### Axis 6: Middleware/Cross-Cutting Concerns
**Policy**
1. Boundary/API middleware (auth, shape validation, visibility, rate policy) MUST live in oRPC/Elysia boundary layer.
2. Durable runtime controls (retry, idempotency behavior, step boundaries, concurrency policy) MUST live in Inngest function configuration/implementation.
3. Shared policy logic MAY be reused, but application points MUST remain harness-specific.

**Why**
- These are distinct policy planes; collapsing them causes surprising behavior.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:214`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:253`
- oRPC: [Middleware](https://orpc.dev/docs/middleware)
- Inngest: [Step run](https://www.inngest.com/docs/reference/functions/step-run), [Create function](https://www.inngest.com/docs/reference/functions/create)

**Trade-offs**
- Trade-off: middleware is not literally one stack.
- Material impact: acceptable; prevents policy conflation.

### Axis 7: Host Hooking/Composition
**Policy**
1. Host MUST mount oRPC endpoints and Inngest ingress as separate explicit mounts.
2. Host MUST own Inngest client/function bundle composition and pass client into oRPC context where enqueue bridge is needed.
3. Host SHOULD keep parse-safe forwarding semantics for oRPC handler mounts.

**Why**
- Explicit host wiring prevents hidden coupling and clarifies harness boundaries.

**References**
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:105`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`

**Trade-offs**
- Trade-off: host has explicit multi-mount configuration.
- Material impact: low; explicitness is desired.

### Axis 8: Workflows vs APIs Boundaries
**Policy**
1. Workflow trigger APIs MUST remain caller-trigger surfaces distinct from Inngest execution ingress.
2. API-exposed workflow triggers MUST be authored as oRPC procedures that dispatch into Inngest durable execution.
3. Durable execution functions MUST remain Inngest function definitions.

**Why**
- Preserves single trigger story for callers and single durability story for runtime.

**References**
- Agent I: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md:6`
- Integrated synthesis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md:61`
- Canonical baseline: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`

**Trade-offs**
- Trade-off: trigger authoring remains explicit rather than inferred.
- Material impact: beneficial for policy clarity and auth visibility.

### Axis 9: Durable Endpoints vs Durable Functions
**Policy**
1. Durable functions are canonical for first-party durable workflow execution.
2. Durable Endpoints MAY be used only as additive ingress adapters for non-overlapping ingress needs.
3. Durable Endpoints MUST NOT create a parallel first-party trigger authoring path for the same capability behavior.

**Why**
- Maintains single contract path for caller-facing APIs while allowing targeted ingress flexibility.

**References**
- Inngest: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints), [Functions](https://www.inngest.com/docs/reference/functions/create), [Serve](https://www.inngest.com/docs/reference/serve)
- Agent I: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md:9`

**Trade-offs**
- Trade-off: not all ingress styles collapse into one code shape.
- Material impact: minimal; this avoids semantic drift and client confusion.

## 4) Rules and Boundaries (Normative)

### Hard Rules (MUST / MUST NOT / SHOULD)
1. **MUST** keep `/api/inngest` as Inngest runtime ingress only.
2. **MUST** keep caller-triggered workflow APIs on oRPC workflow trigger surfaces (for example `/api/workflows/<capability>/*`).
3. **MUST** use composed oRPC/OpenAPI as the only external SDK generation source.
4. **MUST** keep one runtime-owned Inngest client bundle per process in host composition.
5. **MUST** keep domain packages transport-neutral (no host mounts, no Inngest serve ingress definitions in domain package internals).
6. **MUST** preserve TypeBox-first schema flow for oRPC contract I/O and OpenAPI conversion path.
7. **MUST NOT** introduce a second first-party trigger authoring path for the same workflow capability behavior.
8. **MUST NOT** call local HTTP endpoints from in-process server code as internal-call default.
9. **MUST NOT** use direct `inngest.send` from arbitrary API boundary modules for behaviors that have canonical workflow trigger routers.
10. **SHOULD** centralize shared TypeBox schema adapter + OpenAPI converter helper usage.
11. **SHOULD** use typed surface/composer helpers to reduce manual composition drift when available.

### Explicit Anti-Dual-Path Policy
Dual path is disallowed unless capabilities are truly non-overlapping by contract and runtime behavior.

Allowed non-overlapping example (explicit):
1. `packages/<capability>/src/client.ts` internal client path handles synchronous in-process capability calls.
2. Inngest event/function path handles durable asynchronous orchestration (`client.send`, `createFunction`, `step.run`).

This pair is allowed because intents are distinct; they are not two authoring paths for the same caller-facing trigger surface.

## 5) Implementation Inventory / Glue Code

### Canonical File Inventory

Runtime/host glue (existing):
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- Builds router from `hqContract`, injects `RawrOrpcContext`, mounts `/rpc*` and `/api/orpc*`, generates OpenAPI with TypeBox converter.

2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
- Creates runtime adapter and Inngest bundle, mounts `/api/inngest`, then registers oRPC routes.

3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
- Aggregate contract root (`hqContract`) for composed API namespaces.

4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`
- Inngest serve handler factory, run queue bridge, durable function definition, step/timeline lifecycle.

Capability canonical ownership (policy-level, from converged debate outputs):
1. `packages/<capability>/src/{contract.ts,router.ts,client.ts}`
- Internal contract/router/client.
2. `plugins/api/<capability>-api/src/{contract.ts,router.ts,index.ts}`
- Boundary API surface.
3. `plugins/workflows/<capability>-workflows/src/{contract.ts,router.ts,functions/*,index.ts}`
- Workflow trigger + durable function surface.
4. Optional additive ingress only:
- `plugins/workflows/<capability>-workflows/src/durable/*` for Durable Endpoint adapters (no first-party trigger replacement).

### Canonical File Tree

```text
apps/server/src/
  rawr.ts                # host composition and mounts
  orpc.ts                # oRPC handlers, context, OpenAPI generation
packages/core/src/orpc/
  hq-router.ts           # aggregate oRPC contract root
packages/coordination-inngest/src/
  adapter.ts             # Inngest client/serve/function/queue bridge
packages/<capability>/src/
  contract.ts            # internal package contract
  router.ts              # internal package router
  client.ts              # internal package client (default internal call path)
plugins/api/<capability>-api/src/
  contract.ts            # boundary API contract
  router.ts              # boundary API router
  index.ts               # composed API surface export
plugins/workflows/<capability>-workflows/src/
  contract.ts            # workflow trigger contract
  router.ts              # workflow trigger router
  functions/*            # durable function definitions
  durable/*              # optional additive durable endpoint adapters only
  index.ts               # composed workflow surface export
```

### Glue Boundaries and Ownership
1. Host app owns mount boundaries and runtime wiring.
2. oRPC layer owns boundary contract exposure and request context.
3. Workflow trigger routers own enqueue semantics.
4. Inngest functions own durable step execution semantics.
5. Domain packages own reusable capability logic and internal client contract.

### Optional Composition Helpers (Explicit, Non-Black-Box)
These helpers are optional DX simplifiers and do not change semantic policy:
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/composition/capability-composer.ts`
- `defineCapability(...)` and `composeCapabilities(...)` compose one capability list into `{ orpc, inngest }` manifest shape.
- Wiring point: imported by `rawr.hq.ts`, replacing repeated manual contract/router/functions merge blocks.
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/composition/surfaces.ts`
- `defineApiSurface(...)` and `defineWorkflowSurface(...)` enforce surface shape at plugin export boundaries.
- Wiring point: imported by `plugins/api/*/src/index.ts` and `plugins/workflows/*/src/index.ts`.
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/orpc/with-internal-client.ts`
- `withInternalClient(...)` standardizes internal client binding in handlers.
- Wiring point: imported by API/workflow router modules where repeated `create<Capability>InternalClient(context)` allocation exists.

## 6) End-to-End Examples

### Example A: External API -> Internal Package Client Path
Caller intent: non-durable boundary action that maps to package capability logic.

```ts
// plugins/api/invoice-processing-api/src/router.ts
import { implement } from "@orpc/server";
import { createInvoiceInternalClient, type InvoicePackageContext } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract";

export type InvoiceApiContext = InvoicePackageContext;

export function createInvoiceApiRouter() {
  const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(async ({ context, input }) => {
      const internal = createInvoiceInternalClient(context);
      return internal.start({ invoiceId: input.invoiceId, requestedBy: input.requestedBy });
    }),
  });
}
```

Harness used:
- API harness: oRPC.
- Durable harness: none in this path.

### Example B: External API -> Workflow Trigger -> Inngest Durable Execution
Caller intent: trigger durable workflow run.

```ts
// workflow trigger router (caller-facing trigger surface)
// plugins/workflows/invoice-processing-workflows/src/router.ts
import { implement } from "@orpc/server";
import type { Inngest } from "inngest";
import { invoiceWorkflowTriggerContract } from "./contract";

type WorkflowTriggerContext = {
  inngest: Inngest;
  canCallInternal: boolean;
};

export function createInvoiceWorkflowTriggerRouter() {
  const os = implement<typeof invoiceWorkflowTriggerContract, WorkflowTriggerContext>(invoiceWorkflowTriggerContract);

  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      if (!context.canCallInternal) throw new Error("Procedure triggerInvoiceReconciliation is internal");
      await context.inngest.send({
        name: "invoice.reconciliation.requested",
        data: { runId: input.runId },
      });
      return { accepted: true };
    }),
  });
}
```

```ts
// durable function execution surface
// plugins/workflows/invoice-processing-workflows/src/functions/index.ts
import type { Inngest } from "inngest";

export function createInvoiceWorkflowFunctions(inngest: Inngest) {
  const reconcile = inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: "invoice.reconciliation.requested" },
    async ({ event, step }) => {
      await step.run("invoice/reconcile", async () => {
        // durable work here
        return { runId: event.data.runId, ok: true };
      });
      return { ok: true as const };
    },
  );

  return [reconcile] as const;
}
```

Harness used:
- Trigger API harness: oRPC.
- Durable execution harness: Inngest functions.

### Example C: Non-Workflow Normal Endpoint (oRPC-only)
Caller intent: fetch runtime state (no workflow enqueue, no durable orchestration).

```ts
// apps/server/src/orpc.ts (state namespace)
state: os.state.router({
  getRuntimeState: os.state.getRuntimeState.handler(async ({ context }) => {
    const state = await getRepoState(context.repoRoot);
    return { state };
  }),
}),
```

Harness used:
- API harness: oRPC only.
- Durable harness: none.

### Host Mounting and Harness Use (Explicit)

```ts
// apps/server/src/rawr.ts
const inngestBundle = createCoordinationInngestFunction({ runtime });
const inngestHandler = createInngestServeHandler({
  client: inngestBundle.client,
  functions: inngestBundle.functions,
});

app.all("/api/inngest", async ({ request }) => inngestHandler(request));

registerOrpcRoutes(app, {
  repoRoot: opts.repoRoot,
  baseUrl: opts.baseUrl ?? "http://localhost:3000",
  runtime,
  inngestClient: inngestBundle.client,
});
```

Where each harness is used:
1. `registerOrpcRoutes(...)` -> caller-facing API harness (oRPC, OpenAPI, context injection).
2. `/api/inngest` handler -> durability execution ingress harness (Inngest serve/runtime).

## 7) Source Anchors

### Local decision lineage
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md`

### Upstream references
1. oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract), [Implement](https://orpc.dev/docs/contract-first/implement-contract), [RPC handler](https://orpc.dev/docs/rpc-handler), [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [Server-side clients](https://orpc.dev/docs/client/server-side)
2. Inngest: [Serve](https://www.inngest.com/docs/reference/serve), [Create function](https://www.inngest.com/docs/reference/functions/create), [Step run](https://www.inngest.com/docs/reference/functions/step-run), [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
3. Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle), [Mount](https://elysiajs.com/patterns/mount)
4. TypeBox: [Repository/docs](https://github.com/sinclairzx81/typebox)
