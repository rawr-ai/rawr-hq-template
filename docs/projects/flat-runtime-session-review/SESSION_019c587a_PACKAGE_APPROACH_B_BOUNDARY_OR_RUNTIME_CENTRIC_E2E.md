# SESSION_019c587a: Package Approach B (Boundary/Runtime-Centric) End-to-End

## Position (Agent B)
I oppose the strict model "packages are pure domain logic only."  
Approach B keeps domain purity where it matters, but intentionally extends the **package layer** to include boundary/runtime-oriented packages that own contract + runtime integration primitives.

This still preserves:
- one global composition authority (`rawr.hq.ts`),
- no runtime plugin-to-plugin imports,
- thin host mounts.

## Clarification Critique Axis (Agree, Diverge, Tradeoff)
The clarification is treated here as a critique target, not a binding requirement for Approach B.

Where I agree:
1. Domain schemas/types should stay domain-native and stable.
2. Domain package should expose an internal contract that is not forced to mirror API/workflow/event contracts.
3. One-way dependency direction (`boundary -> domain`) is a strong safety rail.

Where I diverge:
1. I do not agree that package layer should stop at domain-only ownership; boundary/runtime primitives should also be package-owned (in explicit boundary packages).
2. I do not treat inline-only IO contract shape as universally best. Inline shape reduces file count, but extracted shared boundary modules are sometimes safer when many endpoints reuse the same boundary schema.

Exact tradeoff:
- More package modules and versioning discipline, in exchange for significantly lower adapter drift across API/workflow/web/cli/tests.

## Claim Posture (Observed vs Inferred)
### Observed
- Locked proposal currently enforces package authoring + plugin runtime split + `rawr.hq.ts` composition authority + no plugin runtime imports: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:19`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:23`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:46`.
- Spec packet treats manifest as architecture boundary and keeps plugin import boundary strict: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:42`, `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:95`, `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:135`.
- Today-state runtime boundary glue remains app-heavy (`rawr.ts`, `orpc.ts`) and `hqContract` is already package-owned: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts:104`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/orpc/hq-router.ts:5`.
- Transcript records package-purity concern, single composition path requirement, and contract ownership friction: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:400`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:413`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4906`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5441`.

### Inferred
- The real problem is repeated boundary glue ownership, not domain model purity itself.
- A domain-package + boundary-package split can satisfy your stability constraints while reducing adapter drift across API/workflows/tests.
- Deferring helper abstraction (`D-004`) suggests unresolved boilerplate pressure that this model addresses.

## Approach B (Revised): Domain Core + Boundary Packages
Per capability, create two package types:
1. `*-domain` package: stable core (domain types, aggregates, logic, internal contract).
2. `*-boundary` package: API/workflow/event contracts + runtime integration primitives.

Plugins remain deployment wrappers. `rawr.hq.ts` remains global composer.

## Contract Ownership Across Domain/API/Workflow
| Artifact | Owner | Notes |
| --- | --- | --- |
| Domain entities, value objects, aggregate types | `packages/<capability>-domain` | Stable, reusable, boundary-agnostic |
| Internal domain contract | `packages/<capability>-domain` | Not required to match API/workflow shape |
| API contract (including IO shape) | `packages/<capability>-boundary` | IO shape embedded inline in contract definition |
| Workflow/event contract (including payload shape) | `packages/<capability>-boundary` | Inline payload shape and semantics |
| Runtime surface primitives (`implement`, `createFunction`) | `packages/<capability>-boundary/runtime/*` | Reusable glue owned once |
| Plugin policy wrappers | `plugins/<surface>/<capability>*` | Auth/flags/operational policy only |
| Cross-capability composition | `rawr.hq.ts` | Single assembly authority |
| Host mounting | `apps/server` | Mount-only responsibility |

## End-to-End File Tree (Concrete + Ownership)
```text
.
├── packages/
│   ├── invoice-processing-domain/
│   │   └── src/
│   │       ├── types.ts
│   │       ├── internal-contract.ts
│   │       ├── service.ts
│   │       └── index.ts
│   └── invoice-processing-boundary/
│       └── src/
│           ├── api-contract.ts
│           ├── workflow-contract.ts
│           ├── runtime/
│           │   ├── orpc-surface.ts            # implement(contract) + event emission
│           │   ├── inngest-surface.ts         # createFunction + durable step boundaries
│           │   └── plugin-wrappers.ts         # thin wrappers exported to plugins/*
│           └── index.ts
├── plugins/
│   ├── api/invoice-processing-api/src/index.ts
│   └── workflows/invoice-processing-workflows/src/index.ts
├── rawr.hq.ts
└── apps/server/src/
    ├── manifest-mounts.ts                      # transport adapter mounting only
    └── rawr.ts
```

