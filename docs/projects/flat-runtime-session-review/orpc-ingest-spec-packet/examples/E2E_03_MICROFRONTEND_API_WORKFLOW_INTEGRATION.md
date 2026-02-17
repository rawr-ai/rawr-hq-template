# E2E 03 — Micro-Frontend + Workflow Integration Without Semantic Duplication

## 1) Goal and Use-Case Framing

### Goal
Show one advanced, policy-consistent end-to-end pattern where a micro-frontend can:
1. trigger workflow work,
2. read workflow run status/timeline,
3. reuse capability logic from one canonical source,
without duplicating workflow/domain semantics across browser, plugin, and runtime layers.

### Chosen default path (for this walkthrough)
**Shared-package-first workflow integration**:
1. Canonical semantics live in `packages/<capability>`.
2. Workflow plugin implements trigger + durable execution using those package semantics.
3. Micro-frontend calls workflow trigger/status APIs (not `/api/inngest`) and reuses browser-safe package logic.
4. API plugin consumption is optional, not required for workflow invocation.

This is the recommended default because it satisfies no-duplication + dependency-direction constraints better than API-plugin-only or ingress-direct alternatives.

---

## 2) E2E Topology Diagram

```mermaid
flowchart LR
  MFE["Web Micro-Frontend\n(browser)"] -->|"POST /api/workflows/invoicing/reconciliation/trigger"| WFAPI["Workflow Trigger Router\n(oRPC/OpenAPI boundary)"]
  MFE -->|"GET /api/workflows/invoicing/runs/:runId"| WFAPI
  WFAPI -->|"enqueue event (inngest.send)"| INGRESS["/api/inngest\n(runtime ingress only)"]
  INGRESS --> FUNC["Inngest Durable Function\n(step.run / retries)"]
  FUNC --> PKGCLI["Package Internal Client\n(server-only)"]
  PKGCLI --> PKGSVC["Package Service + Domain\n(single source semantics)"]
  FUNC --> RUNTIME["Run Status + Timeline Store\n(runtime adapter)"]
  WFAPI -->|"read run status/timeline"| RUNTIME
```

Boundary meaning:
1. Browser never calls `/api/inngest`.
2. `/api/workflows/...` is caller-trigger/status surface.
3. Durable orchestration lives only inside Inngest functions.

---

## 3) Canonical File Tree

```text
packages/invoice-processing/src/
  domain/                                # shared semantic source (browser-safe + server-safe)
    workflow-shapes.ts
    run-status-view.ts
  service/                               # server-only orchestration/business operations
    reconciliation.ts
    status.ts
  procedures/                            # internal server procedure boundary
    reconcile.ts
    get-status.ts
  router.ts                              # internal router (server-only)
  client.ts                              # in-process internal client (server-only)
  errors.ts                              # typed capability errors
  workflows/
    contract.ts                          # shared workflow trigger/status contract artifact
  browser.ts                             # browser-safe exports only
  index.ts

plugins/workflows/invoice-processing-workflows/src/
  contract.ts                            # re-export shared package workflow contract
  operations/
    trigger-reconciliation.ts
    get-run-status.ts
    get-run-timeline.ts
  router.ts                              # boundary auth/visibility + trigger/status handlers
  functions/
    reconciliation.ts                    # durable execution
  index.ts

rawr.hq.ts                               # composition authority
apps/server/src/rawr.ts                  # mounts /api/workflows + /api/inngest

plugins/web/invoice-console/src/
  workflow-client.ts                     # browser client to workflow trigger/status surface
  web.ts                                 # mount(el, ctx) UI runtime
```

---

## 4) Key Files With Concrete Code

### 4.1 Shared package semantics (TypeBox-first, browser-safe)

```ts
// packages/invoice-processing/src/domain/workflow-shapes.ts
import { Type, type Static } from "typebox";

export const TriggerInvoiceReconciliationInputSchema = Type.Object(
  {
    invoiceId: Type.String({ minLength: 1 }),
    requestedBy: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const TriggerInvoiceReconciliationOutputSchema = Type.Object(
  {
    accepted: Type.Literal(true),
    runId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const WorkflowRunStatusSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal("queued"),
      Type.Literal("running"),
      Type.Literal("completed"),
      Type.Literal("failed"),
    ]),
    isTerminal: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type WorkflowRunStatus = Static<typeof WorkflowRunStatusSchema>;
```

