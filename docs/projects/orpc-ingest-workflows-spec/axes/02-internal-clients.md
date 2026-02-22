# Axis 02: Internal Clients and Internal Calling

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for server-internal calling and package-layer capability boundaries.
- **What it covers:** internal client defaults, package layering/schema conventions, caller-mode transport boundaries, and D-014 seam guarantees.
- **What this communicates:** server-internal behavior defaults to in-process package clients with explicit ownership and deterministic import direction.
- **Who should read this:** package authors, plugin authors wiring internal calls, and host owners defining infrastructure seam boundaries.
- **Jump conditions:** for external publication rules, jump to [01-external-client-generation.md](./01-external-client-generation.md); for workflow boundary ownership, jump to [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md); for D-014 composition guarantees, jump to [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md).


## In Scope
- Internal cross-boundary call defaults.
- Internal package layered default shape.
- Transport-neutral package constraints.

## Out of Scope
- External SDK generation path ownership (see [01-external-client-generation.md](./01-external-client-generation.md)).
- Workflow trigger and durability semantics (see [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)).

## Canonical Policy

### Core Internal-Calling Invariants
1. Default internal cross-boundary calls MUST use domain package in-process internal clients (`packages/<domain>/src/client.ts`).
2. Server runtime code MUST NOT self-call local HTTP (`/rpc`, `/api/orpc`) for in-process calls.
3. Boundary handlers SHOULD NOT directly call `inngest.send` unless they are designated workflow trigger routers.
4. Domain packages MUST remain transport-neutral.
5. Packages MUST NOT own workflow trigger/status boundary contracts or workflow boundary I/O schemas; those stay in `plugins/workflows/<capability>/src/contract.ts`.

