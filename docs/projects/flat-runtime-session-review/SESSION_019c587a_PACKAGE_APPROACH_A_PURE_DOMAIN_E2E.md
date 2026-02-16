# SESSION_019c587a — Package Approach A (Pure Domain) End-to-End

## Position (Approach A)
Packages are pure domain/service modules.

- Package domain layer owns domain schemas/types, invariants, and domain logic implementation.
- Package also owns an internal contract for using core logic.
- Boundary layers (API/workflows/events) own boundary contracts/shapes/semantics and orchestration glue.
- Boundary imports are one-way: boundary -> domain package.
- Runtime plugin-to-plugin imports are disallowed.
- `rawr.hq.ts` is the only cross-surface composition authority.

## Hard Clarification Integration (2026-02-16)

| Clarification | Incorporated Design | Evaluation |
| --- | --- | --- |
| Standalone schemas in packages should be true domain schemas/types, not boundary IO wrappers. | Package schema files contain domain entities/aggregates/status types only. | Improves domain stability and reuse; avoids IO wrapper sprawl. |
| Input/output schemas should be embedded in contract definitions unless strong reuse reason. | Internal and boundary contracts embed their IO shapes inline at contract definition sites. | Keeps contracts self-describing; increases local duplication but reduces indirection. |
| Domain package owns logic + domain schemas/types + internal contract. | `packages/invoice-processing/src/domain/*` + `packages/invoice-processing/src/contracts/internal.contract.ts`. | Clean core boundary; internal contract becomes explicit stable entrypoint. |
| Internal contract is not necessarily 1:1 with API/workflow/event contracts. | Boundary contracts in plugins can project, aggregate, or split internal operations. | Enables safer public boundary evolution without destabilizing core contract. |
| Boundary layers define their own contracts/glue, one-way import into domain. | API/workflow contracts and runtime semantics live in `plugins/*`, importing only from package. | Strong directionality improves maintainability and prevents domain contamination by runtime concerns. |

## Evidence Classification

### Observed
1. User intent requires package purity and single composition point.
- `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:400`
- `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:413`

2. Locked proposal already enforces package-first authoring, no runtime plugin-to-plugin imports, and `rawr.hq.ts` composition.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:19`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:23`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`

3. Spec decision D-001 confirms API/workflow split with package-owned contracts/events mediating handoff.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md:11`

4. Axis 03 defines service-in-package / adapters-in-plugins and `rawr.hq.ts` as composition point.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:20`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:535`

5. Today-state still composes runtime in app layer and keeps static contract assembly in `packages/core`.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`

### Inferred
1. The clean Approach A cut is: package internal contract as core interface, boundary contracts in adapters.
2. A1 should mount/re-export package internal contract surface.
3. A2 should define/extend boundary contract semantics in plugin, mapping into domain core.

## End-to-End Target Architecture (Concrete File Tree)

```text
.
├── rawr.hq.ts
├── apps/
│   └── server/
│       └── src/
│           ├── rawr.ts
│           ├── orpc/
│           │   └── register-routes.ts
│           └── inngest/
│               └── register-route.ts
├── packages/
│   ├── core/
│   ├── hq/
│   └── invoice-processing/
│       └── src/
│           ├── domain/
│           │   ├── types.ts
│           │   ├── aggregates.ts
│           │   └── service.ts
│           ├── contracts/
│           │   ├── typebox-standard-schema.ts
│           │   └── internal.contract.ts
│           ├── clients/
│           │   └── internal-client.ts
│           └── index.ts
└── plugins/
    ├── api/
    │   └── invoice-processing-api/
    │       └── src/
    │           ├── contract.boundary.ts
    │           ├── router.ts
    │           ├── adapters/
    │           │   └── invoice-internal-surface.adapter.ts
    │           └── index.ts
    └── workflows/
        └── invoice-processing-workflows/
            └── src/
                ├── contract.event.ts
                └── index.ts
