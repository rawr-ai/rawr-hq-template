# Axis 02: Internal Clients and Internal Calling

## In Scope
- Internal cross-boundary call defaults.
- Internal package layered default shape.
- Transport-neutral package constraints.

## Out of Scope
- External SDK generation path ownership (see [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)).
- Workflow trigger and durability semantics (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).

## Canonical Policy
1. Default internal cross-boundary calls MUST use capability in-process internal clients (`packages/<capability>/src/client.ts`).
2. Server runtime code MUST NOT self-call local HTTP (`/rpc`, `/api/orpc`) for in-process calls.
3. Boundary handlers SHOULD NOT directly call `inngest.send` unless they are designated workflow trigger routers.
4. Domain packages MUST remain transport-neutral.

## Why
- Prevents “four ways to call” drift.
- Preserves deterministic call intent.
- Keeps package semantics transport-neutral and reusable.

## Trade-Offs
- Less flexibility for ad hoc shortcuts.
- Better consistency and lower long-term drift risk.

## Internal Package Default (Pure Capability)
```text
packages/<capability>/src/
  domain/*
  service/*
  procedures/*
  router.ts
  client.ts
  errors.ts
  index.ts
```

### Layer roles
- `domain/*`: entities/value objects and invariants only.
- `service/*`: pure use-case logic with injected dependencies.
- `procedures/*`: internal procedure boundary (schema + handlers).
- `router.ts`: package-internal route composition.
- `client.ts`: default internal invocation path.
- `errors.ts`: package-level typed errors.
- `index.ts`: package export surface.

## Canonical Snippets

### Domain layer
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

### Service layer
```ts
// packages/invoice-processing/src/service/lifecycle.ts
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
export async function getInvoiceStatus(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  return run ? { runId: run.runId, status: run.status } : { runId: input.runId, status: "failed" as const };
}
```

```ts
// packages/invoice-processing/src/service/cancellation.ts
export async function cancelInvoice(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  if (!run || !canCancel(run.status)) return { accepted: false as const };
  await deps.updateStatus(input.runId, "canceled");
  return { accepted: true as const };
}
```

### Internal procedure boundary
```ts
// packages/invoice-processing/src/procedures/start.ts
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
// packages/invoice-processing/src/procedures/index.ts
export const invoiceProcedures = {
  start: startProcedure,
  getStatus: getStatusProcedure,
  cancel: cancelProcedure,
} as const;
```

```ts
// packages/invoice-processing/src/router.ts
export type InvoiceProcedureContext = { deps: InvoiceServiceDeps };
export const invoiceInternalRouter = invoiceProcedures;
```

### Internal client default
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

```ts
// packages/invoice-processing/src/index.ts
export * from "./domain/invoice";
export * from "./service";
export { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";
export { createInvoiceInternalClient } from "./client";
export * from "./errors";
```

### Example A (operation -> internal client)
```ts
// plugins/api/invoice-processing-api/src/operations/start.ts
export async function startInvoiceOperation(
  context: InvoiceApiContext,
  input: { invoiceId: string; requestedBy: string },
) {
  return context.invoice.start(input);
}
```

## Naming Defaults (Applicable)
1. Canonical role names: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
2. Internal layered defaults may include: `domain/*`, `service/*`, `procedures/*`, `errors.ts`.

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
- oRPC: [Server-side clients](https://orpc.dev/docs/client/server-side)

## Cross-Axis Links
- External generation boundary: [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Split posture and anti-dual-path: [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Workflow trigger boundary exception: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