## End-to-End File Tree (Scaled n>1 Variant)
```text
.
├── packages/
│   ├── invoice-processing-domain/
│   │   └── src/
│   │       ├── ids.ts
│   │       ├── aggregates/
│   │       │   ├── invoice-run.ts
│   │       │   └── invoice-risk.ts
│   │       ├── ports/
│   │       │   ├── run-store.ts
│   │       │   └── risk-engine.ts
│   │       ├── services/
│   │       │   ├── start-run.ts
│   │       │   ├── get-status.ts
│   │       │   ├── mark-running.ts
│   │       │   ├── finalize-run.ts
│   │       │   └── recompute-risk.ts
│   │       ├── suite.ts
│   │       └── index.ts
│   └── invoice-processing-boundary/
│       └── src/
│           ├── contracts/
│           │   ├── invoice-runs.contract.ts
│           │   ├── invoice-admin.contract.ts
│           │   └── index.ts
│           ├── workflows/
│           │   ├── invoice-requested.event.ts
│           │   ├── invoice-timeout.event.ts
│           │   └── index.ts
│           ├── runtime/
│           │   ├── orpc/
│           │   │   ├── invoice-runs.router.ts
│           │   │   ├── invoice-admin.router.ts
│           │   │   ├── router-registry.ts
│           │   │   └── client-exports.ts
│           │   ├── inngest/
│           │   │   ├── fn-invoice-reconcile.ts
│           │   │   ├── fn-invoice-timeout.ts
│           │   │   ├── fn-invoice-notify.ts
│           │   │   └── function-registry.ts
│           │   └── plugin-wrappers.ts
│           └── index.ts
├── plugins/
│   ├── api/invoice-processing-api/src/index.ts
│   ├── workflows/invoice-processing-workflows/src/index.ts
│   └── web/invoice-processing-web/src/orpc-client.ts
├── rawr.hq/
│   ├── invoice-processing.ts
│   ├── customer-support.ts
│   └── index.ts
├── rawr.hq.ts
└── apps/server/src/
    ├── manifest-mounts.ts
    └── rawr.ts
```

## Growth Patterns (n>1)
### One-file-per-function organization (Inngest + ORPC)
```ts
// packages/invoice-processing-boundary/src/runtime/inngest/function-registry.ts
import type { Inngest } from "inngest";
import type { InvoiceDomainContract } from "@rawr/invoice-processing-domain";
import { createFnInvoiceReconcile } from "./fn-invoice-reconcile";
import { createFnInvoiceTimeout } from "./fn-invoice-timeout";
import { createFnInvoiceNotify } from "./fn-invoice-notify";

export function createInvoiceWorkflowBundle(input: { client: Inngest; domain: InvoiceDomainContract }) {
  return {
    client: input.client,
    functions: [
      createFnInvoiceReconcile(input),
      createFnInvoiceTimeout(input),
      createFnInvoiceNotify(input),
    ] as const,
  };
}
```

```ts
// packages/invoice-processing-boundary/src/runtime/orpc/router-registry.ts
import { oc } from "@orpc/contract";
import type { InvoiceOrpcContext } from "../orpc-surface";
import { createInvoiceRunsSurface } from "./invoice-runs.router";
import { createInvoiceAdminSurface } from "./invoice-admin.router";

export function createInvoiceRouterRegistry(context: InvoiceOrpcContext) {
  const runs = createInvoiceRunsSurface(context);
  const admin = createInvoiceAdminSurface(context);

  return {
    contract: oc.router({
      invoiceRuns: runs.contract,
      invoiceAdmin: admin.contract,
    }),
    router: {
      invoiceRuns: runs.router,
      invoiceAdmin: admin.router,
    },
    context,
  };
}
```

