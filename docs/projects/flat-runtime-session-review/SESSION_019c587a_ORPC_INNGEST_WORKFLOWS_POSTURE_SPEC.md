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

### Naming Rules (Canonical)
1. Use short, descriptive file names that describe role, not implementation trivia.
2. Canonical defaults:
- `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
3. Internal package layered defaults MAY also include role folders/files:
- `domain/*`, `service/*`, `procedures/*`, `errors.ts`.
4. Keep role context in prose when needed (for example, “workflow trigger router”), not in context-baked file suffixes.
5. Avoid ambiguous generic names in core harness modules.
- Preferred: `capability-composer.ts`, `surfaces.ts`, `with-internal-client.ts`.
- Avoid: unclear names that hide ownership or execution semantics.

### Adoption Exception (Explicit)
Default posture remains boundary-owned contracts + boundary operations.

Allowed exception (explicit, documented):
1. If a boundary is truly 1:1 with an internal package surface, direct adoption is acceptable.
2. When used, document why overlap is truly 1:1.
3. Document what would trigger returning to boundary-owned contracts.

### Scale Rule (Default Progression)
1. Split implementation handlers/operations first.
2. Split contracts only when behavior, policy, or external audience diverges.

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
1. `packages/<capability>/src/{domain/*,service/*,procedures/*,router.ts,client.ts,errors.ts,index.ts}`
- Internal pure capability default (transport-neutral domain/service with explicit internal procedure boundary).
2. `plugins/api/<capability>-api/src/{contract.ts,operations/*,router.ts,index.ts}`
- Boundary API surface (contract-first + explicit boundary operations).
3. `plugins/workflows/<capability>-workflows/src/{contract.ts,operations/*,router.ts,functions/*,index.ts}`
- Workflow trigger surface + durable function surface (split by role).
4. Optional additive ingress only:
- `plugins/workflows/<capability>-workflows/src/durable/*` for Durable Endpoint adapters (no first-party trigger replacement).
5. Host split surface policy:
- Caller-triggered workflow APIs remain on oRPC workflow trigger routes (for example `/api/workflows/<capability>/*`).
- Inngest runtime ingress remains `/api/inngest` only.

### Internal Package Default (Pure Capability)
Use one internal package shape by default:

```text
packages/invoice-processing/src/
  domain/
    invoice.ts
    invoice-status.ts
  service/
    lifecycle.ts
    status.ts
    cancellation.ts
    index.ts
  procedures/
    start.ts
    get-status.ts
    cancel.ts
    index.ts
  router.ts
  client.ts
  errors.ts
  index.ts
```

Role summary:
1. `domain/*`: entities/value objects + invariants only.
2. `service/*`: pure use-case logic with injected deps.
3. `procedures/*`: internal RPC boundary (schema + handler composition).
4. `router.ts`, `client.ts`, `errors.ts`, `index.ts`: package composition and public package surface.

```ts
// packages/invoice-processing/src/procedures/start.ts
import { os, ORPCError } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { startInvoice } from "../service";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const startProcedure = o
  .input(typeBoxStandardSchema(Type.Object({ invoiceId: Type.String(), requestedBy: Type.String() })))
  .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), accepted: Type.Boolean() })))
  .handler(async ({ context, input }) => {
    try {
      return await startInvoice(context.deps, input);
    } catch {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to start invoice" });
    }
  });
```

```ts
// packages/invoice-processing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";

export function createInvoiceInternalClient(context: InvoiceProcedureContext) {
  return createRouterClient(invoiceInternalRouter, { context });
}
```

### Boundary API Plugin Default (Contract-First + Operations)
Default boundary plugin shape keeps operation code explicit:

```text
plugins/api/invoice-api/src/
  contract.ts
  operations/
    start.ts
    get-status.ts
    cancel.ts
  router.ts
  index.ts
```

```ts
// plugins/api/invoice-api/src/operations/start.ts
import type { InvoiceApiContext } from "../router";

export async function startInvoiceOperation(
  context: InvoiceApiContext,
  input: { invoiceId: string; requestedBy: string },
) {
  return context.invoice.start(input);
}
```

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";

type InvoiceApiContext = {
  invoice: { start: (input: { invoiceId: string; requestedBy: string }) => Promise<{ runId: string; accepted: boolean }> };
};

const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

export function createInvoiceApiRouter() {
  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
      startInvoiceOperation(context, input),
    ),
  });
}
```

### Workflow Trigger Plugin + Inngest Split (Recommended)
Keep trigger API and durable execution separate by role:
1. Trigger API: oRPC contract/router for caller-triggered workflow routes (for example `/api/workflows/<capability>/*`).
2. Durable execution: Inngest function definitions mounted at `/api/inngest`.

```text
plugins/workflows/invoice-workflows/src/
  contract.ts
  operations/
    trigger-reconciliation.ts
  router.ts
  functions/
    reconciliation.ts
  index.ts
```

```ts
// plugins/workflows/invoice-workflows/src/operations/trigger-reconciliation.ts
import type { Inngest } from "inngest";

export async function triggerReconciliationOperation(inngest: Inngest, input: { runId: string }) {
  await inngest.send({
    name: "invoice.reconciliation.requested",
    data: { runId: input.runId },
  });
  return { accepted: true as const };
}
```

```ts
// plugins/workflows/invoice-workflows/src/router.ts
import { implement } from "@orpc/server";
import type { Inngest } from "inngest";
import { invoiceWorkflowTriggerContract } from "./contract";
import { triggerReconciliationOperation } from "./operations/trigger-reconciliation";

type InvoiceWorkflowTriggerContext = { inngest: Inngest; canCallInternal: boolean };
const os = implement<typeof invoiceWorkflowTriggerContract, InvoiceWorkflowTriggerContext>(invoiceWorkflowTriggerContract);

export function createInvoiceWorkflowTriggerRouter() {
  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      if (!context.canCallInternal) throw new Error("Procedure is internal");
      return triggerReconciliationOperation(context.inngest, input);
    }),
  });
}
```

```ts
// plugins/workflows/invoice-workflows/src/functions/reconciliation.ts
import type { Inngest } from "inngest";

export function createReconciliationFunction(inngest: Inngest) {
  return inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: "invoice.reconciliation.requested" },
    async ({ event, step }) => {
      await step.run("invoice/reconcile", async () => ({ runId: event.data.runId, ok: true }));
      return { ok: true as const };
    },
  );
}
```

### Required Root Fixtures (Brief, Concrete)
These fixtures are required by this integrated posture. Full runtime internals remain canonical in the harness sections below.

```ts
// packages/orpc-standards/src/index.ts
export { typeBoxStandardSchema } from "./typebox-standard-schema";
```

```ts
// packages/orpc-standards/src/typebox-standard-schema.ts
import type { Schema, SchemaIssue } from "@orpc/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string" || instancePath === "" || instancePath === "/") return undefined;
  return instancePath
    .split("/")
    .slice(1)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

export function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) return { value: value as Static<T> };
        const issues = [...Value.Errors(schema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });
        return { issues: issues.length > 0 ? issues : [{ message: "Validation failed" }] };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
```

```ts
// rawr.hq.ts (composition root fixture)
import { oc } from "@orpc/contract";
import { Inngest } from "inngest";
import { invoiceApiSurface } from "./plugins/api/invoice-api/src";
import { createInvoiceWorkflowSurface } from "./plugins/workflows/invoice-workflows/src";

const inngest = new Inngest({ id: "rawr-hq" });
const invoiceWorkflows = createInvoiceWorkflowSurface(inngest);

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({
      invoicing: {
        api: invoiceApiSurface.contract,
        workflows: invoiceWorkflows.triggerContract,
      },
    }),
    router: {
      invoicing: {
        api: invoiceApiSurface.router,
        workflows: invoiceWorkflows.triggerRouter,
      },
    },
  },
  inngest: { client: inngest, functions: [...invoiceWorkflows.functions] },
} as const;
```

```ts
// apps/server/src/rawr.ts (host fixture)
// Caller-trigger routes stay on oRPC workflow surfaces (for example /api/workflows/<capability>/*).
// Durable runtime ingress stays on /api/inngest.
app.all("/api/inngest", async ({ request }) => inngestHandler(request));
registerOrpcRoutes(app, {
  repoRoot: opts.repoRoot,
  baseUrl: opts.baseUrl ?? "http://localhost:3000",
  runtime,
  inngestClient: inngestBundle.client,
});
```

### Canonical Harness Files (Explicit Code)

#### A) `packages/core/src/orpc/hq-router.ts`

```ts
import { oc } from "@orpc/contract";
import { coordinationContract } from "@rawr/coordination/orpc";
import { stateContract } from "@rawr/state/orpc";

export const hqContract = oc.router({
  coordination: coordinationContract,
  state: stateContract,
});

export type HqContract = typeof hqContract;
```

How it connects:
1. This is the root contract used by server-side router implementation (`apps/server/src/orpc.ts`).
2. External OpenAPI generation is derived from routers implemented against this contract tree.
3. Workflow-trigger namespaces are composed at the runtime composition layer and then mounted through the same oRPC registration path (single boundary harness).

#### B) `packages/coordination-inngest/src/adapter.ts`

```ts
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";
import {
  isSafeCoordinationId,
  validateWorkflow,
  type CoordinationWorkflowV1,
  type JsonValue,
  type RunStatusV1,
} from "@rawr/coordination";
import { createDeskEvent, defaultTraceLinks } from "@rawr/coordination-observability";
import { COORDINATION_RUN_EVENT } from "./browser";

export type CoordinationRuntimeAdapter = Readonly<{
  readMemory: (workflow: CoordinationWorkflowV1, deskId: string) => Promise<unknown>;
  writeMemory: (workflow: CoordinationWorkflowV1, desk: unknown, value: JsonValue) => Promise<void>;
  getRunStatus: (runId: string) => Promise<RunStatusV1 | null>;
  saveRunStatus: (run: RunStatusV1) => Promise<void>;
  appendTimeline: (runId: string, event: unknown) => Promise<void>;
  inngestBaseUrl?: string;
}>;

export type QueueCoordinationRunOptions = Readonly<{
  client: Inngest;
  runtime: CoordinationRuntimeAdapter;
  workflow: CoordinationWorkflowV1;
  runId: string;
  input?: JsonValue;
  baseUrl: string;
}>;

export function createInngestClient(appId = "rawr-coordination"): Inngest {
  return new Inngest({ id: appId });
}

export function createInngestServeHandler(input: { client: Inngest; functions: readonly unknown[] }) {
  return inngestServe({
    client: input.client,
    functions: input.functions as any,
  });
}

export async function queueCoordinationRunWithInngest(options: QueueCoordinationRunOptions) {
  if (!isSafeCoordinationId(options.runId)) {
    throw new Error(`Invalid runId: ${options.runId}`);
  }

  const validation = validateWorkflow(options.workflow);
  if (!validation.ok) {
    const details = validation.errors.map((entry) => entry.message).join("; ");
    throw new Error(`Workflow validation failed: ${details}`);
  }

  const existing = await options.runtime.getRunStatus(options.runId);
  if (existing) return { run: existing, eventIds: [] };

  const queuedRun: RunStatusV1 = {
    runId: options.runId,
    workflowId: options.workflow.workflowId,
    workflowVersion: options.workflow.version,
    status: "queued",
    startedAt: new Date().toISOString(),
    input: options.input ?? {},
    traceLinks: defaultTraceLinks(options.baseUrl, options.runId, {
      inngestBaseUrl: options.runtime.inngestBaseUrl,
    }),
  };

  await options.runtime.saveRunStatus(queuedRun);
  await options.runtime.appendTimeline(
    options.runId,
    createDeskEvent({
      runId: options.runId,
      workflowId: options.workflow.workflowId,
      type: "run.started",
      status: "queued",
      detail: "Coordination run queued for Inngest execution",
      payload: options.input ?? {},
    }),
  );

  const sendResult = await options.client.send({
    name: COORDINATION_RUN_EVENT,
    data: {
      runId: options.runId,
      workflow: options.workflow,
      input: options.input ?? {},
      baseUrl: options.baseUrl,
    },
  });

  return {
    run: await options.runtime.getRunStatus(options.runId),
    eventIds: sendResult.ids,
  };
}

export function createCoordinationInngestFunction(input: {
  runtime: CoordinationRuntimeAdapter;
  client?: Inngest;
  appId?: string;
}) {
  const client = input.client ?? createInngestClient(input.appId);

  const runner = client.createFunction(
    { id: "coordination-workflow-runner", retries: 2 },
    { event: COORDINATION_RUN_EVENT },
    async ({ event, runId, step }) => {
      await step.run("coordination/run-start", async () => {
        await input.runtime.appendTimeline(
          event.data.runId,
          createDeskEvent({
            runId: event.data.runId,
            workflowId: event.data.workflow.workflowId,
            type: "run.started",
            status: "running",
            detail: `Inngest execution started (${runId})`,
          }),
        );
      });
      return { ok: true as const, runId: event.data.runId };
    },
  );

  return {
    client,
    functions: [runner],
  } as const;
}
```

How it connects:
1. `queueCoordinationRunWithInngest(...)` is called by oRPC queue handlers in `apps/server/src/orpc.ts`.
2. `createCoordinationInngestFunction(...)` produces `{ client, functions }`.
3. `createInngestServeHandler(...)` wraps `{ client, functions }` and is mounted by `apps/server/src/rawr.ts` at `/api/inngest`.

#### C) `apps/server/src/orpc.ts`

```ts
import { hqContract } from "@rawr/core/orpc";
import { queueCoordinationRunWithInngest, type CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { implement, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { Inngest } from "inngest";
import type { AnyElysia } from "./plugins";

type RawrOrpcContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};

export type RegisterOrpcRoutesOptions = RawrOrpcContext;

export function createOrpcRouter() {
  const os = implement<typeof hqContract, RawrOrpcContext>(hqContract);

  return os.router({
    coordination: os.coordination.router({
      queueRun: os.coordination.queueRun.handler(async ({ context, input }) => {
        const workflow = input.workflow;
        const runId = typeof input.runId === "string" && input.runId.trim() !== ""
          ? input.runId
          : `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        try {
          return await queueCoordinationRunWithInngest({
            client: context.inngestClient,
            runtime: context.runtime,
            workflow,
            runId,
            input: input.input ?? {},
            baseUrl: context.baseUrl,
          });
        } catch (err) {
          throw new ORPCError("RUN_QUEUE_FAILED", {
            status: 500,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    }),
    state: os.state.router({
      getRuntimeState: os.state.getRuntimeState.handler(async ({ context }) => {
        // local state read path
        return { repoRoot: context.repoRoot };
      }),
    }),
  });
}

async function createOpenApiSpec(router: ReturnType<typeof createOrpcRouter>, baseUrl: string) {
  const typeBoxSchemaConverter: ConditionalSchemaConverter = {
    condition: (schema) => Boolean(schema && typeof schema === "object" && "__typebox" in schema),
    convert: (schema) => {
      const rawSchema = (schema as { __typebox?: unknown }).__typebox;
      if (!rawSchema || typeof rawSchema !== "object") return [false, {}];
      return [true, JSON.parse(JSON.stringify(rawSchema)) as JSONSchema];
    },
  };

  const generator = new OpenAPIGenerator({
    schemaConverters: [typeBoxSchemaConverter],
  });

  return generator.generate(router, {
    info: { title: "RAWR HQ ORPC API", version: "1.0.0" },
    servers: [{ url: baseUrl }],
  });
}

export function registerOrpcRoutes<TApp extends AnyElysia>(app: TApp, options: RegisterOrpcRoutesOptions): TApp {
  const router = createOrpcRouter();
  const rpcHandler = new RPCHandler<RawrOrpcContext>(router);
  const openapiHandler = new OpenAPIHandler<RawrOrpcContext>(router);

  app.get("/api/orpc/openapi.json", async () => {
    const spec = await createOpenApiSpec(router, options.baseUrl);
    return new Response(JSON.stringify(spec), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  });

  app.all("/rpc", async (ctx) => (await rpcHandler.handle(ctx.request as Request, { prefix: "/rpc", context: options })).response, {
    parse: "none",
  });
  app.all("/rpc/*", async (ctx) => (await rpcHandler.handle(ctx.request as Request, { prefix: "/rpc", context: options })).response, {
    parse: "none",
  });
  app.all("/api/orpc", async (ctx) => (await openapiHandler.handle(ctx.request as Request, { prefix: "/api/orpc", context: options })).response, {
    parse: "none",
  });
  app.all("/api/orpc/*", async (ctx) => (await openapiHandler.handle(ctx.request as Request, { prefix: "/api/orpc", context: options })).response, {
    parse: "none",
  });

  return app;
}
```

How it connects:
1. This file binds the oRPC contract tree to concrete handlers and mount paths.
2. It bridges queue operations from oRPC handlers into Inngest via `queueCoordinationRunWithInngest(...)`.
3. It produces the single OpenAPI contract artifact for external SDK generation.

#### D) `apps/server/src/rawr.ts`

```ts
import { createCoordinationInngestFunction, createInngestServeHandler } from "@rawr/coordination-inngest";
import { createCoordinationRuntimeAdapter } from "./coordination";
import { registerOrpcRoutes } from "./orpc";

export function registerRawrRoutes(app: any, opts: { repoRoot: string; baseUrl?: string }) {
  const runtime = createCoordinationRuntimeAdapter({
    repoRoot: opts.repoRoot,
    inngestBaseUrl: process.env.INNGEST_BASE_URL ?? "http://localhost:8288",
  });

  const inngestBundle = createCoordinationInngestFunction({ runtime });
  const inngestHandler = createInngestServeHandler({
    client: inngestBundle.client,
    functions: inngestBundle.functions,
  });

  app.all("/api/inngest", async ({ request }: { request: Request }) => inngestHandler(request));

  registerOrpcRoutes(app, {
    repoRoot: opts.repoRoot,
    baseUrl: opts.baseUrl ?? "http://localhost:3000",
    runtime,
    inngestClient: inngestBundle.client,
  });

  return app;
}
```

How it connects:
1. This is the canonical host composition spine.
2. Mount order is explicit: create runtime -> create Inngest bundle -> mount `/api/inngest` -> mount oRPC routes.
3. This preserves the split policy with one caller API harness (`/api/orpc`, `/rpc`) and one durability ingress (`/api/inngest`).

### Canonical File Tree

```text
apps/server/src/
  rawr.ts                # host composition and mounts
  orpc.ts                # oRPC handlers, context, OpenAPI generation
rawr.hq.ts               # composition root fixture for contract/router/function bundles
packages/core/src/orpc/
  hq-router.ts           # aggregate oRPC contract root
packages/orpc-standards/src/
  index.ts               # shared TypeBox standard-schema adapter export
  typebox-standard-schema.ts # TypeBox -> Standard Schema adapter fixture
packages/coordination-inngest/src/
  adapter.ts             # Inngest client/serve/function/queue bridge
packages/<capability>/src/
  domain/*               # entities/value objects + invariants
  service/*              # pure use-case logic
  procedures/*           # internal procedure boundary
  router.ts              # internal package router
  client.ts              # internal package client (default internal call path)
  errors.ts              # package-level typed errors
  index.ts               # package public surface
plugins/api/<capability>-api/src/
  contract.ts            # boundary API contract
  operations/*           # explicit boundary operations
  router.ts              # boundary API router
  index.ts               # composed API surface export
plugins/workflows/<capability>-workflows/src/
  contract.ts            # workflow trigger contract
  operations/*           # explicit workflow trigger operations
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
These helpers are optional DX simplifiers and do not change semantic policy.

#### Helper A: `packages/core/src/composition/capability-composer.ts`

```ts
// packages/core/src/composition/capability-composer.ts
import { oc } from "@orpc/contract";

export type Capability = {
  capabilityId: string;
  api: { contract: Record<string, unknown>; router: Record<string, unknown> };
  workflows: {
    triggerContract: Record<string, unknown>;
    triggerRouter: Record<string, unknown>;
    functions: readonly unknown[];
  };
};

export function defineCapability<const T extends Capability>(capability: T): T {
  return capability;
}

export function composeCapabilities<const T extends readonly Capability[]>(capabilities: T, inngestClient: unknown) {
  const contract = oc.router(
    Object.fromEntries(
      capabilities.map((capability) => [
        capability.capabilityId,
        { api: capability.api.contract, workflows: capability.workflows.triggerContract },
      ]),
    ),
  );

  const router = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      { api: capability.api.router, workflows: capability.workflows.triggerRouter },
    ]),
  );

  return {
    capabilities,
    orpc: { contract, router },
    inngest: { client: inngestClient, functions: capabilities.flatMap((capability) => capability.workflows.functions) },
  } as const;
}
```

Wiring:
1. Import at composition root (`rawr.hq.ts` or equivalent manifest module).
2. Replace repeated manual `contract`, `router`, and `functions` merge blocks.

#### Helper B: `packages/core/src/composition/surfaces.ts`

```ts
// packages/core/src/composition/surfaces.ts
export type ApiSurface<TContract, TRouter> = {
  contract: TContract;
  router: TRouter;
};

export function defineApiSurface<const TContract, const TRouter>(surface: ApiSurface<TContract, TRouter>) {
  return surface;
}

export type WorkflowSurface<TContract, TRouter, TFunctions extends readonly unknown[]> = {
  triggerContract: TContract;
  triggerRouter: TRouter;
  functions: TFunctions;
};

export function defineWorkflowSurface<
  const TContract,
  const TRouter,
  const TFunctions extends readonly unknown[],
>(surface: WorkflowSurface<TContract, TRouter, TFunctions>) {
  return surface;
}
```

Wiring:
1. Import in `plugins/api/*/src/index.ts` for API surface exports.
2. Import in `plugins/workflows/*/src/index.ts` for workflow surface exports.

#### Helper C: `packages/core/src/orpc/with-internal-client.ts`

```ts
// packages/core/src/orpc/with-internal-client.ts
export function withInternalClient<TContext, TClient>(
  getClient: (context: TContext) => TClient,
) {
  return async <TInput, TOutput>(
    args: { context: TContext; input: TInput },
    run: (client: TClient, input: TInput) => Promise<TOutput>,
  ): Promise<TOutput> => {
    const client = getClient(args.context);
    return run(client, args.input);
  };
}
```

Wiring:
1. Import in API/workflow router handlers.
2. Replace repeated per-handler `create<Capability>InternalClient(context)` boilerplate while keeping handler logic explicit.

## 6) End-to-End Examples

### Example A: External API -> Internal Package Client Path
Caller intent: non-durable boundary action that maps to package capability logic.

```ts
// plugins/api/invoice-processing-api/src/operations/start.ts
import type { InvoiceApiContext } from "../router";

export async function startInvoiceOperation(
  context: InvoiceApiContext,
  input: { invoiceId: string; requestedBy: string },
) {
  return context.invoice.start(input);
}
```

```ts
// plugins/api/invoice-processing-api/src/router.ts
import { implement } from "@orpc/server";
import { createInvoiceInternalClient, type InvoicePackageContext } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";

export type InvoiceApiContext = InvoicePackageContext & {
  invoice: ReturnType<typeof createInvoiceInternalClient>;
};

export function createInvoiceApiRouter() {
  const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
      startInvoiceOperation(context, input),
    ),
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
import { triggerReconciliationOperation } from "./operations/trigger-reconciliation";

type WorkflowTriggerContext = {
  inngest: Inngest;
  canCallInternal: boolean;
};

export function createInvoiceWorkflowTriggerRouter() {
  const os = implement<typeof invoiceWorkflowTriggerContract, WorkflowTriggerContext>(invoiceWorkflowTriggerContract);

  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      if (!context.canCallInternal) throw new Error("Procedure triggerInvoiceReconciliation is internal");
      return triggerReconciliationOperation(context.inngest, input);
    }),
  });
}
```

```ts
// explicit trigger operation (boundary layer)
// plugins/workflows/invoice-processing-workflows/src/operations/trigger-reconciliation.ts
import type { Inngest } from "inngest";

export async function triggerReconciliationOperation(inngest: Inngest, input: { runId: string }) {
  await inngest.send({
    name: "invoice.reconciliation.requested",
    data: { runId: input.runId },
  });
  return { accepted: true as const };
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
1. `registerOrpcRoutes(...)` -> caller-facing API harness (oRPC, OpenAPI, context injection), including workflow trigger routes (for example `/api/workflows/<capability>/*`).
2. `/api/inngest` handler -> durability execution ingress harness (Inngest serve/runtime).

## 7) Source Anchors

### Local decision lineage
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

### Upstream references
1. oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract), [Implement](https://orpc.dev/docs/contract-first/implement-contract), [RPC handler](https://orpc.dev/docs/rpc-handler), [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [Server-side clients](https://orpc.dev/docs/client/server-side)
2. Inngest: [Serve](https://www.inngest.com/docs/reference/serve), [Create function](https://www.inngest.com/docs/reference/functions/create), [Step run](https://www.inngest.com/docs/reference/functions/step-run), [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
3. Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle), [Mount](https://elysiajs.com/patterns/mount)
4. TypeBox: [Repository/docs](https://github.com/sinclairzx81/typebox)
