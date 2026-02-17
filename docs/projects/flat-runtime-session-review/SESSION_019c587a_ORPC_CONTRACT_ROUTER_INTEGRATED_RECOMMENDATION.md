# SESSION_019c587a — ORPC Contract-First vs Router-First (Integrated Recommendation)

This is the locked default for **pure domain packages** in the deliberate hybrid posture.

- Internal package default: **router/service-first**.
- Boundary plugin default (API/workflow triggers): **contract-first**.
- Goal: one stable structure that agents can follow without architecture decisions per change.

## 1) Domain

### Policy
1. One domain package represents **one capability boundary** (for example, `invoice-processing`).
2. Inside that package, domain is split into **domain modules**, not one giant file.
3. `domain/` contains domain entities/value objects/invariants only.
4. `domain/` never contains oRPC wiring, transport concerns, or procedure handlers.

### What goes here
- Domain types and invariants (`Invoice`, `InvoiceStatus`, transitions, guards).
- Domain-level pure helpers that are not transport-aware.

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
1. A package is one capability boundary, but can have **multiple service modules**.
2. `service/` is where business use-cases live (pure TS).
3. Keep modules cohesive by concern (`lifecycle`, `status`, `administration`), not by transport.
4. Use `service/index.ts` as the package-local composition point for service modules.
5. Service modules must remain callable without oRPC/HTTP/Inngest.

### What goes here
- Use-case logic and orchestration across domain primitives.
- Dependency-injected side effects (storage, IDs, clocks, etc.) via typed deps.

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
1. Internal package RPC surface is always explicit in top-level `procedures/`.
2. One file per exposed procedure is the default.
3. Procedures are internal RPC endpoints; they define:
- input schema,
- output schema,
- metadata,
- middleware/auth/context/error mapping,
- handler.
4. Input/output schemas are authored **inline in each procedure** (no standalone IO schema files by default).
5. Procedures may compose one or multiple service functions; they are not required to be 1:1 wrappers.

### What goes here
- Internal package endpoint definitions callable by internal client.
- The exact exposed surface area (clear for agents and reviewers).

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
1. `router.ts` composes procedures into one package router; do not put business logic in router.
2. `client.ts` is the default internal call path (`createRouterClient(...)`).
3. `errors.ts` is for shared error types/mappers used across procedures and services.
4. Boundary plugins consume this package via the internal client and stay boundary contract-first.

### What goes here
- Router composition.
- Internal client creation.
- Shared error definitions/mapping helpers.

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

### Boundary adoption note (still supported)
API/workflow trigger plugins can still adopt some/most/all package procedures:
1. Default: boundary `contract.ts` wraps internal client calls in plugin handlers.
2. High-overlap exception: derive/adopt from internal router where boundary semantics are effectively 1:1.

## 5) Index

### Policy
1. `index.ts` is the public package surface and must be explicit.
2. Export only stable artifacts needed by callers/composition.
3. Do not force callers to deep-import internal files.

### What goes here
- Re-exports for domain, service API, procedures router/client/errors.

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

## Agent-facing checklist (use this, no branching)
1. Add/modify domain concept: edit `domain/*`.
2. Add/modify business behavior: edit `service/*`.
3. Expose new internal RPC endpoint: add `procedures/<name>.ts`, then wire `procedures/index.ts`.
4. Do not put business logic in `router.ts`.
5. Call package from other internal code via `createInvoiceInternalClient(...)`.
6. Keep boundary plugins contract-first; internal package stays procedure-first.
