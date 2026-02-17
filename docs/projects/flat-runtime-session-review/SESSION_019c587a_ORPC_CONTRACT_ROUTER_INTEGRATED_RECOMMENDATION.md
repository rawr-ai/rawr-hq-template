# SESSION_019c587a — ORPC Contract-First vs Router-First (Integrated Recommendation)

This document is intentionally split into two parts:
1. **Canonical internal pure-package shape** (sections `1` through `5`) for zero-ambiguity authoring.
2. **Preserved complementary context** that remains valid and non-conflicting with the canonical shape.

---

## 1) Domain

### Policy
1. One domain package represents one capability boundary (for example, `invoice-processing`).
2. `domain/` contains entities, value objects, and invariants only.
3. `domain/` must stay transport-neutral (no oRPC handlers, no HTTP semantics, no Inngest runtime wiring).
4. Domain modeling can span multiple files/modules; do not collapse it into a single giant file.

### Canonical structure

```text
packages/invoice-processing/src/
  domain/
    invoice.ts
    invoice-status.ts
```

### Example

```ts
// packages/invoice-processing/src/domain/invoice-status.ts
export const INVOICE_STATUS = ["queued", "running", "completed", "failed", "canceled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export function canCancel(status: InvoiceStatus) {
  return status === "queued" || status === "running";
}
```

## 2) Service

### Policy
1. A package is one capability boundary, but can and should contain multiple service modules.
2. `service/` is pure TypeScript use-case/business logic.
3. Split service modules by cohesive concern (`lifecycle`, `status`, `cancellation`, `administration`), not by transport layer.
4. `service/index.ts` is the package-local service composition/export point.
5. Service code must be runnable without oRPC/HTTP/Inngest.

### Canonical structure

```text
packages/invoice-processing/src/
  service/
    lifecycle.ts
    status.ts
    cancellation.ts
    index.ts
```

### Example

```ts
// packages/invoice-processing/src/service/lifecycle.ts
export type InvoiceServiceDeps = {
  newRunId: () => string;
  saveRun: (run: { runId: string; status: "queued" | "running" | "completed" | "failed" | "canceled" }) => Promise<void>;
  getRun: (runId: string) => Promise<{ runId: string; status: "queued" | "running" | "completed" | "failed" | "canceled" } | null>;
  cancelRun: (runId: string) => Promise<void>;
};

export async function startInvoice(deps: InvoiceServiceDeps, input: { invoiceId: string; requestedBy: string }) {
  const runId = deps.newRunId();
  await deps.saveRun({ runId, status: "queued" });
  return { runId, accepted: true as const };
}
```

```ts
// packages/invoice-processing/src/service/index.ts
export { startInvoice, type InvoiceServiceDeps } from "./lifecycle";
export { getInvoiceStatus } from "./status";
export { cancelInvoice } from "./cancellation";
```

## 3) Procedures

### Policy
1. Internal RPC surface is always explicit in top-level `procedures/`.
2. One file per exposed procedure is the default.
3. Procedures are the internal service boundary; they define schema, metadata, middleware/cross-cutting concerns, and handler.
4. Input/output schemas are inlined in each procedure by default (no standalone IO schema files).
5. Procedures can call one or many service functions (not required to be 1:1 wrappers).

### Canonical structure

```text
packages/invoice-processing/src/
  procedures/
    start.ts
    get-status.ts
    cancel.ts
    index.ts
```

### Example

```ts
// packages/invoice-processing/src/procedures/start.ts
import { os, ORPCError } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { startInvoice } from "../service";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const startProcedure = o
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
  .handler(async ({ context, input }) => {
    try {
      return await startInvoice(context.deps, input);
    } catch {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to start invoice processing",
      });
    }
  });
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

## 4) Router client errors

### Policy
1. `router.ts` composes procedures into one package router; no business logic in router.
2. `client.ts` is the default internal call path (`createRouterClient(...)`).
3. `errors.ts` contains shared domain/service/procedure error types and mapping helpers.
4. Other packages/plugins call this package through its internal client unless there is a specific direct-call reason.

### Canonical structure

```text
packages/invoice-processing/src/
  router.ts
  client.ts
  errors.ts
```

### Example

```ts
// packages/invoice-processing/src/errors.ts
export class InvoiceNotFoundError extends Error {
  constructor(public readonly runId: string) {
    super(`Invoice run not found: ${runId}`);
  }
}

export class InvoiceInvalidStateError extends Error {
  constructor(public readonly status: string) {
    super(`Invoice cannot transition from status: ${status}`);
  }
}
```

```ts
// packages/invoice-processing/src/router.ts
import { invoiceProcedures } from "./procedures";
import type { InvoiceServiceDeps } from "./service";

export type InvoiceProcedureContext = {
  deps: InvoiceServiceDeps;
};

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

## 5) Index

### Policy
1. `index.ts` is the explicit package public surface.
2. Export stable artifacts only; avoid forcing deep imports.
3. Re-export domain, service, router/client, and errors intentionally.

### Canonical structure

```text
packages/invoice-processing/src/
  index.ts
```

### Example

```ts
// packages/invoice-processing/src/index.ts
export * from "./domain/invoice";
export * from "./domain/invoice-status";

export * from "./service";

export { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";
export { createInvoiceInternalClient } from "./client";

export * from "./errors";
```

---

## Preserved Complementary Context (Restored)

### Inputs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_N_ORPC_SANITY_CHECK_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

### Why prior drift happened
The prior revision over-corrected while trying to illustrate scale (`N=3`) and contract-first mechanics. It accidentally made optional decomposition look mandatory and introduced low-value conditional authoring choices.

### Locked converged hybrid posture
1. Internal pure packages: router/service-first default (this doc sections `1`–`5`).
2. Boundary plugins (API/workflow trigger): contract-first default.
3. Inngest ingress remains separate (`/api/inngest`).
4. Workflow trigger APIs remain separate boundary surfaces (`/api/workflows/...`).

### Boundary plugin default (preserved)

N=1:

```text
plugins/api/invoice-api/src/
  contract.ts
  operations/
    start.ts
  router.ts
  index.ts
```

N=3:

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
});
```

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import { createInvoiceInternalClient, type InvoiceProcedureContext } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";

export type InvoiceApiContext = InvoiceProcedureContext & {
  invoice: ReturnType<typeof createInvoiceInternalClient>;
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

### Adoption capability (preserved)
We did **not** lose the ability for an API plugin to adopt some/most/all of the package surface.

1. Default: boundary `contract.ts` wraps package internal client calls.
2. High-overlap exception: adopt/derive from package router when semantics are effectively 1:1.

### One scale rule (preserved)
If scale requires splitting, split implementation handlers (`operations/*`) while keeping one boundary `contract.ts` as the API source of truth.

### Final recommendation (unchanged)
1. Internal pure packages follow sections `1`–`5` in this document.
2. Boundary plugins stay contract-first.
3. Keep naming canonical and short (`contract.ts`, `router.ts`, `client.ts`, `index.ts`, `errors.ts`).
4. Avoid optional architecture branches in default authoring flow.

---

## Agent Checklist (No Branching)
1. Domain change: edit `domain/*`.
2. Business logic change: edit `service/*`.
3. New internal endpoint: add `procedures/<name>.ts`, wire `procedures/index.ts`.
4. Keep router composition-only; no business logic in `router.ts`.
5. Use `createInvoiceInternalClient(...)` for internal calls.
6. For boundary APIs/workflow triggers, use contract-first plugin shape.