### Service evolution: single service -> suite/library
```ts
// packages/invoice-processing-domain/src/suite.ts
import { createStartRunService } from "./services/start-run";
import { createGetStatusService } from "./services/get-status";
import { createMarkRunningService } from "./services/mark-running";
import { createFinalizeRunService } from "./services/finalize-run";
import type { InvoiceDomainContract } from "./internal-contract";
import type { RunStorePort } from "./ports/run-store";
import type { RiskEnginePort } from "./ports/risk-engine";

export type InvoiceDomainDeps = {
  runStore: RunStorePort;
  riskEngine: RiskEnginePort;
};

export function createInvoiceDomainSuite(deps: InvoiceDomainDeps): InvoiceDomainContract {
  const startRun = createStartRunService(deps);
  const getStatus = createGetStatusService(deps);
  const markRunning = createMarkRunningService(deps);
  const finalize = createFinalizeRunService(deps);

  return {
    start: startRun.execute,
    getStatus: getStatus.execute,
    markRunning: markRunning.execute,
    finalize: finalize.execute,
  };
}
```

### Import/dependency patterns that stay stable under growth
1. Domain package imports only domain internals + domain ports.
2. Boundary contract modules import domain schemas/types, but not domain runtime adapters.
3. Boundary runtime modules import:
- boundary contracts/events,
- domain public contract (`InvoiceDomainContract`),
- transport libs (`@orpc/server`, `inngest`).
4. Plugins import only boundary runtime wrappers; they never define canonical contracts.
5. `rawr.hq.ts` imports capability registries (not individual procedures/functions) so adding N new routers/functions does not change host mount code.

```ts
// rawr.hq/invoice-processing.ts
import { createInvoiceDomainSuite } from "@rawr/invoice-processing-domain";
import type { InvoiceDomainDeps } from "@rawr/invoice-processing-domain";
import { createInvoiceInngestClient } from "@rawr/invoice-processing-boundary/runtime/inngest-surface";
import {
  createInvoiceRouterRegistry,
  createInvoiceWorkflowBundle,
} from "@rawr/invoice-processing-boundary/runtime";

export function createInvoiceCapability(deps: InvoiceDomainDeps) {
  const domain = createInvoiceDomainSuite(deps);
  const inngest = createInvoiceInngestClient("rawr-hq");
  const orpc = createInvoiceRouterRegistry({ domain, inngestClient: inngest });
  const workflows = createInvoiceWorkflowBundle({ client: inngest, domain });
  return { orpc, workflows };
}
```

## Concrete Plumbing (No Magic)
### 1) Domain package (stable core only)
```ts
// packages/invoice-processing-domain/src/types.ts
import { Type, type Static } from "typebox";

export const InvoiceIdSchema = Type.String({ minLength: 8, pattern: "^INV-" });
export const InvoiceStatusSchema = Type.Union([
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("failed"),
]);

export type InvoiceId = Static<typeof InvoiceIdSchema>;
export type InvoiceStatus = Static<typeof InvoiceStatusSchema>;

export type InvoiceAggregate = {
  invoiceId: InvoiceId;
  status: InvoiceStatus;
  riskScore?: number;
};
```

```ts
// packages/invoice-processing-domain/src/internal-contract.ts
import type { InvoiceAggregate, InvoiceId } from "./types";

export type StartInvoiceCommand = {
  invoiceId: InvoiceId;
  requestedByActorId: string;
  amountCents: number;
};

export type InvoiceDomainContract = {
  start: (cmd: StartInvoiceCommand) => Promise<{ runId: string; accepted: true }>;
  getStatus: (runId: string) => Promise<InvoiceAggregate | null>;
  markRunning: (runId: string) => Promise<void>;
  finalize: (runId: string, riskScore: number) => Promise<void>;
};
```

### 2) Boundary package API contract (contract artifact, not runtime router)
```ts
// packages/invoice-processing-boundary/src/api-contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/core/orpc/typebox-standard-schema";
import { InvoiceIdSchema } from "@rawr/invoice-processing-domain";

const tag = ["invoice-processing"] as const;

export const invoiceApiContract = oc.router({
  start: oc
    .route({ method: "POST", path: "/invoice-processing/runs", tags: tag, operationId: "invoiceStart" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            invoiceId: InvoiceIdSchema,
            requestedByActorId: Type.String({ minLength: 3 }),
            amountCents: Type.Integer({ minimum: 0 }),
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
    ),

  status: oc
    .route({ method: "GET", path: "/invoice-processing/runs/{runId}", tags: tag, operationId: "invoiceStatus" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String({ minLength: 1 }) }, { additionalProperties: false })))
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
            riskScore: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
          },
          { additionalProperties: false },
        ),
      ),
    ),
});
```

