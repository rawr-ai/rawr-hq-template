# SESSION_019c587a — ORPC Contract-First vs Router-First (Integrated Recommendation)

## Inputs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_N_ORPC_SANITY_CHECK_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## What Went Wrong In The Prior Revision
The prior revision over-corrected while trying to illustrate scale (`N=3`) and contract-first mechanics. That turned optional decomposition patterns into implied defaults:

1. It made internal package shape look like `contract + router + operations`, which is not the intended internal default.
2. It made API plugin shape look like `contracts/* + handlers/* + recomposition`, which is valid but too heavy as the baseline.
3. It introduced threshold/conditional language in too many places, forcing unnecessary authoring decisions.

That is why it felt like thrash: the document shifted from policy clarity to structure experimentation.

## Locked Converged Posture (No Optional Churn)

### 1) Internal domain package (pure package) — **router/service-first default**
Use one stable shape:

- `services/*`: pure domain logic.
- `router.ts`: one package router; procedures are authored here (inline input/output schemas + metadata + handlers).
- `client.ts`: in-process client exported for internal callers.
- `index.ts`: package exports.

Do **not** introduce per-operation contract files in internal packages by default.
Do **not** nest `operations` under `internal` as a canonical pattern.

### 2) API plugin (boundary surface) — **contract-first default**
Use one stable shape:

- `contract.ts`: full boundary contract for that API plugin namespace.
- `operations/*`: implementation functions (one file per operation is fine).
- `router.ts`: `implement(contract)` + operation binding.
- `index.ts`: exports for composition.

Do **not** use per-operation `contracts/*` as the default.

### 3) Workflow trigger API plugin — **same contract-first default as API plugin**
Use the same shape as API plugins (`contract.ts`, `operations/*`, `router.ts`, `index.ts`) for `/api/workflows/...` trigger surfaces.
Inngest ingress remains separate (`/api/inngest`).

## Canonical Structures (N=1 and N=3)

### Internal domain package

N=1:

```text
packages/invoice-processing/src/
  services/
    invoice-service.ts
  router.ts
  client.ts
  index.ts
```

N=3 (same shape, more procedures, no structure rewrite):

```text
packages/invoice-processing/src/
  services/
    invoice-service.ts
  router.ts
  client.ts
  index.ts
```

### API plugin (boundary)

N=1:

```text
plugins/api/invoice-api/src/
  contract.ts
  operations/
    start.ts
  router.ts
  index.ts
```

N=3 (scaled):

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

## Code Illustration (Canonical Defaults)

### A) Internal domain package — router/service-first

```ts
// packages/invoice-processing/src/services/invoice-service.ts
export type InvoiceServiceDeps = {
  newRunId: () => string;
  saveRun: (run: { runId: string; status: "queued" | "running" | "completed" | "failed" }) => Promise<void>;
  getRun: (runId: string) => Promise<{ runId: string; status: "queued" | "running" | "completed" | "failed" } | null>;
  cancelRun: (runId: string) => Promise<void>;
};

export async function startInvoice(deps: InvoiceServiceDeps, input: { invoiceId: string; requestedBy: string }) {
  const runId = deps.newRunId();
  await deps.saveRun({ runId, status: "queued" });
  return { runId, accepted: true as const };
}

export async function getInvoiceStatus(deps: InvoiceServiceDeps, input: { runId: string }) {
  return (await deps.getRun(input.runId)) ?? { runId: input.runId, status: "failed" as const };
}

export async function cancelInvoice(deps: InvoiceServiceDeps, input: { runId: string }) {
  await deps.cancelRun(input.runId);
  return { accepted: true as const };
}
```

```ts
// packages/invoice-processing/src/router.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { cancelInvoice, getInvoiceStatus, startInvoice, type InvoiceServiceDeps } from "./services/invoice-service";

export type InvoicePackageContext = {
  deps: InvoiceServiceDeps;
};

const o = os.$context<InvoicePackageContext>();

export const invoiceInternalRouter = {
  start: o
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            invoiceId: Type.String({ minLength: 1 }),
            requestedBy: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            accepted: Type.Literal(true),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .handler(({ context, input }) => startInvoice(context.deps, input)),

  getStatus: o
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            status: Type.Union([
              Type.Literal("queued"),
              Type.Literal("running"),
              Type.Literal("completed"),
              Type.Literal("failed"),
            ]),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .handler(({ context, input }) => getInvoiceStatus(context.deps, input)),

  cancel: o
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            accepted: Type.Literal(true),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .handler(({ context, input }) => cancelInvoice(context.deps, input)),
} as const;
```

```ts
// packages/invoice-processing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter, type InvoicePackageContext } from "./router";

export function createInvoiceInternalClient(context: InvoicePackageContext) {
  return createRouterClient(invoiceInternalRouter, { context });
}
```

### B) API plugin — contract-first with centralized contract + operation handlers

```ts
// plugins/api/invoice-api/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/start" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            invoiceId: Type.String({ minLength: 1 }),
            requestedBy: Type.String({ minLength: 1 }),
            traceToken: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            accepted: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    ),

  getInvoiceProcessingStatus: oc
    .route({ method: "GET", path: "/invoices/processing/{runId}" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            status: Type.Union([
              Type.Literal("queued"),
              Type.Literal("running"),
              Type.Literal("completed"),
              Type.Literal("failed"),
            ]),
          },
          { additionalProperties: false },
        ),
      ),
    ),

  cancelInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/{runId}/cancel" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            accepted: Type.Literal(true),
          },
          { additionalProperties: false },
        ),
      ),
    ),
});
```

```ts
// plugins/api/invoice-api/src/operations/start.ts
import type { InvoiceApiContext } from "../router";

export async function startInvoiceOperation(context: InvoiceApiContext, input: { invoiceId: string; requestedBy: string }) {
  return context.invoice.start({ invoiceId: input.invoiceId, requestedBy: input.requestedBy });
}
```

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import type { InvoicePackageContext } from "@rawr/invoice-processing";
import { createInvoiceInternalClient } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";
import { getStatusOperation } from "./operations/get-status";
import { cancelOperation } from "./operations/cancel";

export type InvoiceApiContext = InvoicePackageContext & {
  invoice: ReturnType<typeof createInvoiceInternalClient>;
};

const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

export function createInvoiceApiRouter() {
  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) => startInvoiceOperation(context, input)),
    getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(({ context, input }) => getStatusOperation(context, input)),
    cancelInvoiceProcessing: os.cancelInvoiceProcessing.handler(({ context, input }) => cancelOperation(context, input)),
  });
}
```

## One Scale Rule (Only Rule)
If scale requires splitting, split **implementation handlers only** (`operations/*`) and keep one plugin `contract.ts` as boundary source of truth.

Do not add per-operation contract files unless an explicit governance requirement is approved.

## Final Recommendation
Keep the explicit hybrid, but keep it simple and strict:

1. Internal domain packages: `services/* + router.ts + client.ts`.
2. API/workflow trigger plugins: `contract.ts + operations/* + router.ts`.
3. No extra conditional structure trees in baseline guidance.