```ts
// packages/invoice-processing/src/domain/run-status-view.ts
import type { WorkflowRunStatus } from "./workflow-shapes";

export function toRunBadge(status: WorkflowRunStatus): "neutral" | "warning" | "success" | "danger" {
  if (status.status === "completed") return "success";
  if (status.status === "failed") return "danger";
  if (status.status === "running") return "warning";
  return "neutral";
}
```

```ts
// packages/invoice-processing/src/browser.ts
export * from "./domain/workflow-shapes";
export * from "./domain/run-status-view";
```

### 4.2 Shared workflow contract artifact (single source, reusable)

```ts
// packages/invoice-processing/src/workflows/contract.ts
import { oc } from "@orpc/contract";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import {
  TriggerInvoiceReconciliationInputSchema,
  TriggerInvoiceReconciliationOutputSchema,
  WorkflowRunStatusSchema,
} from "../domain/workflow-shapes";
import { Type } from "typebox";

const tag = ["invoicing-workflows"] as const;

export const invoiceWorkflowContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({
      method: "POST",
      path: "/invoicing/reconciliation/trigger",
      tags: tag,
      operationId: "invoicingTriggerInvoiceReconciliation",
    })
    .input(typeBoxStandardSchema(TriggerInvoiceReconciliationInputSchema))
    .output(typeBoxStandardSchema(TriggerInvoiceReconciliationOutputSchema)),

  getInvoiceRunStatus: oc
    .route({
      method: "GET",
      path: "/invoicing/runs/{runId}",
      tags: tag,
      operationId: "invoicingGetRunStatus",
    })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String({ minLength: 1 }) })))
    .output(typeBoxStandardSchema(WorkflowRunStatusSchema)),

  getInvoiceRunTimeline: oc
    .route({
      method: "GET",
      path: "/invoicing/runs/{runId}/timeline",
      tags: tag,
      operationId: "invoicingGetRunTimeline",
    })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String({ minLength: 1 }) })))
    .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), events: Type.Array(Type.Any()) }))),
});
```

### 4.3 Workflow plugin router (auth + visibility + trigger semantics)

```ts
// plugins/workflows/invoice-processing-workflows/src/contract.ts
export { invoiceWorkflowContract } from "@rawr/invoice-processing/workflows/contract";
```

```ts
// plugins/workflows/invoice-processing-workflows/src/router.ts
import { implement, ORPCError } from "@orpc/server";
import type { Inngest } from "inngest";
import { invoiceWorkflowContract } from "./contract";

type Principal = {
  subject: string;
  roles: string[];
  canCallInternal: boolean;
};

type WorkflowContext = {
  principal: Principal;
  inngest: Inngest;
  runtime: {
    getRunStatus: (runId: string) => Promise<{ runId: string; status: string } | null>;
    getRunTimeline: (runId: string) => Promise<unknown[]>;
  };
};

const visibility = {
  triggerInvoiceReconciliation: "internal",
  getInvoiceRunStatus: "internal",
  getInvoiceRunTimeline: "internal",
} as const;

function assertVisible(proc: keyof typeof visibility, principal: Principal) {
  if (visibility[proc] === "internal" && !principal.canCallInternal) {
    throw new ORPCError("FORBIDDEN", { status: 403, message: `Procedure ${String(proc)} is internal` });
  }
}

const os = implement<typeof invoiceWorkflowContract, WorkflowContext>(invoiceWorkflowContract);

export function createInvoiceWorkflowRouter() {
  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      assertVisible("triggerInvoiceReconciliation", context.principal);

      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await context.inngest.send({
        name: "invoice.reconciliation.requested",
        data: {
          runId,
          invoiceId: input.invoiceId,
          requestedBy: context.principal.subject,
        },
      });

      return { accepted: true, runId };
    }),

    getInvoiceRunStatus: os.getInvoiceRunStatus.handler(async ({ context, input }) => {
      assertVisible("getInvoiceRunStatus", context.principal);
      const run = await context.runtime.getRunStatus(input.runId);
      if (!run) throw new ORPCError("RUN_NOT_FOUND", { status: 404, message: "Run not found" });
      return {
        runId: run.runId,
        status: run.status as "queued" | "running" | "completed" | "failed",
        isTerminal: run.status === "completed" || run.status === "failed",
      };
    }),

    getInvoiceRunTimeline: os.getInvoiceRunTimeline.handler(async ({ context, input }) => {
      assertVisible("getInvoiceRunTimeline", context.principal);
      return { runId: input.runId, events: await context.runtime.getRunTimeline(input.runId) };
    }),
  });
}
```

