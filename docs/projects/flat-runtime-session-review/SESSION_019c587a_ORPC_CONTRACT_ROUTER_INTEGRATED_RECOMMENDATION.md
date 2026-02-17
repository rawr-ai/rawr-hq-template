# SESSION_019c587a — Integrated ORPC Recommendation

This document is a recommendation write-up, not a normative spec.

Normative posture, hard rules, and deep harness internals are defined in:
`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.

## Recommendation Summary
1. Use one internal package shape by default: `Domain -> Service -> Procedures -> Router + Client + Errors -> Index`.
2. Keep boundary plugins contract-first by default (`contract.ts` + explicit `operations/*` + `router.ts`).
3. Keep workflow trigger APIs separate from Inngest runtime ingress (`/api/workflows/...` vs `/api/inngest`).
4. Keep host/root fixtures explicit, but do not hide behavior behind implicit glue.
5. Allow direct adoption only as an explicit exception when overlap is truly 1:1.
6. Scale rule: split handler implementations first; split contracts only when behavior or audience actually diverges.

## Internal Package Default (Pure Capability)
Use this shape consistently for internal capability packages.

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

### 1) Domain
Role: entities/value objects + invariants only.

```ts
// packages/invoice-processing/src/domain/invoice-status.ts
export const INVOICE_STATUS = ["queued", "running", "completed", "failed", "canceled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export function canCancel(status: InvoiceStatus) {
  return status === "queued" || status === "running";
}
```

```ts
// packages/invoice-processing/src/domain/invoice.ts
import type { InvoiceStatus } from "./invoice-status";

export type InvoiceRun = {
  runId: string;
  invoiceId: string;
  requestedBy: string;
  status: InvoiceStatus;
};
```

### 2) Service
Role: pure use-case logic with injected deps.

```ts
// packages/invoice-processing/src/service/lifecycle.ts
import type { InvoiceRun } from "../domain/invoice";

export type InvoiceServiceDeps = {
  newRunId: () => string;
  saveRun: (run: InvoiceRun) => Promise<void>;
  getRun: (runId: string) => Promise<InvoiceRun | null>;
  updateStatus: (runId: string, status: InvoiceRun["status"]) => Promise<void>;
};

export async function startInvoice(
  deps: InvoiceServiceDeps,
  input: { invoiceId: string; requestedBy: string },
) {
  const runId = deps.newRunId();
  await deps.saveRun({ runId, invoiceId: input.invoiceId, requestedBy: input.requestedBy, status: "queued" });
  return { runId, accepted: true as const };
}
```

```ts
// packages/invoice-processing/src/service/status.ts
import type { InvoiceServiceDeps } from "./lifecycle";

export async function getInvoiceStatus(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  return run ? { runId: run.runId, status: run.status } : { runId: input.runId, status: "failed" as const };
}
```

```ts
// packages/invoice-processing/src/service/cancellation.ts
import type { InvoiceServiceDeps } from "./lifecycle";
import { canCancel } from "../domain/invoice-status";

export async function cancelInvoice(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  if (!run || !canCancel(run.status)) return { accepted: false as const };
  await deps.updateStatus(input.runId, "canceled");
  return { accepted: true as const };
}
```

```ts
// packages/invoice-processing/src/service/index.ts
export { startInvoice, type InvoiceServiceDeps } from "./lifecycle";
export { getInvoiceStatus } from "./status";
export { cancelInvoice } from "./cancellation";
```

### 3) Procedures
Role: internal RPC boundary for the package (schema + handler composition).

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
// packages/invoice-processing/src/procedures/get-status.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { getInvoiceStatus } from "../service";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const getStatusProcedure = o
  .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
  .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), status: Type.String() })))
  .handler(({ context, input }) => getInvoiceStatus(context.deps, input));
```

```ts
// packages/invoice-processing/src/procedures/cancel.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { cancelInvoice } from "../service";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const cancelProcedure = o
  .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
  .output(typeBoxStandardSchema(Type.Object({ accepted: Type.Boolean() })))
  .handler(({ context, input }) => cancelInvoice(context.deps, input));
```

```ts
// packages/invoice-processing/src/procedures/index.ts
import { startProcedure } from "./start";
import { getStatusProcedure } from "./get-status";
import { cancelProcedure } from "./cancel";

export const invoiceProcedures = {
  start: startProcedure,
  getStatus: getStatusProcedure,
  cancel: cancelProcedure,
} as const;
```

### 4) Router + Client + Errors
Role: compose procedures, provide internal client call path, centralize typed errors.

```ts
// packages/invoice-processing/src/router.ts
import { invoiceProcedures } from "./procedures";
import type { InvoiceServiceDeps } from "./service";

export type InvoiceProcedureContext = { deps: InvoiceServiceDeps };
export const invoiceInternalRouter = invoiceProcedures;
```

```ts
// packages/invoice-processing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";

export function createInvoiceInternalClient(context: InvoiceProcedureContext) {
  return createRouterClient(invoiceInternalRouter, { context });
}
```

```ts
// packages/invoice-processing/src/errors.ts
export class InvoiceNotFoundError extends Error {
  constructor(public readonly runId: string) {
    super(`Invoice run not found: ${runId}`);
  }
}
```

### 5) Index
Role: explicit public package surface.

```ts
// packages/invoice-processing/src/index.ts
export * from "./domain/invoice";
export * from "./service";
export { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";
export { createInvoiceInternalClient } from "./client";
export * from "./errors";
```

## Boundary API Plugin Default (Contract-First)
Default boundary shape: contract-first with explicit operations that call internal package clients.

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

### `contract.ts`

```ts
// plugins/api/invoice-api/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/start" })
    .input(typeBoxStandardSchema(Type.Object({ invoiceId: Type.String(), requestedBy: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), accepted: Type.Boolean() }))),

  getInvoiceProcessingStatus: oc
    .route({ method: "GET", path: "/invoices/processing/{runId}" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), status: Type.String() }))),

  cancelInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/{runId}/cancel" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ accepted: Type.Boolean() }))),
});
```

### `operations/*` (keep operation code explicit)

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
// plugins/api/invoice-api/src/operations/get-status.ts
import type { InvoiceApiContext } from "../router";

export async function getStatusOperation(context: InvoiceApiContext, input: { runId: string }) {
  return context.invoice.getStatus(input);
}
```

```ts
// plugins/api/invoice-api/src/operations/cancel.ts
import type { InvoiceApiContext } from "../router";

export async function cancelOperation(context: InvoiceApiContext, input: { runId: string }) {
  return context.invoice.cancel(input);
}
```

### `router.ts`

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import { createInvoiceInternalClient, type InvoiceProcedureContext } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";
import { getStatusOperation } from "./operations/get-status";
import { cancelOperation } from "./operations/cancel";

export type InvoiceApiContext = InvoiceProcedureContext & {
  invoice: ReturnType<typeof createInvoiceInternalClient>;
};

const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

export function createInvoiceApiRouter() {
  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
      startInvoiceOperation(context, input),
    ),
    getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(({ context, input }) =>
      getStatusOperation(context, input),
    ),
    cancelInvoiceProcessing: os.cancelInvoiceProcessing.handler(({ context, input }) =>
      cancelOperation(context, input),
    ),
  });
}
```

### `index.ts`

```ts
// plugins/api/invoice-api/src/index.ts
import { invoiceApiContract } from "./contract";
import { createInvoiceApiRouter } from "./router";

export const invoiceApiSurface = {
  contract: invoiceApiContract,
  router: createInvoiceApiRouter(),
} as const;
```

## Workflow Trigger Plugin + Inngest Split (Recommended)
Keep trigger API and durable execution separate by role:
1. Trigger API: contract-first oRPC surface for callers.
2. Durable execution: Inngest function(s).

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

### Trigger contract

```ts
// plugins/workflows/invoice-workflows/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ accepted: Type.Literal(true) }))),
});
```

### Trigger operation (explicit boundary operation)

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

### Trigger router

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

### Durable function + surface export

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

```ts
// plugins/workflows/invoice-workflows/src/index.ts
import type { Inngest } from "inngest";
import { invoiceWorkflowTriggerContract } from "./contract";
import { createInvoiceWorkflowTriggerRouter } from "./router";
import { createReconciliationFunction } from "./functions/reconciliation";

export function createInvoiceWorkflowSurface(inngest: Inngest) {
  return {
    triggerContract: invoiceWorkflowTriggerContract,
    triggerRouter: createInvoiceWorkflowTriggerRouter(),
    functions: [createReconciliationFunction(inngest)] as const,
  } as const;
}
```

## Required Root Fixtures (Brief, Concrete)
These fixtures are required by the recommendation. Full internals remain in the posture spec.

### 1) TypeBox -> Standard Schema adapter package

```ts
// packages/orpc-standards/src/index.ts
export { typeBoxStandardSchema } from "./typebox-standard-schema";
```

```ts
// packages/orpc-standards/src/typebox-standard-schema.ts
// Minimal fixture shape; full implementation stays in the posture spec.
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

### 2) Capability composition root (`rawr.hq.ts`)

```ts
// rawr.hq.ts
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

### 3) Host mounting root (`apps/server/src/rawr.ts`)

```ts
// apps/server/src/rawr.ts
import { rawrHqManifest } from "../../rawr.hq";
import { registerOrpcRoutes } from "./orpc/register-routes";
import { registerInngestRoute } from "./inngest/register-route";

export function registerRawrRoutes(app: unknown) {
  registerOrpcRoutes(app, rawrHqManifest.orpc, { workflowPrefix: "/api/workflows" });
  registerInngestRoute(app, rawrHqManifest.inngest, { path: "/api/inngest" });
  return app;
}
```

For complete mount/wiring details, use the posture spec rather than re-defining internals here.

## Adoption Exception and Scale Rule
Default posture remains boundary-owned contracts + boundary operations.

Adoption exception (allowed, explicit):
- If a boundary is truly 1:1 with an internal package surface, direct adoption is acceptable.
- When used, document why overlap is truly 1:1 and what would trigger returning to boundary-owned contracts.

Scale rule (default progression):
- Split implementation handlers/operations first.
- Split contracts only when behavior, policy, or external audience diverges.

## Recommended Use of This Document
Use this page as the compact authoring recommendation.
Use the posture spec as the normative source for rules, deeper glue internals, and host/runtime policy details.
