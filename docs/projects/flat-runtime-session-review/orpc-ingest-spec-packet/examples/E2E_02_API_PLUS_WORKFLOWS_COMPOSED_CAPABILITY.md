# E2E 02 — API + Workflows Composed Capability (TypeBox-First, Split Posture)

## 1) Goal and Use-Case Framing
This walkthrough shows one capability (`invoice-processing`) composed end to end with two caller-facing surfaces and one runtime ingress surface:
1. API surface for immediate request/response behavior (`start`, `get status`).
2. Workflow trigger surface for caller-triggered durable work (`trigger reconciliation`).
3. Inngest runtime ingress for durable execution only.

The target outcome is explicit composition where:
- API plugin and workflow plugin both call the same internal package client.
- Workflow trigger performs package preflight, then enqueues Inngest.
- Durable function executes and updates package state.
- Host keeps `/api/workflows/...` and `/api/inngest` explicitly split.

## 2) E2E Topology Diagram
```mermaid
flowchart TD
  Caller["Caller"] --> Api["/api/orpc/invoicing/api/*"]
  Caller --> Trigger["/api/workflows/invoice-processing/reconciliation/trigger"]

  Api --> ApiPlugin["plugins/api/invoice-processing-api\ncontract + operations + router"]
  Trigger --> WfPlugin["plugins/workflows/invoice-processing-workflows\ntrigger contract + operations + router"]

  ApiPlugin --> PkgClient["packages/invoice-processing/src/client.ts"]
  WfPlugin --> PkgClient

  WfPlugin --> Enqueue["inngest.send(invoice.reconciliation.requested)"]
  Enqueue --> Ingress["/api/inngest"]
  Ingress --> Fn["Inngest function\ninvoice.reconciliation"]
  Fn --> PkgClient

  PkgClient --> Pkg["packages/invoice-processing\n(domain/service/procedures/router)"]
  Host["apps/server/src/rawr.ts"] --> Api
  Host --> Trigger
  Host --> Ingress
  Root["rawr.hq.ts"] --> Host
```

## 3) Canonical File Tree
```text
rawr.hq.ts
apps/server/src/
  rawr.ts
  orpc/register-routes.ts
packages/orpc-standards/src/
  typebox-standard-schema.ts
  index.ts
packages/invoice-processing/src/
  domain/
    invoice.ts
    invoice-status.ts
  service/
    lifecycle.ts
    index.ts
  procedures/
    start.ts
    get-status.ts
    queue-reconciliation.ts
    mark-reconciliation-result.ts
    index.ts
  router.ts
  client.ts
  errors.ts
  index.ts
plugins/api/invoice-processing-api/src/
  contract.ts
  operations/
    start.ts
    get-status.ts
  router.ts
  index.ts
plugins/workflows/invoice-processing-workflows/src/
  contract.ts
  operations/
    trigger-reconciliation.ts
  router.ts
  functions/
    reconciliation.ts
  index.ts
```

## 4) Key Files With Concrete Code

### 4.1 Internal package: TypeBox-first procedures + internal client
```ts
// packages/invoice-processing/src/domain/invoice-status.ts
export const INVOICE_STATUS = [
  "queued",
  "running",
  "reconciling",
  "completed",
  "failed",
  "canceled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export function canQueueReconciliation(status: InvoiceStatus) {
  return status === "queued" || status === "running";
}
```

```ts
// packages/invoice-processing/src/service/lifecycle.ts
import { canQueueReconciliation, type InvoiceStatus } from "../domain/invoice-status";

export type InvoiceRun = {
  runId: string;
  invoiceId: string;
  requestedBy: string;
  status: InvoiceStatus;
};

export type InvoiceServiceDeps = {
  newRunId: () => string;
  saveRun: (run: InvoiceRun) => Promise<void>;
  getRun: (runId: string) => Promise<InvoiceRun | null>;
  updateStatus: (runId: string, status: InvoiceStatus) => Promise<void>;
};

export async function startInvoice(
  deps: InvoiceServiceDeps,
  input: { invoiceId: string; requestedBy: string },
) {
  const runId = deps.newRunId();
  await deps.saveRun({
    runId,
    invoiceId: input.invoiceId,
    requestedBy: input.requestedBy,
    status: "queued",
  });
  return { runId, accepted: true as const };
}

export async function queueReconciliation(
  deps: InvoiceServiceDeps,
  input: { runId: string; requestedBy: string },
) {
  const run = await deps.getRun(input.runId);
  if (!run) return { accepted: false as const, reason: "not-found" as const };
  if (!canQueueReconciliation(run.status)) {
    return { accepted: false as const, reason: "invalid-state" as const };
  }

  await deps.updateStatus(run.runId, "reconciling");
  return { accepted: true as const, runId: run.runId };
}

export async function markReconciliationResult(
  deps: InvoiceServiceDeps,
  input: { runId: string; ok: boolean },
) {
  const status = input.ok ? "completed" : "failed";
  await deps.updateStatus(input.runId, status);
  return { runId: input.runId, status } as const;
}
```