```

Onboarding baseline above is the n=1 shape. The following is the explicit n>1 growth shape.

## Scaled Variant (n>1) For Multi-Capability Growth

### Multi-instance file tree (single contract + single router per API plugin)
```text
.
├── rawr.hq.ts
├── packages/
│   └── invoice-processing/
│       └── src/
│           ├── contracts/
│           │   ├── internal.contract.ts
│           │   └── typebox-standard-schema.ts
│           ├── services/
│           │   ├── invoice-lifecycle.service.ts
│           │   ├── invoice-admin.service.ts
│           │   └── index.ts
│           ├── clients/
│           │   ├── internal-client.ts
│           │   ├── admin-client.ts
│           │   └── telemetry-client.ts
│           └── index.ts
├── plugins/
│   ├── api/
│   │   └── invoice-processing-api/
│   │       └── src/
│   │           ├── contract.boundary.ts
│   │           ├── router.ts
│   │           ├── modules/
│   │           │   ├── runs.module.ts
│   │           │   ├── admin.module.ts
│   │           │   └── index.ts
│   │           └── index.ts
│   └── workflows/
│       └── invoice-processing-workflows/
│           └── src/
│               ├── contract.event.ts
│               ├── functions/
│               │   ├── reconcile-invoice.fn.ts
│               │   ├── timeout-invoice.fn.ts
│               │   ├── notify-stakeholders.fn.ts
│               │   └── index.ts
│               └── index.ts
└── apps/
    └── server/
        └── src/
            ├── orpc/register-routes.ts
            ├── inngest/register-route.ts
            └── rawr.ts
```

### One-file-per-function organization (workflows)
```ts
// plugins/workflows/invoice-processing-workflows/src/functions/index.ts
import type { Inngest } from "inngest";
import type { InvoiceDeps } from "@rawr/invoice-processing";
import { createReconcileInvoiceFunction } from "./reconcile-invoice.fn";
import { createTimeoutInvoiceFunction } from "./timeout-invoice.fn";
import { createNotifyStakeholdersFunction } from "./notify-stakeholders.fn";

export function createInvoiceWorkflowFunctions(client: Inngest, deps: InvoiceDeps) {
  return [
    createReconcileInvoiceFunction(client, deps),
    createTimeoutInvoiceFunction(client, deps),
    createNotifyStakeholdersFunction(client, deps),
  ] as const;
}
```

### Capability-module-first organization (logic default)
```text
plugins/api/invoice-processing-api/src/
├── contract.boundary.ts   # single plugin contract
├── router.ts              # single plugin router
├── modules/
│   ├── runs.module.ts
│   ├── admin.module.ts
│   └── index.ts
└── index.ts
```

```ts
// plugins/api/invoice-processing-api/src/modules/index.ts
import { runsModule } from "./runs.module";
import { adminModule } from "./admin.module";