### 3) Boundary package runtime ORPC surface (contract -> implement -> router)
```ts
// packages/invoice-processing-boundary/src/runtime/orpc-surface.ts
import { implement, ORPCError } from "@orpc/server";
import type { Inngest } from "inngest";
import type { InvoiceDomainContract } from "@rawr/invoice-processing-domain";
import { INVOICE_REQUESTED_EVENT } from "../workflow-contract";
import { invoiceApiContract } from "../api-contract";

export type InvoiceOrpcContext = {
  domain: InvoiceDomainContract;
  inngestClient: Inngest;
};

export function createInvoiceOrpcSurface(input: InvoiceOrpcContext) {
  const os = implement<typeof invoiceApiContract, InvoiceOrpcContext>(invoiceApiContract);

  const router = os.router({
    start: os.start.handler(async ({ input: body, context }) => {
      const started = await context.domain.start(body);

      await context.inngestClient.send({
        id: `invoice-processing.requested:${started.runId}`,
        name: INVOICE_REQUESTED_EVENT,
        data: {
          runId: started.runId,
          invoiceId: body.invoiceId,
          amountCents: body.amountCents,
        },
      });

      return started;
    }),

    status: os.status.handler(async ({ input: params, context }) => {
      const run = await context.domain.getStatus(params.runId);
      if (!run) {
        throw new ORPCError("RUN_NOT_FOUND", {
          status: 404,
          message: "Run not found",
          data: { runId: params.runId },
        });
      }
      return { runId: params.runId, status: run.status, riskScore: run.riskScore };
    }),
  });

  return { contract: invoiceApiContract, router, context: input };
}
```

### 4) Boundary package workflow contract + Inngest runtime surface
```ts
// packages/invoice-processing-boundary/src/workflow-contract.ts
import { Type } from "typebox";
import { InvoiceIdSchema } from "@rawr/invoice-processing-domain";

export const INVOICE_REQUESTED_EVENT = "invoice-processing.requested" as const;

export const InvoiceRequestedEventPayloadSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    invoiceId: InvoiceIdSchema,
    amountCents: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
```

```ts
// packages/invoice-processing-boundary/src/runtime/inngest-surface.ts
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";
import { Value } from "typebox/value";
import type { InvoiceDomainContract } from "@rawr/invoice-processing-domain";
import { INVOICE_REQUESTED_EVENT, InvoiceRequestedEventPayloadSchema } from "../workflow-contract";

export function createInvoiceInngestClient(appId = "rawr-hq"): Inngest {
  return new Inngest({ id: appId });
}

export function createInvoiceWorkflowSurface(input: { client: Inngest; domain: InvoiceDomainContract }) {
  const fn = input.client.createFunction(
    { id: "invoice-processing.reconcile", retries: 2 },
    { event: INVOICE_REQUESTED_EVENT },
    async ({ event, step }) => {
      if (!Value.Check(InvoiceRequestedEventPayloadSchema, event.data)) {
        throw new Error("invalid invoice payload");
      }

      // Stable step IDs are durability boundaries; keep side effects inside step.run.
      await step.run("invoice/mark-running", () => input.domain.markRunning(event.data.runId));
      const riskScore = await step.run("invoice/calc-risk", async () => Math.min(1, event.data.amountCents / 150_000));
      await step.run("invoice/finalize", () => input.domain.finalize(event.data.runId, riskScore));
      return { ok: true, runId: event.data.runId };
    },
  );

  return { client: input.client, functions: [fn] as const };
}

export function createInvoiceInngestServeHandler(bundle: { client: Inngest; functions: readonly unknown[] }) {
  return inngestServe({
    client: bundle.client,
    functions: bundle.functions as any,
  });
}
```

### 5) Explicit plugin wrappers (thin policy wrappers only)
```ts
// packages/invoice-processing-boundary/src/runtime/plugin-wrappers.ts
import type { Inngest } from "inngest";
import type { InvoiceDomainContract } from "@rawr/invoice-processing-domain";
import { createInvoiceOrpcSurface } from "./orpc-surface";
import { createInvoiceWorkflowSurface } from "./inngest-surface";

export function registerInvoiceProcessingApiPlugin(input: {
  domain: InvoiceDomainContract;
  inngestClient: Inngest;
}) {
  return createInvoiceOrpcSurface(input);
}

export function registerInvoiceProcessingWorkflowPlugin(input: {
  client: Inngest;
  domain: InvoiceDomainContract;
}) {
  return createInvoiceWorkflowSurface(input);
}
```