```ts
// packages/invoice-processing/src/procedures/queue-reconciliation.ts
import { ORPCError, os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { queueReconciliation } from "../service/lifecycle";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const queueReconciliationProcedure = o
  .input(
    typeBoxStandardSchema(
      Type.Object({
        runId: Type.String(),
        requestedBy: Type.String(),
      }),
    ),
  )
  .output(
    typeBoxStandardSchema(
      Type.Union([
        Type.Object({ accepted: Type.Literal(true), runId: Type.String() }),
        Type.Object({
          accepted: Type.Literal(false),
          reason: Type.Union([Type.Literal("not-found"), Type.Literal("invalid-state")]),
        }),
      ]),
    ),
  )
  .handler(async ({ context, input }) => {
    const result = await queueReconciliation(context.deps, input);
    if (!result.accepted && result.reason === "not-found") {
      throw new ORPCError("NOT_FOUND", { status: 404, message: `Run not found: ${input.runId}` });
    }
    return result;
  });
```

```ts
// packages/invoice-processing/src/router.ts
import type { InvoiceServiceDeps } from "./service/lifecycle";
import { startProcedure } from "./procedures/start";
import { getStatusProcedure } from "./procedures/get-status";
import { queueReconciliationProcedure } from "./procedures/queue-reconciliation";
import { markReconciliationResultProcedure } from "./procedures/mark-reconciliation-result";

export type InvoiceProcedureContext = { deps: InvoiceServiceDeps };

export const invoiceInternalRouter = {
  start: startProcedure,
  getStatus: getStatusProcedure,
  queueReconciliation: queueReconciliationProcedure,
  markReconciliationResult: markReconciliationResultProcedure,
} as const;
```

```ts
// packages/invoice-processing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";

export function createInvoiceInternalClient(context: InvoiceProcedureContext) {
  return createRouterClient(invoiceInternalRouter, { context });
}
```

### 4.2 API plugin: boundary operations call internal package client
```ts
// plugins/api/invoice-processing-api/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoice-processing/start" })
    .input(
      typeBoxStandardSchema(
        Type.Object({
          invoiceId: Type.String(),
          requestedBy: Type.String(),
        }),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String(),
          accepted: Type.Boolean(),
        }),
      ),
    ),

  getInvoiceProcessingStatus: oc
    .route({ method: "GET", path: "/invoice-processing/{runId}" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ runId: Type.String(), status: Type.String() }))),
});
```

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
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";
import { getStatusOperation } from "./operations/get-status";
import type { InvoiceProcedureContext } from "@rawr/invoice-processing";
import { createInvoiceInternalClient } from "@rawr/invoice-processing";

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
  });
}
```

### 4.3 Workflow plugin: trigger operation calls internal client, then enqueues Inngest
```ts
// plugins/workflows/invoice-processing-workflows/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceWorkflowTriggerContract = oc.router({
  triggerReconciliation: oc
    .route({ method: "POST", path: "/invoice-processing/reconciliation/trigger" })
    .input(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String(),
          requestedBy: Type.String(),
        }),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object({
          accepted: Type.Literal(true),
          runId: Type.String(),
        }),
      ),
    ),
});
```

```ts
// plugins/workflows/invoice-processing-workflows/src/operations/trigger-reconciliation.ts
import { ORPCError } from "@orpc/server";
import type { InvoiceWorkflowTriggerContext } from "../router";

export const INVOICE_RECONCILIATION_EVENT = "invoice.reconciliation.requested";

export async function triggerReconciliationOperation(
  context: InvoiceWorkflowTriggerContext,
  input: { runId: string; requestedBy: string },
) {
  // Internal package preflight before enqueue keeps domain ownership in package logic.
  const preflight = await context.invoice.queueReconciliation(input);
  if (!preflight.accepted) {
    throw new ORPCError("FAILED_PRECONDITION", {
      status: 409,
      message: `Cannot queue reconciliation for run ${input.runId}`,
      data: { runId: input.runId },
    });
  }

  await context.inngest.send({
    name: INVOICE_RECONCILIATION_EVENT,
    data: {
      runId: preflight.runId,
      requestedBy: input.requestedBy,
    },
  });

  return { accepted: true as const, runId: preflight.runId };
}
```

```ts
// plugins/workflows/invoice-processing-workflows/src/router.ts
import { implement } from "@orpc/server";
import type { Inngest } from "inngest";
import { createInvoiceInternalClient, type InvoiceProcedureContext } from "@rawr/invoice-processing";
import { invoiceWorkflowTriggerContract } from "./contract";
import { triggerReconciliationOperation } from "./operations/trigger-reconciliation";