### 4.4 Durable execution function (server-only)

```ts
// plugins/workflows/invoice-processing-workflows/src/functions/reconciliation.ts
import type { Inngest } from "inngest";
import { createInvoiceInternalClient, type InvoiceProcedureContext } from "@rawr/invoice-processing";

export function createInvoiceReconciliationFunction(inngest: Inngest, packageContext: InvoiceProcedureContext) {
  return inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: "invoice.reconciliation.requested" },
    async ({ event, step }) => {
      const invoice = createInvoiceInternalClient(packageContext);

      await step.run("invoice/reconcile", async () => {
        await invoice.reconcile({
          runId: event.data.runId,
          invoiceId: event.data.invoiceId,
          requestedBy: event.data.requestedBy,
        });
      });

      return { ok: true as const, runId: event.data.runId };
    },
  );
}
```

### 4.5 Host composition + mount glue (explicit, no black box)

```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { implement } from "@orpc/server";
import { Inngest } from "inngest";
import { createInvoiceWorkflowRouter } from "./plugins/workflows/invoice-processing-workflows/src/router";
import { createInvoiceReconciliationFunction } from "./plugins/workflows/invoice-processing-workflows/src/functions/reconciliation";
import { invoiceWorkflowContract } from "@rawr/invoice-processing/workflows/contract";

const inngest = new Inngest({ id: "rawr-hq" });
const workflowContract = oc.router({ invoicing: invoiceWorkflowContract });
const os = implement<typeof workflowContract, any>(workflowContract);
const workflowRouter = os.router({ invoicing: createInvoiceWorkflowRouter() });

export const rawrHqManifest = {
  workflows: {
    contract: workflowContract,
    router: workflowRouter,
  },
  inngest: {
    client: inngest,
    functions: [createInvoiceReconciliationFunction(inngest, /* packageContext */ {} as any)],
  },
} as const;
```

```ts
// apps/server/src/rawr.ts (workflow-relevant excerpt)
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { rawrHqManifest } from "../../rawr.hq";

function requirePrincipal(request: Request) {
  // Session/cookie/JWT resolution lives here (boundary auth).
  return { subject: "user-123", roles: ["operator"], canCallInternal: true } as const;
}

export function registerWorkflowAndInngestRoutes(app: any, runtime: any) {
  const workflowHandler = new OpenAPIHandler(rawrHqManifest.workflows.router);
  const inngestHandler = createInngestServeHandler(rawrHqManifest.inngest);

  app.all(
    "/api/workflows/*",
    async ({ request }: { request: Request }) => {
      const principal = requirePrincipal(request);
      const result = await workflowHandler.handle(request, {
        prefix: "/api/workflows",
        context: { principal, inngest: rawrHqManifest.inngest.client, runtime },
      });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all("/api/inngest", async ({ request }: { request: Request }) => {
    // Runtime ingress auth/signature check belongs here, never in browser.
    return inngestHandler(request);
  });
}
```

### 4.6 Micro-frontend client + mount (browser-safe)