```ts
// plugins/api/invoice-processing-api/src/index.ts
export { registerInvoiceProcessingApiPlugin } from "@rawr/invoice-processing-boundary/runtime/plugin-wrappers";
```

```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
export { registerInvoiceProcessingWorkflowPlugin } from "@rawr/invoice-processing-boundary/runtime/plugin-wrappers";
```

### 6) rawr.hq composition remains the single assembly authority
```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { createInvoiceDomainService } from "@rawr/invoice-processing-domain";
import { createInvoiceInngestClient } from "@rawr/invoice-processing-boundary/runtime/inngest-surface";
import {
  registerInvoiceProcessingApiPlugin,
  registerInvoiceProcessingWorkflowPlugin,
} from "@rawr/invoice-processing-boundary/runtime/plugin-wrappers";

const domain = createInvoiceDomainService(createInvoiceDomainDeps());
const inngest = createInvoiceInngestClient("rawr-hq");

const api = registerInvoiceProcessingApiPlugin({ domain, inngestClient: inngest });
const workflows = registerInvoiceProcessingWorkflowPlugin({ client: inngest, domain });

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({ invoice: api.contract }),
    router: { invoice: api.router },
    context: api.context,
  },
  inngest: {
    client: workflows.client,
    functions: workflows.functions,
  },
} as const;
```

### 7) Host mounts in Elysia (explicit adapter caveats handled)
```ts
// apps/server/src/manifest-mounts.ts
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createInvoiceInngestServeHandler } from "@rawr/invoice-processing-boundary/runtime/inngest-surface";
import type { Inngest } from "inngest";

type RawrManifest = {
  orpc: {
    contract: unknown;
    router: Record<string, unknown>;
    context: unknown;
  };
  inngest: {
    client: Inngest;
    functions: readonly unknown[];
  };
};

export function mountRawrManifest(app: any, manifest: RawrManifest) {
  const os = implement<any, any>(manifest.orpc.contract as any);
  const router = os.router(manifest.orpc.router as any);
  const rpc = new RPCHandler(router);
  const openapi = new OpenAPIHandler(router);
  const inngestHandler = createInvoiceInngestServeHandler(manifest.inngest);

  app.all("/rpc", async ({ request }) => {
    const result = await rpc.handle(request as Request, { prefix: "/rpc", context: manifest.orpc.context });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/rpc/*", async ({ request }) => {
    const result = await rpc.handle(request as Request, { prefix: "/rpc", context: manifest.orpc.context });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/api/orpc", async ({ request }) => {
    const result = await openapi.handle(request as Request, { prefix: "/api/orpc", context: manifest.orpc.context });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/api/orpc/*", async ({ request }) => {
    const result = await openapi.handle(request as Request, { prefix: "/api/orpc", context: manifest.orpc.context });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });

  app.all("/api/inngest", async ({ request }) => inngestHandler(request as Request), { parse: "none" });

  return app;
}
```

```ts
// apps/server/src/rawr.ts
import { mountRawrManifest } from "./manifest-mounts";
import { rawrHqManifest } from "../../../rawr.hq";

mountRawrManifest(app, rawrHqManifest);
```

## Inngest Correctness and Lifecycle Details
1. `createFunction` handlers are re-enterable; completed `step.run` calls are memoized per run, so side effects must be inside stable step IDs.
2. Use stable identifiers:
- function ID (`invoice-processing.reconcile`),
- event name (`invoice-processing.requested`),
- step IDs (`invoice/mark-running`, `invoice/calc-risk`, `invoice/finalize`).
3. Idempotency boundary is explicit:
- ingress-level dedupe via `send({ id: ... })`,
- run-level coordination by `runId`,
- step-level dedupe by step ID.
4. In production, secure `/api/inngest` with Inngest signing key verification (`INNGEST_SIGNING_KEY`) and keep event keys server-side only.
5. Keep function definitions in package runtime (`*-boundary`), while `serve()` mounting remains host/app edge code.