export type InvoiceWorkflowTriggerContext = InvoiceProcedureContext & {
  inngest: Inngest;
  invoice: ReturnType<typeof createInvoiceInternalClient>;
};

const os = implement<typeof invoiceWorkflowTriggerContract, InvoiceWorkflowTriggerContext>(
  invoiceWorkflowTriggerContract,
);

export function createInvoiceWorkflowTriggerRouter() {
  return os.router({
    triggerReconciliation: os.triggerReconciliation.handler(({ context, input }) =>
      triggerReconciliationOperation(context, input),
    ),
  });
}
```

```ts
// plugins/workflows/invoice-processing-workflows/src/functions/reconciliation.ts
import type { Inngest } from "inngest";
import { createInvoiceInternalClient, type InvoiceServiceDeps } from "@rawr/invoice-processing";
import { INVOICE_RECONCILIATION_EVENT } from "../operations/trigger-reconciliation";

export function createReconciliationFunction(inngest: Inngest, deps: InvoiceServiceDeps) {
  return inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: INVOICE_RECONCILIATION_EVENT },
    async ({ event, step }) => {
      const invoice = createInvoiceInternalClient({ deps });

      await step.run("invoice/reconcile", async () => {
        // Reconciliation side effects go here.
        await invoice.markReconciliationResult({ runId: event.data.runId, ok: true });
      });

      return { ok: true as const, runId: event.data.runId };
    },
  );
}
```

### 4.4 `rawr.hq.ts`: compose API + workflow trigger + Inngest functions
```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { Inngest } from "inngest";
import { invoiceApiSurface } from "./plugins/api/invoice-processing-api/src";
import { createInvoiceWorkflowSurface } from "./plugins/workflows/invoice-processing-workflows/src";

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
  inngest: {
    client: inngest,
    functions: [...invoiceWorkflows.functions],
  },
} as const;
```

### 4.5 Host mounting: explicit `/api/workflows/...` vs `/api/inngest` split
```ts
// apps/server/src/rawr.ts
import { rawrHqManifest } from "../../rawr.hq";
import { registerOrpcRoutes } from "./orpc/register-routes";
import { registerInngestRoute } from "./inngest/register-route";

export function registerRawrRoutes(app: unknown, ctx: { repoRoot: string; baseUrl: string; runtime: unknown }) {
  registerOrpcRoutes(app, rawrHqManifest.orpc, {
    context: ctx,
    apiPrefix: "/api/orpc",
    workflowPrefix: "/api/workflows",
  });

  registerInngestRoute(app, rawrHqManifest.inngest, {
    path: "/api/inngest",
  });
}
```

```ts
// apps/server/src/orpc/register-routes.ts
import { OpenAPIHandler } from "@orpc/openapi/fetch";

function pickSurface<T extends Record<string, { api: unknown; workflows: unknown }>>(
  routers: T,
  key: "api" | "workflows",
) {
  return Object.fromEntries(Object.entries(routers).map(([capability, value]) => [capability, value[key]]));
}