```ts
// plugins/web/invoice-console/src/workflow-client.ts
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { invoiceWorkflowContract } from "@rawr/invoice-processing/workflows/contract";

type InvoiceWorkflowClient = ContractRouterClient<typeof invoiceWorkflowContract>;

export function createInvoiceWorkflowClient(baseUrl: string) {
  return createORPCClient<InvoiceWorkflowClient>(
    new OpenAPILink({
      url: `${baseUrl.replace(/\/$/, "")}/api/workflows`,
      fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
    }),
  );
}
```

```ts
// plugins/web/invoice-console/src/web.ts
import type { MountContext } from "@rawr/ui-sdk";
import { createInvoiceWorkflowClient } from "./workflow-client";
import { toRunBadge } from "@rawr/invoice-processing/browser";

export async function mount(el: HTMLElement, _ctx: MountContext) {
  const client = createInvoiceWorkflowClient(window.location.origin);

  const button = document.createElement("button");
  button.textContent = "Run reconciliation";
  const status = document.createElement("div");

  button.onclick = async () => {
    const trigger = await client.triggerInvoiceReconciliation({
      invoiceId: "inv-001",
      requestedBy: "ui-user",
    });

    const runId = trigger.runId;
    const timer = window.setInterval(async () => {
      const run = await client.getInvoiceRunStatus({ runId });
      status.textContent = `${run.status} (${toRunBadge(run)})`;
      if (run.isTerminal) window.clearInterval(timer);
    }, 1500);
  };

  el.append(button, status);

  return {
    unmount: () => {
      button.remove();
      status.remove();
    },
  };
}
```

Browser-safe vs server-only boundary in this implementation:
1. Browser-safe: `packages/invoice-processing/src/domain/*`, `packages/invoice-processing/src/browser.ts`, `plugins/web/**`.
2. Server-only: workflow router context/auth, Inngest functions, package `client.ts`, runtime adapter, ingress route.

---

## 5) Wiring Steps (host -> composition -> plugin/package -> runtime)

1. Define canonical workflow payload/result semantics in `packages/invoice-processing/src/domain/*` (TypeBox-first).
2. Define shared workflow trigger/status contract in `packages/invoice-processing/src/workflows/contract.ts`.
3. Implement workflow router in workflow plugin, reusing shared package contract and enforcing visibility/auth.
4. Implement durable function(s) in workflow plugin, using package internal client for server-only orchestration.
5. Compose workflows + functions in `rawr.hq.ts`.
6. Mount caller-trigger/status surface at `/api/workflows/*` with boundary auth context.
7. Mount runtime ingress at `/api/inngest` for Inngest runtime callbacks only.
8. In web plugin, call workflow trigger/status procedures via typed client and render status with shared package view logic.

---

## 6) Runtime Sequence Walkthrough

### Trigger path
1. User action in micro-frontend calls `triggerInvoiceReconciliation`.
2. Request hits `/api/workflows/invoicing/reconciliation/trigger`.
3. Workflow router resolves principal from boundary auth context and enforces visibility.
4. Router emits `invoice.reconciliation.requested` via `inngest.send` and returns `{ accepted: true, runId }`.

### Durable path
1. Inngest receives event at `/api/inngest`.
2. Durable function executes `step.run` blocks and invokes package internal client/service.
3. Runtime adapter writes run state/timeline updates.

### Status/result path
1. Micro-frontend polls `getInvoiceRunStatus` and optionally `getInvoiceRunTimeline` on `/api/workflows/...`.
2. Workflow router reads runtime state and returns typed status/timeline.
3. UI uses shared package projection helpers for consistent status rendering.

---

## 7) Rationale and Trade-Offs

### Why this default
1. Single semantic source: shared package owns payload/status semantics consumed by workflow router, durable function, and micro-frontend.
2. API plugin remains optional: workflow-related integration does not require an API plugin layer unless the capability needs separate boundary concerns.
3. Boundary integrity: browser-facing workflow calls remain caller-trigger/status APIs, while `/api/inngest` stays runtime-only.

### Alternatives considered

