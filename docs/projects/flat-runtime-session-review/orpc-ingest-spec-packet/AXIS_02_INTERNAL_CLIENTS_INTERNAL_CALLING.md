# Axis 02: Internal Clients and Internal Calling

## In Scope
- Internal cross-boundary call defaults.
- Internal package layered default shape.
- Transport-neutral package constraints.

## Out of Scope
- External SDK generation path ownership (see [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)).
- Workflow trigger and durability semantics (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).

## Canonical Policy
1. Default internal cross-boundary calls MUST use domain package in-process internal clients (`packages/<domain>/src/client.ts`).
2. Server runtime code MUST NOT self-call local HTTP (`/rpc`, `/api/orpc`) for in-process calls.
3. Boundary handlers SHOULD NOT directly call `inngest.send` unless they are designated workflow trigger routers.
4. Domain packages MUST remain transport-neutral.
5. Domain schemas MUST be authored TypeBox-first and MUST export static types from the same file.
6. Within one `domain/` folder, filenames MUST avoid redundant domain-prefix tokens.
7. Package and plugin directory names SHOULD prefer concise domain names when unambiguous (for example `invoicing`).

## Why
- Prevents “four ways to call” drift.
- Preserves deterministic call intent.
- Keeps package semantics transport-neutral and reusable.

## Trade-Offs
- Less flexibility for ad hoc shortcuts.
- Better consistency and lower long-term drift risk.

## Internal Package Default (Pure Capability)
```text
packages/<domain>/src/
  domain/*
  service/*
  procedures/*
  router.ts
  client.ts
  errors.ts
  index.ts
```

### Layer roles
- `domain/*`: TypeBox-first entities/value objects/invariants with co-located static type exports.
- `service/*`: pure use-case logic with injected dependencies.
- `procedures/*`: internal procedure boundary (schema + handlers).
- `router.ts`: package-internal route composition.
- `client.ts`: default internal invocation path.
- `errors.ts`: package-level typed errors.
- `index.ts`: package export surface.

## Canonical Snippets

### Domain layer
```ts
// packages/invoicing/src/domain/status.ts
import { Type, type Static } from "typebox";

export const InvoiceStatusSchema = Type.Union([
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("failed"),
  Type.Literal("canceled"),
]);

export type InvoiceStatus = Static<typeof InvoiceStatusSchema>;

export function canCancel(status: InvoiceStatus) {
  return status === "queued" || status === "running";
}
```

```ts
// packages/invoicing/src/domain/run.ts
import { Type, type Static } from "typebox";
import { InvoiceStatusSchema } from "./status";

export const InvoiceRunSchema = Type.Object({
  runId: Type.String(),
  invoiceId: Type.String(),
  requestedBy: Type.String(),
  status: InvoiceStatusSchema,
});

export type InvoiceRun = Static<typeof InvoiceRunSchema>;
```

### Service layer
```ts
// packages/invoicing/src/service/lifecycle.ts
import type { InvoiceRun } from "../domain/run";

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
// packages/invoicing/src/service/status.ts
export async function getInvoiceStatus(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  return run ? { runId: run.runId, status: run.status } : { runId: input.runId, status: "failed" as const };
}
```

```ts
// packages/invoicing/src/service/cancellation.ts
export async function cancelInvoice(deps: InvoiceServiceDeps, input: { runId: string }) {
  const run = await deps.getRun(input.runId);
  if (!run || !canCancel(run.status)) return { accepted: false as const };
  await deps.updateStatus(input.runId, "canceled");
  return { accepted: true as const };
}
```

### Internal procedure boundary
```ts
// packages/invoicing/src/procedures/start.ts
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
// packages/invoicing/src/procedures/index.ts
export const invoiceProcedures = {
  start: startProcedure,
  getStatus: getStatusProcedure,
  cancel: cancelProcedure,
} as const;
```

```ts
// packages/invoicing/src/router.ts
export type InvoiceProcedureContext = { deps: InvoiceServiceDeps };
export const invoiceInternalRouter = invoiceProcedures;
```

### Internal client default
```ts
// packages/invoicing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";

export function createInvoiceInternalClient(context: InvoiceProcedureContext) {
  return createRouterClient(invoiceInternalRouter, { context });
}
```

```ts
// packages/invoicing/src/errors.ts
export class InvoiceNotFoundError extends Error {
  constructor(public readonly runId: string) {
    super(`Invoice run not found: ${runId}`);
  }
}
```

```ts
// packages/invoicing/src/index.ts
export * from "./domain/run";
export * from "./service";
export { invoiceInternalRouter, type InvoiceProcedureContext } from "./router";
export { createInvoiceInternalClient } from "./client";
export * from "./errors";
```

### Example A (operation -> internal client)
```ts
// plugins/api/invoicing-api/src/operations/start.ts
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
3. Domain filenames omit redundant domain prefixes when already scoped by folder (`domain/status.ts`, not `domain/invoice-status.ts` for `invoicing`).
4. Domain schema modules co-locate TypeBox schema values and static type exports.
5. Prefer concise domain naming for package/plugin directories when unambiguous (`packages/invoicing`, `plugins/api/invoicing-api`).

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
- oRPC: [Server-side clients](https://orpc.dev/docs/client/server-side)

## Cross-Axis Links
- External generation boundary: [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Split posture and anti-dual-path: [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Workflow trigger boundary exception: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