## oRPC Contract / Implementation / Transport Correctness
1. Contract artifact belongs to `@orpc/contract` package files only (`api-contract.ts`); no `@orpc/server` imports there.
2. Runtime surface uses `implement(contract)` once, then exports `{ contract, router, context }` for composition.
3. One router can back both transports:
- `RPCHandler` on `/rpc`,
- `OpenAPIHandler` on `/api/orpc`.
4. Prefix alignment is non-optional:
- route mount `/rpc` + handler `prefix: "/rpc"`,
- route mount `/api/orpc` + handler `prefix: "/api/orpc"`.
5. Path placeholders (`/runs/{runId}`) and input schema keys (`runId`) stay in the same contract artifact to avoid drift.

## Elysia Mounting and Adapter Caveats
1. Forwarded Fetch handlers must use `{ parse: "none" }` to avoid body stream pre-consumption before oRPC/Inngest handlers read the request.
2. Mount both base and wildcard routes (`/rpc` + `/rpc/*`, `/api/orpc` + `/api/orpc/*`) so endpoint roots and nested procedures both match.
3. Elysia lifecycle ordering still applies: register auth/observability hooks intentionally before or after mounted adapter routes based on scope.
4. Keep mounted route handlers thin; no capability logic in `apps/server/src/rawr.ts`.

## API + Workflow + Composition + Host Mount Flow
1. `invoiceApiContract` validates API IO shape; `createInvoiceOrpcSurface` maps API input to domain command and emits typed event.
2. `createInvoiceWorkflowSurface` consumes the same typed event contract and executes domain progression through durable steps.
3. Plugin wrappers re-export boundary runtime factories without owning contracts.
4. `rawr.hq.ts` composes contracts/routers/functions once.
5. Host mounts only transport adapters at `/rpc`, `/api/orpc`, `/api/inngest` with `parse: "none"` for forwarded handlers.

## Validation Notes
### Observed
- Existing server wiring already demonstrates prefix-aligned ORPC transports with `parse: "none"` and dual mount shape (`/rpc`, `/rpc/*`, `/api/orpc`, `/api/orpc/*`): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts:339`.
- Existing host wiring mounts Inngest ingress at `/api/inngest` from a serve handler: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts:111`.
- Existing Inngest adapter uses `createFunction` with stable `step.run` IDs and event-driven execution: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination-inngest/src/adapter.ts:214`.
- Existing contract package uses `oc.router(...).route(...)` with path placeholders and TypeBox bridge schemas: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination/src/orpc/contract.ts:22`.

### Inferred
- Treat function IDs, event names, and step IDs as durability API and avoid mutating semantics in place.
- Keep contract and runtime implementation as separate artifacts so growth in procedure/function count does not force host churn.
- Use registry composition (`router-registry`, `function-registry`) to scale from one capability instance to many without plugin-to-plugin coupling.

### Key refs
- Local skills:
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
- Official docs:
  - Inngest execution model and steps: `https://www.inngest.com/docs/learn/how-functions-are-executed`, `https://www.inngest.com/docs/learn/inngest-steps`
  - Inngest serving + security: `https://www.inngest.com/docs/learn/serving-inngest-functions`, `https://www.inngest.com/docs/platform/signing-keys`
  - oRPC contract-first + handlers + Elysia adapter: `https://orpc.dev/docs/contract-first/define-contract`, `https://orpc.dev/docs/rpc-handler`, `https://orpc.dev/docs/openapi/openapi-handler`, `https://orpc.dev/docs/adapters/elysia`
  - Elysia lifecycle and plugins: `https://elysiajs.com/essential/life-cycle`, `https://elysiajs.com/essential/plugin`

## Shared Consumers and Drift Control
### Shared consumers (web/cli/tests)
- Web/CLI import API contract from boundary package for typed clients.
- Tests import boundary runtime primitives plus fake domain contract implementations for in-process checks.
- Domain tests stay focused on `*-domain` package and ignore transport concerns.

### Drift controls
1. Contract snapshots from boundary package (`api-contract.ts`) and OpenAPI snapshots from same source.
2. Event payload schema contract tests ensure producer/consumer compatibility.
3. Compile-time directional import rule: `*-domain` cannot import `*-boundary`.
4. Plugin rule: plugins may not define duplicate boundary contracts already exported by boundary packages.
5. No runtime plugin-to-plugin imports (existing policy remains).