| Alternative | Decision | Why |
| --- | --- | --- |
| API-plugin-centric only (MFE -> API plugin -> workflow) | Deferred as default | Valid for capabilities needing heavy boundary transformations, but not required for workflow-focused MFE and can add extra semantic mapping layers. |
| Host-injected capability gateway (MFE does not build own client) | Deferred (phase 2) | Good DX and auth centralization, but current mount context does not yet define a stable gateway contract. |
| Direct browser calls to `/api/inngest` | Rejected | Violates split semantics and breaks security/runtime ownership boundaries. |

---

## 8) What Can Go Wrong + Guardrails

1. **Semantic drift across layers**
- Risk: browser, workflow router, and durable function each define their own payload/status shape.
- Guardrail: keep canonical TypeBox schemas in package domain/workflow modules; import everywhere else.

2. **Boundary collapse (`/api/workflows` vs `/api/inngest`)**
- Risk: browser starts calling ingress route directly.
- Guardrail: enforce ingress signature checks and never expose ingress URLs in browser client modules.

3. **Visibility/auth bypass**
- Risk: internal workflow trigger procedures callable by unintended users.
- Guardrail: default `internal` visibility + explicit principal checks in workflow router context.

4. **Server-only code leaking into browser bundles**
- Risk: importing package internal `client.ts` from web plugin.
- Guardrail: maintain explicit browser-safe entrypoint (`browser.ts`) and lint rules that block server-only imports from web plugins.

5. **Route/mount mismatch**
- Risk: contract route paths and mount prefix diverge, causing 404/incorrect operation routing.
- Guardrail: integration tests for `/api/workflows/*` and `/api/inngest`, plus contract snapshot/OpenAPI checks.

---

## 9) Explicit Policy Consistency Checklist

| Policy | Status | Notes |
| --- | --- | --- |
| TypeBox-first | Satisfied | Canonical input/output/status schemas are TypeBox artifacts. |
| Split semantics (`/api/workflows` vs `/api/inngest`) | Satisfied | Trigger/status is caller-facing; ingress is runtime-only. |
| Internal server calls use package internal client | Satisfied | Durable function calls package `client.ts` path server-side. |
| No plugin-to-plugin runtime imports | Satisfied | Shared artifacts move through `packages/*`; workflow plugin re-exports from package as needed. |
| Boundary auth/visibility in boundary layer | Satisfied | Router context enforces principal and visibility before enqueue/read operations. |
| No glue black boxes | Satisfied | Composition and mount code shown explicitly in `rawr.hq.ts` and host route registration. |
| API plugin mandatory for workflow path | Not required by design | API plugin is optional and only included when capability-specific boundary concerns justify it. |

---

## 10) Unresolved Gaps (Mandatory)

1. **Current runtime route reality vs canonical workflow prefix**
- Current server code in this worktree primarily exposes workflow run actions through coordination procedures on `/rpc` and `/api/orpc`, not dedicated `/api/workflows/<capability>/*` mounts.
- Why unresolved: canonical split policy is documented, but implementation convergence is incomplete in the live branch.

2. **Shared workflow contract ownership location**
- Packet examples often place workflow `contract.ts` inside workflow plugin shape, while no-duplication + import-boundary constraints push toward package-owned contract artifacts.
- Why unresolved: both patterns are present in docs; a single canonical placement rule is not yet fully codified in one authoritative section.

3. **Mount-context-level capability gateway contract**
- Host-injected workflow/API gateway is a strong DX/security option for micro-frontends, but current `MountContext` does not define a standardized capability gateway or principal/auth payload.
- Why unresolved: introducing that contract is a cross-surface API decision requiring explicit acceptance.

4. **Workflow client generation strategy for first-party MFEs**
- OpenAPI artifacts exist (`apps/server/openapi/*`), but a canonical generated workflow client package for first-party web plugins is not yet established.
- Why unresolved: first-party guidance is RPC-first, while plugin boundary/import constraints make workflow-surface client ergonomics an open design point.

5. **Deferred helper abstraction (D-004)**
- Repeated boilerplate across trigger routers/operations may justify a workflow-backed ORPC helper abstraction.
- Why unresolved: decision D-004 explicitly defers this until evidence threshold is met.