### Schema, Context, and Naming Conventions
1. Domain schemas MUST be authored TypeBox-first and MUST export static types from the same file.
2. Within one `domain/` folder, filenames MUST avoid redundant domain-prefix tokens.
3. Package and plugin directory names SHOULD prefer concise domain names when unambiguous (for example `invoicing`).
4. Shared procedure context contracts MUST live in explicit `context.ts` (or equivalent dedicated context module), and routers/clients MUST consume that contract.
5. For object-root schema wrappers, docs should prefer `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
6. For non-`Type.Object` roots, docs/snippets should keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.

### Caller-Mode Route and Publication Rules
1. First-party callers (including MFEs by default) use `RPCLink` on `/rpc` when they need HTTP transport.
2. Server-internal callers MAY use in-process package internal clients with trusted service context.
3. External/third-party callers use published OpenAPI routes (`/api/orpc/*`, `/api/workflows/<capability>/*`); RPC clients are not externally published.
4. Caller traffic MUST NOT use `/api/inngest`; runtime ingress is runtime-only.

### D-014 Infrastructure and Composition Guarantees
1. Shared auth/db-ready infrastructure seams SHOULD be expressed as typed ports/contracts in package-oriented shared modules by default (interfaces + factory shapes), so package contexts can consume them without binding to a concrete adapter.
2. Concrete auth/db/runtime adapters MUST be composed and injected outside package internals (host/plugin composition), then consumed through package `context.ts` contracts.
3. Package internals MUST NOT instantiate process-global auth/db singletons; package logic stays adapter-agnostic and testable through injected ports.
4. Import direction MUST remain deterministic: packages MAY depend on shared infrastructure packages, plugins/hosts MAY depend on packages, and packages MUST NOT import plugins or host runtime modules.
5. D-014 composition guarantees for these seams are captured in [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md).

## Why
- Prevents “four ways to call” drift.
- Preserves deterministic call intent.
- Keeps package semantics transport-neutral and reusable.

## Trade-Offs
- Less flexibility for ad hoc shortcuts.
- Better consistency and lower long-term drift risk.

## Caller/Auth Matrix
This table is an axis-local projection of the canonical caller/auth matrix in [ARCHITECTURE.md](../ARCHITECTURE.md).

| Caller mode | Allowed routes | Default link/client | Publication boundary | Auth mode | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party MFE/internal caller | `/rpc` | `RPCLink` | internal only (never published) | first-party session/auth or trusted service context | `/api/inngest` |
| Server-internal in-process caller | in-process only | package internal client (`createRouterClient`) | internal only | trusted service context | local HTTP self-calls as default |
| External/third-party caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | externally published OpenAPI clients | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | `/api/inngest` | Inngest callback transport | runtime only | signed runtime ingress | browser/API caller traffic |

### Boundary ownership guardrail for internal calling
Even when package internal clients power server-internal execution, caller-facing workflow trigger/status contracts and their I/O schemas remain workflow plugin boundary owned. Internal client reuse does not transfer boundary ownership to packages.

## Internal Package Default (Pure Capability)
```text
packages/<domain>/src/
  domain/*
  service/*
  procedures/*
  context.ts
  router.ts
  client.ts
  browser.ts   # optional browser-safe helper exports only
  errors.ts
  index.ts
```

### Layer roles
- `domain/*`: TypeBox-first entities/value objects/invariants with co-located static type exports.
- `service/*`: pure use-case logic with injected dependencies.
- `procedures/*`: internal procedure boundary (schema + handlers).
- `context.ts`: shared context contract consumed by procedures/router/client.
- `router.ts`: package-internal route composition that consumes shared context contracts.
- `client.ts`: default internal invocation path.
- `errors.ts`: package-level typed errors.
- `index.ts`: package export surface.

## Core Infrastructure Layering Contract (D-014)
Status note: this section is canonical D-014 language mapped to `DECISIONS.md`.

| Layer | Owns | Must not own |
| --- | --- | --- |
| Shared infrastructure primitives (`packages/*` shared modules) | transport-neutral context/auth/db-ready ports, metadata types, pure helper/factory contracts | caller-facing workflow/API contracts, host mount wiring |
| Capability package internals (`packages/<domain>/src/*`) | domain/service/procedures/internal client using injected ports | boundary contract ownership, concrete host adapter creation |
| Boundary plugins (`plugins/api/*`, `plugins/workflows/*`) | caller-facing contracts/operations/router wiring to package clients | package-domain ownership transfer, global singleton adapter construction |
| Host composition (`apps/*`, `rawr.hq.ts`) | concrete adapter construction, dependency assembly, route registration/mount order | package-domain logic, boundary contract ownership |

### Deterministic guarantees
1. Package internal clients stay the server-internal default and consume infrastructure through typed context ports.
2. Plugin authors receive deterministic wiring expectations: boundary context + package client injection + no local HTTP self-call default.
3. Concrete auth/db/runtime adapter selection remains a host/composition concern and can evolve without package contract churn.
4. Shared infrastructure remains transport-neutral and reusable across API, workflow, and durable-runtime contexts.
5. This contract does not alter D-005, D-006, D-007, D-011, or D-012 semantics.

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
import { ORPCError, os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "@rawr/orpc-standards";
import { startInvoice } from "../service/lifecycle";
import type { InvoiceProcedureContext } from "../context";

const o = os.$context<InvoiceProcedureContext>();

export const startProcedure = o
  .input(schema({ invoiceId: Type.String(), requestedBy: Type.String() }))
  .output(schema({ runId: Type.String(), accepted: Type.Boolean() }))
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
// packages/invoicing/src/context.ts
import type { InvoiceServiceDeps } from "./service/lifecycle";

export type InvoiceProcedureContext = { deps: InvoiceServiceDeps };
```

### Internal client default
```ts
// packages/invoicing/src/router.ts
import { invoiceProcedures } from "./procedures";

export const invoiceInternalRouter = invoiceProcedures;
```

```ts
// packages/invoicing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoiceInternalRouter } from "./router";
import type { InvoiceProcedureContext } from "./context";

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
export { invoiceInternalRouter } from "./router";
export type { InvoiceProcedureContext } from "./context";
export { createInvoiceInternalClient } from "./client";
export * from "./errors";
```

### Example A (operation -> internal client)
```ts
// plugins/api/invoicing/src/operations/start.ts
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
5. Prefer concise domain naming for package/plugin directories when unambiguous (`packages/invoicing`, `plugins/api/invoicing`).
6. Shared context contract defaults to `context.ts` (or equivalent dedicated module), consumed by routers/clients.
7. In docs, prefer `schema({...})` for object-root wrappers (`schema({...})` => `std(Type.Object({...}))`).
8. Keep `std(...)` (or `typeBoxStandardSchema(...)`) explicit for non-`Type.Object` roots.

## References
- Local: `packages/core/src/orpc/hq-router.ts:5`
- Local: `apps/server/src/orpc.ts:104`
- oRPC: [Server-side clients](https://orpc.dev/docs/client/server-side)

## Cross-Axis Links
- External generation boundary: [01-external-client-generation.md](./01-external-client-generation.md)
- Split posture and anti-dual-path: [03-split-vs-collapse.md](./03-split-vs-collapse.md)
- Workflow trigger boundary exception: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Core infrastructure packaging + composition guarantees: [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md)
- Micro-frontend walkthrough: [e2e-03-microfrontend-integration.md](../examples/e2e-03-microfrontend-integration.md)