## What Gets Simpler / What Gets Harder
| Dimension | Simpler | Harder |
| --- | --- | --- |
| Domain stability | Domain package stays clean and stable | Need strict package layering discipline |
| Boundary reuse | API/workflow glue authored once in boundary package | More packages per capability |
| Contract drift | Inline IO shape with contract reduces detached schema drift | Boundary package now carries runtime deps (`@orpc/server`, `inngest`) |
| Consumer experience | Web/CLI/tests import one boundary contract surface | Versioning between `*-domain` and `*-boundary` must be managed |
| Plugin complexity | Plugins become thin policy wrappers | Teams used to plugin-owned contracts must adapt |

## Migration Path from Today-State
### Phase 1: Extract domain core
- From `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts`, move core coordination business behavior into `packages/coordination-domain`.
- Keep `packages/core/src/orpc/hq-router.ts` stable during extraction.

### Phase 2: Create boundary package
- Add `packages/coordination-boundary` with:
  - API contract file (inline IO shapes),
  - workflow contract file,
  - runtime surface primitives.
- Maintain one-way imports into `packages/coordination-domain`.

### Phase 3: Thin plugins
- Introduce `plugins/api/*` and `plugins/workflows/*` wrappers that delegate to boundary runtime primitives.
- Keep no plugin-to-plugin imports.

### Phase 4: Compose + mount cleanup
- Compose in `rawr.hq.ts` only.
- Reduce `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts` to mount/host concerns.

### Phase 5: Enforcement
- Add lint rules for import direction (`boundary -> domain`, never reverse).
- Add snapshot and schema-compat checks for boundary contracts/events.

## Why This Is Still a Strong Contrast to "Domain-Only Packages"
Because runtime-facing ownership moves into package-layer boundary modules (not app/plugin leafs), the package layer becomes the primary home for:
- contract semantics,
- runtime integration primitives,
- drift controls.

Domain purity is preserved where required, but the architecture avoids repeating boundary glue across plugins/apps.

## Counter-Review of Approach A
### Strongest objections to A
1. Purity claim and implementation pattern conflict.
- A states packages are pure domain/service modules: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`.
- But A's own A1 package example imports `implement` from `@orpc/server` inside `packages/invoice-processing/src/api/router.base.ts`: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:103-105`.
- This is runtime coupling in package space without an explicit boundary-package ownership model, so purity is asserted but not structurally enforced.

2. A1/A2 dual-track API model increases architectural branching and drift.
- A introduces two valid integration paths (`A1`, `A2`): `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:96`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:140`.
- In A2, plugin-local contract extension (`forceReconcile`) modifies contract surface in plugin layer: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:160-166`.
- Result: canonical API surface can fragment across plugins and makes web/cli/test consumer contract ownership less deterministic.

3. Event/intent drift risk is still present in A's flow.
- A domain emits string intent (`\"invoice.processing.requested\"`): `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:201-213`.
- Workflow plugin separately subscribes to hardcoded event string: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:223`.
- Without explicit shared boundary contract ownership for event shapes/semantics, producer/consumer drift is easy.

4. A does not actually reduce ceremony versus the criticized baseline.
- A's tree adds domain/api/workflow/clients directories inside package plus plugins and `rawr.hq.ts`: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:57-71`.
- This can recreate the \"too many places to touch\" pressure that triggered the architecture debate.

### Where A is stronger than B
1. A's intent is clearer for teams that prioritize strict domain-core readability.
2. A strongly protects runtime semantics in plugins and keeps `rawr.hq.ts` as singular composition authority.
3. A2 provides a pragmatic escape hatch for policy-heavy API boundaries when strict standardization is not yet mature.

### Concrete flow comparison (A vs B)
1. A flow (from doc):
- Package API module materializes router (`router.base.ts`) -> API plugin re-exports it (A1) -> optional plugin-local contract divergence (A2) -> `rawr.hq.ts` compose.

2. B flow (this doc):
- Domain package exposes core contract + logic -> boundary package owns API/workflow contracts + runtime primitives -> plugins remain policy wrappers -> `rawr.hq.ts` compose.

3. Why B is more coherent:
- In B, runtime-capable package code is deliberate and named (`*-boundary/runtime/*`), not implicit under \"pure\" package claims.
- In B, ownership of shared boundary artifacts is explicit and easier to test/lint as a first-class layer.

### Recommendation impact
Recommendation does not change: keep Approach B as the stronger contrasting architecture.
However, I adopt two guardrails reinforced by A:
1. Keep domain package strictly stable and one-way imported by boundary packages.
2. Avoid dual path proliferation (A1/A2-style branching) by default; require explicit exception criteria for plugin-local contract extensions.