export function registerOrpcRoutes(
  app: any,
  orpc: { contract: Record<string, { api: unknown; workflows: unknown }>; router: Record<string, any> },
  opts: { context: unknown; apiPrefix: string; workflowPrefix: string },
) {
  const apiHandler = new OpenAPIHandler(pickSurface(orpc.router, "api"));
  const workflowHandler = new OpenAPIHandler(pickSurface(orpc.router, "workflows"));

  app.all(
    `${opts.apiPrefix}/*`,
    async ({ request }: { request: Request }) =>
      (await apiHandler.handle(request, { prefix: opts.apiPrefix, context: opts.context })).response,
    { parse: "none" },
  );

  app.all(
    `${opts.workflowPrefix}/*`,
    async ({ request }: { request: Request }) =>
      (await workflowHandler.handle(request, { prefix: opts.workflowPrefix, context: opts.context })).response,
    { parse: "none" },
  );
}
```

## 5) Wiring Steps (Host -> Composition -> Plugin/Package -> Runtime)
1. Build internal capability package (`packages/invoice-processing`) with domain/service/procedures plus one exported internal router and one exported internal client.
2. Build API plugin (`plugins/api/invoice-processing-api`) with TypeBox-first contract and explicit operations that call `context.invoice.*`.
3. Build workflow plugin (`plugins/workflows/invoice-processing-workflows`) with trigger contract/router/operations plus Inngest functions.
4. In workflow operation, call `context.invoice.queueReconciliation(...)` before `context.inngest.send(...)`.
5. Compose both plugin surfaces in `rawr.hq.ts` under one capability namespace (`invoicing.api`, `invoicing.workflows`) and merge workflow functions into the single Inngest bundle.
6. In server host registration, mount:
   - `/api/orpc/*` for API boundary procedures.
   - `/api/workflows/*` for caller-trigger workflow procedures.
   - `/api/inngest` for runtime ingress only.
7. Pass one runtime-owned Inngest client bundle into both:
   - workflow trigger context (for enqueue),
   - Inngest serve handler (for function execution).

## 6) Runtime Sequence Walkthrough

### Flow A: API surface call (synchronous)
1. Caller sends `POST /api/orpc/invoice-processing/start`.
2. API plugin router resolves `startInvoiceProcessing`.
3. API operation calls `context.invoice.start(...)` (internal package client).
4. Package service writes run as `queued`.
5. Caller gets immediate `{ runId, accepted: true }`.

### Flow B: Workflow trigger call (caller-triggered + durable)
1. Caller sends `POST /api/workflows/invoice-processing/reconciliation/trigger`.
2. Workflow trigger router resolves `triggerReconciliation`.
3. Trigger operation calls `context.invoice.queueReconciliation(...)` for domain preflight/state transition.
4. Trigger operation emits `invoice.reconciliation.requested` via `context.inngest.send(...)`.
5. Caller receives immediate accepted response.

### Flow C: Durable execution (runtime ingress)
1. Inngest calls `/api/inngest` with signed runtime event.
2. Inngest function `invoice.reconciliation` starts and enters `step.run("invoice/reconcile", ...)`.
3. Function calls package internal client `markReconciliationResult(...)`.
4. Package updates run status (`completed` or `failed`).
5. Inngest marks function run complete; status is now queryable from API surface.

## 7) Rationale and Trade-Offs
1. Split surfaces make caller semantics and runtime semantics explicit, which improves debuggability and policy control.
2. Reusing one internal package client for both API and workflow trigger paths prevents duplicated domain logic.
3. Trigger preflight in package logic avoids “enqueue first, fail later” drift.
4. Trade-off: composition and routing are more explicit and slightly more verbose.
5. Trade-off accepted: verbosity is intentional to avoid hidden coupling and policy ambiguity.

## 8) What Can Go Wrong + Guardrails
| Failure mode | Symptom | Guardrail |
| --- | --- | --- |
| Workflow trigger and runtime ingress collapse into one path | External callers hit `/api/inngest` directly | Keep `/api/workflows/*` and `/api/inngest` mounts separate with separate handlers |
| Trigger operation bypasses internal package client | Duplicate business rules in plugin operations | Require trigger operation preflight via `context.invoice.*` |
| Plugin-to-plugin runtime coupling | API plugin imports workflow plugin (or reverse) | Import package surfaces only (`@rawr/invoice-processing`) in both plugins |
| TypeBox drift to ad hoc schema styles | OpenAPI mismatch or validator mismatch | Keep `typeBoxStandardSchema(Type.*)` for all contracts/procedures |
| Hidden glue in composition | Hard-to-debug route ownership | Keep `rawr.hq.ts` explicit with per-capability `api` and `workflows` nodes |
| Context mismatch between host and handlers | `undefined` runtime/inngest at runtime | Use one shared context object injected at mount registration |

## 9) Explicit Policy Consistency Checklist
- [x] TypeBox-first contract and procedure schemas are used everywhere.
- [x] Internal package shape includes `domain/ service/ procedures/ router.ts client.ts errors.ts index.ts`.
- [x] API plugin shape uses `contract.ts + operations/* + router.ts + index.ts`.
- [x] Workflow plugin keeps trigger authoring split from durable function authoring.
- [x] Workflow trigger path is explicit (`/api/workflows/...`).
- [x] Inngest runtime ingress path is explicit and separate (`/api/inngest`).
- [x] Both API and workflow trigger operations use the same internal package client.
- [x] No plugin-to-plugin direct runtime coupling is introduced.
- [x] Composition glue is concrete (`rawr.hq.ts` + host mount code), not implicit.