export const invoiceApiModules = {
  runs: runsModule,
  admin: adminModule,
} as const;
```

When a module grows beyond cohesion/size thresholds, split into `operations/*.operation.ts` under that module.

### Service evolution: single service -> cohesive service set
```text
packages/invoice-processing/src/services/
├── invoice-lifecycle.service.ts  # start/getStatus/reconcile grouped
├── invoice-admin.service.ts      # forceReconcile/cancel/retry grouped
└── index.ts                      # only public entrypoint for service layer
```

### Stable import/dependency patterns under growth

| Producer | Allowed imports | Disallowed imports |
| --- | --- | --- |
| `packages/invoice-processing/src/domain/**` | local domain modules only | `services/**`, `clients/**`, `plugins/**`, transport/adapters |
| `packages/invoice-processing/src/services/**` | `domain/**`, `ports/**`, `contracts/internal/**` | `plugins/**`, app host routes |
| `plugins/api/**` | `@rawr/invoice-processing` public exports only | `plugins/workflows/**`, deep imports into `services/*/*.ts` |
| `plugins/workflows/**` | `@rawr/invoice-processing` public exports only | `plugins/api/**`, app-host route modules |
| `apps/server/**` | `rawr.hq.ts`, plugin registrars | domain internals via deep imports |

Growth rule: keep one API plugin contract + one API plugin router; scale by adding cohesive capability modules, not additional plugin contracts/routers.
Growth rule: add new workflow functions as one-file-per-function under `functions/` and aggregate through `functions/index.ts`.
Growth rule: split a capability module into per-operation files only when complexity/churn warrants it (for example >250 LOC, >5 operations, or high concurrent edits).
Growth rule: keep service APIs capability-cohesive first; aggregate via `services/index.ts`.
Growth rule: never bypass public layer barrels with deep imports.
Approach A guardrail: boundary contracts/events stay in plugin layer by default; package contracts remain internal/domain-facing.

## Ownership: Contracts, Implementation, Clients

| Concern | Owns It | Path | Notes |
| --- | --- | --- | --- |
| Domain schemas/types | Package domain | `packages/invoice-processing/src/domain/types.ts` | Domain entities/status/aggregates only. |
| Domain logic | Package domain | `packages/invoice-processing/src/domain/service.ts` | No HTTP, no event bus, no `step.run`, no runtime lifecycle. |
| TypeBox->oRPC schema bridge | Package contracts | `packages/invoice-processing/src/contracts/typebox-standard-schema.ts` | Explicit Standard Schema adapter; avoids hidden validation behavior. |
| Internal core contract | Package | `packages/invoice-processing/src/contracts/internal.contract.ts` | Embedded IO shapes; stable core contract. |
| Internal contract handlers/router | API plugin adapter layer | `plugins/api/invoice-processing-api/src/adapters/invoice-internal-surface.adapter.ts` | `implement()` + handler mapping live in adapter layer; package remains domain/contract focused. |
| Boundary API contract | API plugin | `plugins/api/invoice-processing-api/src/contract.boundary.ts` | Embedded boundary IO shapes and boundary semantics. |
| Boundary workflow/event contract | Workflow plugin | `plugins/workflows/invoice-processing-workflows/src/contract.event.ts` | Event payload semantics for runtime orchestration. |
| Runtime orchestration glue | Boundary plugins | `plugins/api/*`, `plugins/workflows/*` | Policy/auth/step orchestration belongs here. |
| Clients | Package | `packages/invoice-processing/src/clients/internal-client.ts` | Typed client for internal consumers/tests. |
| Composition authority | Root manifest | `rawr.hq.ts` | Single assembly authority. |
| oRPC mount wrapper | App host | `apps/server/src/orpc/register-routes.ts` | Prefix alignment + `parse: "none"` forwarding for RPC/OpenAPI handlers. |
| Inngest mount wrapper | App host | `apps/server/src/inngest/register-route.ts` | Single ingress route wrapper for `serve()` handler + signing key wiring. |
| Mounting composition | App host | `apps/server/src/rawr.ts` | Calls both wrappers; keeps runtime entrypoint explicit. |

## Import Direction Rule (Hard)

Allowed:
- `plugins/api/**` -> `@rawr/invoice-processing`
- `plugins/workflows/**` -> `@rawr/invoice-processing`
- `apps/server/**` -> `../../rawr.hq`

Disallowed:
- `plugins/api/**` -> `plugins/workflows/**`
- `plugins/workflows/**` -> `plugins/api/**`
- `packages/invoice-processing/**` -> `plugins/**`

## Domain Package Example (Domain Types + Internal Contract)

### Domain types (standalone package schemas are domain-only)
```ts
// packages/invoice-processing/src/domain/types.ts
import { Type, type Static } from "typebox";

export const InvoiceStatusSchema = Type.Union([
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("failed"),
]);

export const InvoiceAggregateSchema = Type.Object({
  runId: Type.String({ minLength: 1 }),
  invoiceId: Type.String({ minLength: 1 }),
  status: InvoiceStatusSchema,
});

export type InvoiceStatus = Static<typeof InvoiceStatusSchema>;
export type InvoiceAggregate = Static<typeof InvoiceAggregateSchema>;
```

### TypeBox -> Standard Schema bridge (explicit plumbing, no magic)
```ts
// packages/invoice-processing/src/contracts/typebox-standard-schema.ts
import type { Schema, SchemaIssue } from "@orpc/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;
  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~")))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
  return segments.length > 0 ? segments : undefined;
}

export function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) {
          return { value: value as Static<T> };
        }
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

### Internal contract (IO shapes embedded in contract)
```ts
// packages/invoice-processing/src/contracts/internal.contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { InvoiceStatusSchema } from "../domain/types";
import { typeBoxStandardSchema } from "./typebox-standard-schema";

export const invoiceInternalContract = oc.router({
  start: oc
    .input(
      typeBoxStandardSchema(
        Type.Object({
          invoiceId: Type.String({ minLength: 1 }),
          requestedBy: Type.String({ minLength: 1 }),
        }),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String({ minLength: 1 }),
          status: InvoiceStatusSchema,
        }),
      ),
    ),

  getStatus: oc
    .input(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String({ minLength: 1 }),
        }),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String({ minLength: 1 }),
          status: InvoiceStatusSchema,
        }),
      ),
    ),
});
```

### Internal surface implementation (adapter-owned handlers)
```ts
// plugins/api/invoice-processing-api/src/adapters/invoice-internal-surface.adapter.ts
import { implement } from "@orpc/server";
import { createInvoiceService, invoiceInternalContract, type InvoiceDeps } from "@rawr/invoice-processing";

export type InvoiceInternalContext = {
  deps: InvoiceDeps;
  requestId: string;
};

export function createInvoiceInternalSurface() {
  const os = implement<typeof invoiceInternalContract, InvoiceInternalContext>(invoiceInternalContract);

  const router = os.router({
    start: os.start.handler(async ({ input, context }) => {
      const domain = createInvoiceService(context.deps);
      return domain.start(input);
    }),
    getStatus: os.getStatus.handler(async ({ input, context }) => {
      const domain = createInvoiceService(context.deps);
      return domain.getStatus(input.runId);
    }),
  });

  return {
    contract: invoiceInternalContract,
    router,
  } as const;
}
```

## oRPC Correctness: Contract -> Implement -> Transport

Contract-first here is concrete and two-stage:
1. Package defines contract artifact (`oc.router`) and domain/service logic.
2. Adapter layer (usually API plugin) binds handlers with `implement(contract)` and maps into package services.
3. API plugin structure stays stable under growth: one `contract.boundary.ts`, one `router.ts`, many capability modules (optionally split to `operations/*.operation.ts` when needed).

### A1 Definition
API plugin binds package internal contract in a lightweight adapter with minimal boundary additions.

### A1 Plugin Example
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { implement } from "@orpc/server";
import { createInvoiceService, invoiceInternalContract, type InvoiceDeps } from "@rawr/invoice-processing";

type InvoiceApiContext = {
  deps: InvoiceDeps;
  requestId: string;
};

function createInvoiceInternalAdapter() {
  const os = implement<typeof invoiceInternalContract, InvoiceApiContext>(invoiceInternalContract);

  return {
    contract: invoiceInternalContract,
    router: os.router({
      start: os.start.handler(async ({ input, context }) => {
        const service = createInvoiceService(context.deps);
        return service.start(input);
      }),
      getStatus: os.getStatus.handler(async ({ input, context }) => {
        const service = createInvoiceService(context.deps);
        return service.getStatus(input.runId);
      }),
    }),
  } as const;
}

export function registerInvoiceProcessingApiPluginA1() {
  const internal = createInvoiceInternalAdapter();

  return {
    namespace: "invoiceProcessing" as const,
    contract: internal.contract,
    router: internal.router,
  } as const;
}
```

A1 evaluation:
- Simpler: fastest path, minimal duplication.
- Tradeoff: boundary semantics track internal surface more closely.
- Use for internal/admin-first procedures where external versioning pressure is low.

### A2 Definition
API plugin defines boundary-specific semantics and maps handlers into domain/internal operations.

### A2 Boundary Contract Example
```ts
// plugins/api/invoice-processing-api/src/contract.boundary.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/invoice-processing/contracts/typebox-standard-schema";

export const invoiceBoundaryContract = oc.router({
  startInvoice: oc
    .route({ method: "POST", path: "/invoice-processing/runs" })
    .input(
      typeBoxStandardSchema(
        Type.Object({
          invoiceId: Type.String({ minLength: 1 }),
          requestedBy: Type.String({ minLength: 1 }),
          traceToken: Type.Optional(Type.String()),
        }),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object({
          runId: Type.String({ minLength: 1 }),
          accepted: Type.Boolean(),
        }),
      ),
    ),

  forceReconcile: oc
    .route({ method: "POST", path: "/invoice-processing/runs/{runId}/force-reconcile" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String({ minLength: 1 }) })))
    .output(typeBoxStandardSchema(Type.Object({ accepted: Type.Boolean() }))),
});
```

### A2 Plugin Mapping Example
```ts
// plugins/api/invoice-processing-api/src/index.ts
import type { Inngest } from "inngest";
import { implement } from "@orpc/server";
import { createInvoiceService, type InvoiceDeps } from "@rawr/invoice-processing";
import { invoiceBoundaryContract } from "./contract.boundary";

export type InvoiceApiBoundaryContext = {
  deps: InvoiceDeps;
  inngestClient: Inngest;
  requestId: string;
};

export function registerInvoiceProcessingApiPluginA2() {
  const os = implement<typeof invoiceBoundaryContract, InvoiceApiBoundaryContext>(invoiceBoundaryContract);

  return {
    namespace: "invoiceProcessing" as const,
    contract: invoiceBoundaryContract,
    router: os.router({
      startInvoice: os.startInvoice.handler(async ({ input, context }) => {
        const domain = createInvoiceService(context.deps);
        const started = await domain.start({
          invoiceId: input.invoiceId,
          requestedBy: input.requestedBy,
        });

        // Event id is explicit for ingestion-level idempotency.
        await context.inngestClient.send({
          id: `invoice-processing.requested:${started.runId}`,
          name: "invoice.processing.requested",
          data: {
            runId: started.runId,
            invoiceId: input.invoiceId,
            requestedBy: input.requestedBy,
          },
        });

        return { runId: started.runId, accepted: true };
      }),

      forceReconcile: os.forceReconcile.handler(async ({ input, context }) => {
        const domain = createInvoiceService(context.deps);
        await domain.forceReconcile(input.runId);
        return { accepted: true };
      }),
    }),
  } as const;
}
```

A2 evaluation:
- Simpler for boundary evolution: plugin can version/shape semantics independently.
- Harder: explicit mapping layer and additional adapter tests required.
- Use when public/admin contracts diverge from package internal contract.

### oRPC transport mounting contract
`RPCHandler` and `OpenAPIHandler` should be mounted from app-host wrapper files (edge-only transport concerns), not from contract packages.
- `/rpc` + `/rpc/*` with `prefix: "/rpc"`
- `/api/orpc` + `/api/orpc/*` with `prefix: "/api/orpc"`
- Forwarded handlers use Elysia `parse: "none"` to avoid body stream consumption before oRPC reads the request.

## Inngest Correctness and Lifecycle Details

Hard lifecycle rules for this architecture:
1. Function handlers can re-enter; code outside `step.*` can re-run.
2. Side effects go inside stable `step.run` boundaries.
3. Step IDs are durability keys; renaming/reordering steps is a compatibility change.
4. Idempotency is layered:
   - event ingestion via stable `event.id`,
   - function-level idempotency key expression,
   - domain-level idempotent writes.
5. Serve endpoint hardening belongs at the app edge (`/api/inngest`) with signing key verification.

### Workflow boundary contract (embedded event shape)
```ts
// plugins/workflows/invoice-processing-workflows/src/contract.event.ts
import { Type } from "typebox";

export const InvoiceRequestedEventShape = Type.Object({
  runId: Type.String({ minLength: 1 }),
  invoiceId: Type.String({ minLength: 1 }),
  requestedBy: Type.String({ minLength: 1 }),
});
```

### Workflow runtime adapter (durable step discipline)
```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
import type { Inngest } from "inngest";
import { Value } from "typebox/value";
import { createInvoiceService, type InvoiceDeps } from "@rawr/invoice-processing";
import { InvoiceRequestedEventShape } from "./contract.event";

export function registerInvoiceProcessingWorkflowPlugin(input: {
  client: Inngest;
  deps: InvoiceDeps;
}) {
  const domain = createInvoiceService(input.deps);

  const reconcile = input.client.createFunction(
    {
      id: "invoice-processing.reconcile",
      retries: 2,
      idempotency: "event.data.runId",
      concurrency: [{ key: "event.data.runId", limit: 1 }],
    },
    { event: "invoice.processing.requested" },
    async ({ event, runId, step }) => {
      if (!Value.Check(InvoiceRequestedEventShape, event.data)) {
        throw new Error("Invalid invoice.processing.requested payload");
      }

      await step.run("invoice/mark-running", async () => {
        await domain.markRunning(event.data.runId);
      });

      const result = await step.run("invoice/reconcile", async () => {
        return domain.reconcile(event.data.runId);
      });

      await step.run("invoice/mark-completed", async () => {
        await domain.markCompleted(event.data.runId);
      });

      return { ok: true as const, runId: event.data.runId, inngestRunId: runId, result };
    },
  );

  return { functions: [reconcile] as const };
}
```

### Inngest serve endpoint wrapper (signed ingress)
```ts
// apps/server/src/inngest/register-route.ts
import type { AnyElysia } from "../plugins";
import type { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";

type InngestSurface = {
  client: Inngest;
  functions: readonly unknown[];
};

export function registerInngestRoute<TApp extends AnyElysia>(app: TApp, surface: InngestSurface): TApp {
  const handler = inngestServe({
    client: surface.client,
    functions: surface.functions as any,
    servePath: "/api/inngest",
    signingKey: process.env.INNGEST_SIGNING_KEY,
  });

  app.all("/api/inngest", ({ request }) => handler(request as Request), { parse: "none" });
  return app;
}
```

## Elysia Mounting and Adapter Caveats

1. Mount both exact and wildcard paths for oRPC transports (`/rpc` and `/rpc/*`; `/api/orpc` and `/api/orpc/*`) so root and nested procedures both resolve.
2. Use `parse: "none"` for routes forwarding raw `Request` objects to oRPC/Inngest handlers; this avoids body stream consumption before downstream handlers parse the body.
3. Register auth/guard hooks intentionally relative to mount order; Elysia hooks are order-sensitive and plugin-scoped by default.
4. Keep framework-native routes outside oRPC procedure modeling:
   - `/api/inngest`
   - `/rawr/plugins/web/:dirName`
   - `/health`

## Composition in `rawr.hq.ts` and Host Mounting Path

### Composition authority
```ts
// rawr.hq.ts
import { Inngest } from "inngest";
import { oc } from "@orpc/contract";
import { createInvoiceDeps } from "@rawr/invoice-processing";
import { registerInvoiceProcessingApiPluginA1 } from "./plugins/api/invoice-processing-api/src";
import { registerInvoiceProcessingWorkflowPlugin } from "./plugins/workflows/invoice-processing-workflows/src";

const deps = createInvoiceDeps();
const inngestClient = new Inngest({ id: "rawr-hq" });

const invoiceApi = registerInvoiceProcessingApiPluginA1();
const invoiceWorkflows = registerInvoiceProcessingWorkflowPlugin({
  client: inngestClient,
  deps,
});

export type RawrOrpcContext = {
  deps: ReturnType<typeof createInvoiceDeps>;
  requestId: string;
  inngestClient: Inngest;
};

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({ invoiceProcessing: invoiceApi.contract }),
    router: { invoiceProcessing: invoiceApi.router },
    createContext: (request: Request): RawrOrpcContext => ({
      deps,
      inngestClient,
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    }),
  },
  inngest: {
    client: inngestClient,
    functions: [...invoiceWorkflows.functions],
  },
  web: { mounts: [] },
  cli: { commands: [] },
  agents: { capabilities: [] },
} as const;
```

### Host mounting path (no hidden orchestration)
```ts
// apps/server/src/orpc/register-routes.ts
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { AnyElysia } from "../plugins";
import { rawrHqManifest } from "../../../rawr.hq";

export function registerOrpcRoutes<TApp extends AnyElysia>(app: TApp): TApp {
  const os = implement<typeof rawrHqManifest.orpc.contract, ReturnType<typeof rawrHqManifest.orpc.createContext>>(
    rawrHqManifest.orpc.contract,
  );
  const router = os.router(rawrHqManifest.orpc.router);
  const rpc = new RPCHandler(router);
  const openapi = new OpenAPIHandler(router);

  app.all("/rpc", async ({ request }) => {
    const result = await rpc.handle(request as Request, {
      prefix: "/rpc",
      context: rawrHqManifest.orpc.createContext(request as Request),
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/rpc/*", async ({ request }) => {
    const result = await rpc.handle(request as Request, {
      prefix: "/rpc",
      context: rawrHqManifest.orpc.createContext(request as Request),
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/api/orpc", async ({ request }) => {
    const result = await openapi.handle(request as Request, {
      prefix: "/api/orpc",
      context: rawrHqManifest.orpc.createContext(request as Request),
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/api/orpc/*", async ({ request }) => {
    const result = await openapi.handle(request as Request, {
      prefix: "/api/orpc",
      context: rawrHqManifest.orpc.createContext(request as Request),
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  return app;
}
```

```ts
// apps/server/src/rawr.ts
import type { AnyElysia } from "./plugins";
import { rawrHqManifest } from "../../rawr.hq";
import { registerInngestRoute } from "./inngest/register-route";
import { registerOrpcRoutes } from "./orpc/register-routes";

export function registerRawrRoutes<TApp extends AnyElysia>(app: TApp): TApp {
  registerInngestRoute(app, rawrHqManifest.inngest);
  registerOrpcRoutes(app);
  return app;
}
```

## What Gets Simpler / What Gets Harder

| Area | Gets Simpler | Gets Harder | Mitigation |
| --- | --- | --- | --- |
| Domain model quality | Domain schema files stay semantically meaningful. | Boundary IO shape duplication across contracts. | Allow extraction only when reuse is proven across boundaries. |
| Contract readability | IO shapes are visible at contract definitions. | Larger single boundary contracts as operations grow. | Keep one contract/router per API plugin; split logic by capability first, then by operation when thresholds are met. |
| Runtime separation | Boundary semantics and orchestration are isolated in plugins. | Adapter translation code increases. | Add adapter integration tests and explicit mapping helpers. |
| Inngest durability safety | Retry/re-entry behavior is explicit in workflow adapters. | Step IDs and flow-control options become compatibility-sensitive. | Treat step IDs and event names as versioned API; document change policy. |
| Dependency hygiene | One-way import rule prevents runtime coupling backflow. | Requires lint/dependency enforcement. | Add CI rule: `packages/**` cannot import `plugins/**`; `plugins/**` cannot import sibling plugins. |
| API evolution | A2 supports public/internal divergence safely. | Risk of uncontrolled divergence. | Require explicit A2 rationale and contract review gate. |

## Migration Path (Today-State -> Approach A + Clarification)

### Current state (Observed)
- Runtime assembly still largely app-local.
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`
- Static HQ contract composition currently in `packages/core`.
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`

### Phase plan
1. Introduce `rawr.hq.ts` manifest with no runtime behavior change.
2. Move host mounting to manifest outputs only.
3. Create first domain package with domain-only schemas/types (`domain/types.ts`, `domain/aggregates.ts`) and domain service.
4. Add package internal contract with embedded IO shapes.
5. Implement API plugin A1 by mounting internal contract mapping.
6. Add workflow plugin with event contract embedded in plugin boundary layer.
7. Add API plugin A2 only where boundary semantics differ (public/admin/policy).
8. Remove app-layer capability-specific routing/orchestration and legacy contract assembly in `packages/core` once replaced.
9. Enforce one-way import rules in CI.

## Recommendation
Adopt this clarified Approach A baseline:

- Package = stable domain core (domain types/schemas, logic, internal contract).
- Boundary adapters define boundary contracts with embedded IO shapes.
- Boundary -> domain imports only.
- `rawr.hq.ts` composes once; host mounts once.
- A1 adapter default, A2 explicit exception for boundary divergence.

## Conformance Check

1. Pure-domain axis only: package content remains domain/internal-contract focused; no boundary-package runtime layer is introduced.
2. API plugin structure invariant: examples now show one `contract.boundary.ts` and one `router.ts` per API plugin.
3. Capability-module-first rule: split to per-operation files (`operations/*.operation.ts`) only when complexity/churn thresholds are exceeded.
4. Boundary contracts stay at plugin edge: API and workflow boundary contracts remain under `plugins/api/**` and `plugins/workflows/**`.
5. Router/contract fragmentation repaired: scaled examples remove multi-contract/multi-router-per-plugin patterns and replace them with capability-module growth.

## Validation Notes

### Observed
1. Existing runtime wiring in this worktree already uses dual oRPC transports with `parse: "none"` forwarding in `apps/server/src/orpc.ts`.
2. Existing Inngest wrapper pattern (`createInngestServeHandler`) already exists in `packages/coordination-inngest/src/adapter.ts`.
3. Existing app host route composition mounts `/api/inngest` and oRPC routes from `apps/server/src/rawr.ts`.

### Inferred
1. Approach A remains viable at scale if contracts/functions/services are split by bounded modules and exported through stable layer barrels.
2. Step IDs, event names, and procedure keys should be treated as compatibility surfaces once n>1 workflows and routers are live.

### Key refs
- Inngest: `https://www.inngest.com/docs/learn/how-functions-are-executed`, `https://www.inngest.com/docs/learn/serving-inngest-functions`, `https://www.inngest.com/docs/reference/serve`, `https://www.inngest.com/docs/guides/handling-idempotency`, `https://www.inngest.com/docs/platform/signing-keys`
- oRPC: `https://orpc.dev/docs/contract-first/define-contract`, `https://orpc.dev/docs/contract-first/implement-contract`, `https://orpc.dev/docs/rpc-handler`, `https://orpc.dev/docs/openapi/openapi-handler`, `https://orpc.dev/docs/openapi/routing`, `https://orpc.dev/docs/adapters/elysia`
- Elysia: `https://elysiajs.com/essential/life-cycle`, `https://elysiajs.com/essential/plugin`, `https://elysiajs.com/patterns/openapi`, `https://elysiajs.com/plugins/swagger`
- Skills used for local validation: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`

## Counter-Review of Approach B
Reviewed source:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_B_BOUNDARY_OR_RUNTIME_CENTRIC_E2E.md`

### Strongest objections to B
1. It weakens the repo-level mental model “packages are core domain-first” by introducing runtime-integrator packages (`*-boundary/runtime/*`) inside package space.
- Example from B: `packages/invoice-processing-boundary/src/runtime/inngest-surface.ts` and runtime deps in boundary package.
- Why this matters: package layer stops being an obvious “stable core” zone for contributors and agents.

2. It introduces package proliferation and version coordination cost per capability.
- B baseline creates two packages per capability (`*-domain`, `*-boundary`), plus plugins and composition.
- In a fast-evolving template repo, this adds maintenance overhead before reuse is proven.

3. It can over-centralize boundary ownership too early.
- B assumes boundary contracts and runtime primitives should be package-owned by default.
- In this repo, policy/auth/ops behavior often changes at plugin edge; forcing package-first boundary ownership can slow boundary experimentation.

4. It partially conflicts with the hard-position framing for Agent A.
- Agent A position is strict package-domain core with boundary-defined contracts at adapters.
- B is coherent, but it is a different default philosophy, not just an implementation detail.

### Where B is stronger than A
1. Reuse of boundary glue across multiple surfaces.
- B’s `packages/<capability>-boundary/src/runtime/*` can remove repeated adapter code across API/workflow plugins.

2. Unified contract source for external consumers.
- B makes it easier for web/cli/tests to import one boundary contract package without reaching through plugin paths.

3. Drift controls are more centralized.
- B’s package-level contract snapshots and event compatibility checks are a strong discipline when many adapters consume the same boundary semantics.

### Concrete file/flow comparison

Approach A flow (current recommendation):
1. `plugins/api/invoice-processing-api/src/contract.boundary.ts` defines API boundary contract inline.
2. API plugin maps to `@rawr/invoice-processing` domain service/internal contract.
3. API plugin emits boundary event consumed by `plugins/workflows/invoice-processing-workflows/src/index.ts`.
4. Workflow plugin validates its boundary contract and calls domain service.
5. `rawr.hq.ts` composes API + workflow adapters once.

Approach B flow (Agent B proposal):
1. `packages/invoice-processing-boundary/src/api-contract.ts` defines boundary contract.
2. `packages/invoice-processing-boundary/src/runtime/orpc-surface.ts` materializes runtime API surface.
3. Plugin wrapper `plugins/api/invoice-processing-api/src/index.ts` mostly re-exports boundary runtime primitive.
4. Same pattern for workflow via `packages/invoice-processing-boundary/src/runtime/inngest-surface.ts`.
5. `rawr.hq.ts` composes boundary-package-produced surfaces.

When B clearly wins:
- Two or more plugins/surfaces need the same boundary contract/runtime primitive with low policy divergence.

When A is safer:
- Boundary behavior is policy-heavy and changes frequently at plugin edge.
- Team needs strict clarity that package space is stable domain core first.

### Recommendation change decision
Recommendation does not change at baseline: keep clarified Approach A as default.

Adjustment after reviewing B:
- Adopt a conditional promotion rule inspired by B.
- If the same boundary glue is duplicated in 2+ adapters for one capability, promote that glue into a dedicated boundary package module.
- Until that threshold is met, keep boundary contracts/runtime glue in plugins to preserve simpler ownership and avoid premature package split.

This keeps A’s clarity while borrowing B’s strongest scaling mechanism only when evidence justifies it.
