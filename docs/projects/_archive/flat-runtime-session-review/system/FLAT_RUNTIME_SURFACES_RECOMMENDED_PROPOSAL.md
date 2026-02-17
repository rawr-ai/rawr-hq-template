# Flat Runtime Surfaces: Locked Recommended Proposal
> **Authority note:** This document is now a historical artifact. The current ORPC/Inngest posture and axis rules live under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`. Unique legacy context is captured under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/additive-extractions/`.

## Status
- This is the locked baseline for this architecture cycle.
- It replaces iterative variants for implementation planning.
- Composition authority is `rawr.hq.ts` (single standard).
- Detailed implementation packet and decision register:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md`

## Locked Decisions
1. Keep plugin roots split by runtime surface:
- `plugins/api/*`
- `plugins/workflows/*`
- `plugins/web/*`
- `plugins/cli/*`
- `plugins/agents/*`
- `plugins/mcp/*` (optional)
2. Keep capability/domain authoring in `packages/*` (flat package namespace, no forced `domains/` nesting).
3. Keep runtime semantics separate:
- API plugins own request/response procedure adapters.
- Workflow plugins own durable Inngest function adapters.
4. Disallow runtime plugin-to-plugin imports.
- API plugins do not import workflow plugin code.
- Workflow plugins do not import API plugin code.
- Shared contracts/events/operations live in `packages/*`.
5. Keep composition in `rawr.hq.ts` only.
- `apps/*` mount artifacts produced by `rawr.hq.ts`.
- `apps/*` does not author capability composition logic.
6. Keep `packages/hq` for HQ domain logic only (sync/scaffold/policy/state helpers), not runtime wiring.
7. Remove concept drift:
- `templateRole` is not part of runtime architecture semantics.
- `channel` is distribution/routing metadata only, not capability/runtime ownership.
- `published` is release/distribution state only.

## Model (What We Are Actually Building)
- Unified capability authoring surface: `packages/*`.
- Separate runtime adapters: `plugins/*` by surface.
- One assembly authority: `rawr.hq.ts`.

In plain terms:
- You define schemas/contracts/events/operations once in a package.
- You expose that capability through one or more runtime plugins (API, workflows, web, CLI, agents).
- You compose enabled runtime adapters exactly once in `rawr.hq.ts`.

## Boundary Rules (Hard)
1. `packages/*` can be imported by plugins and apps.
2. `plugins/*` cannot import other runtime plugins.
3. `apps/*` can import `rawr.hq.ts` and host infrastructure packages, but not per-capability logic directly.
4. `rawr.hq.ts` is the only place that composes multiple runtime plugins together.

## Canonical Structure
```text
.
├── apps/
│   ├── server/                  # host runtime only (mounting + infra)
│   ├── web/                     # host shell only
│   └── cli/                     # host shell only
├── packages/
│   ├── core/                    # shared primitives (e.g., TypeBox->oRPC schema bridge)
│   ├── hq/                      # HQ domain logic (sync/scaffold/policy)
│   └── invoice-processing/      # example capability package
├── plugins/
│   ├── api/
│   │   └── invoice-processing/
│   ├── workflows/
│   │   └── invoice-processing/
│   ├── web/
│   ├── cli/
│   ├── agents/
│   └── mcp/
└── rawr.hq.ts                   # single composition entrypoint
```

## End-to-End Example (Concrete, Stable Names)

Capability name used everywhere in this example: `invoice-processing`.

### 1) Package authoring (`packages/invoice-processing/*`)

`packages/invoice-processing/src/schemas.ts`
```ts
import { Type, type Static } from "typebox";

export const StartInvoiceProcessingSchema = {
  input: Type.Object(
    {
      invoiceId: Type.String({ minLength: 1 }),
      requestedBy: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  output: Type.Object(
    {
      runId: Type.String({ minLength: 1 }),
      accepted: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
} as const;
export type StartInvoiceProcessingInput = Static<typeof StartInvoiceProcessingSchema.input>;
export type StartInvoiceProcessingOutput = Static<typeof StartInvoiceProcessingSchema.output>;

export const GetInvoiceProcessingStatusSchema = {
  input: Type.Object(
    { runId: Type.String({ minLength: 1 }) },
    { additionalProperties: false },
  ),
  output: Type.Object(
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
} as const;
export type GetInvoiceProcessingStatusInput = Static<typeof GetInvoiceProcessingStatusSchema.input>;
export type GetInvoiceProcessingStatusOutput = Static<typeof GetInvoiceProcessingStatusSchema.output>;
```

`packages/invoice-processing/src/workflow-events.ts`
```ts
import { Type, type Static } from "typebox";

export const INVOICE_PROCESSING_REQUESTED_EVENT = "invoice.processing.requested" as const;

export const InvoiceProcessingRequestedEventSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    invoiceId: Type.String({ minLength: 1 }),
    requestedBy: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type InvoiceProcessingRequestedEvent = Static<typeof InvoiceProcessingRequestedEventSchema>;
```

`packages/invoice-processing/src/operations.ts`
```ts
import type {
  GetInvoiceProcessingStatusOutput,
  StartInvoiceProcessingInput,
  StartInvoiceProcessingOutput,
} from "./schemas";

export type InvoiceRunStore = {
  save: (run: { runId: string; status: GetInvoiceProcessingStatusOutput["status"] }) => Promise<void>;
  get: (runId: string) => Promise<{ runId: string; status: GetInvoiceProcessingStatusOutput["status"] } | null>;
};

export type InvoiceProcessingDeps = {
  runStore: InvoiceRunStore;
  newRunId: () => string;
};

export async function startInvoiceProcessing(
  deps: InvoiceProcessingDeps,
  input: StartInvoiceProcessingInput,
): Promise<StartInvoiceProcessingOutput> {
  const runId = deps.newRunId();
  await deps.runStore.save({ runId, status: "queued" });
  return { runId, accepted: true };
}

export async function getInvoiceProcessingStatus(
  deps: InvoiceProcessingDeps,
  runId: string,
): Promise<GetInvoiceProcessingStatusOutput> {
  const existing = await deps.runStore.get(runId);
  return existing ?? { runId, status: "failed" };
}
```

`packages/invoice-processing/src/orpc/contract.ts`
```ts
import { oc } from "@orpc/contract";
import { typeBoxStandardSchema } from "@rawr/core/orpc/typebox-standard-schema";
import {
  GetInvoiceProcessingStatusSchema,
  StartInvoiceProcessingSchema,
} from "../schemas";

export const invoiceProcessingContract = oc.router({
  startInvoiceProcessing: oc
    .route({
      method: "POST",
      path: "/invoices/processing/start",
      tags: ["invoice-processing"],
      operationId: "startInvoiceProcessing",
      summary: "Queue invoice processing",
    })
    .input(typeBoxStandardSchema(StartInvoiceProcessingSchema.input))
    .output(typeBoxStandardSchema(StartInvoiceProcessingSchema.output)),

  getInvoiceProcessingStatus: oc
    .route({
      method: "GET",
      path: "/invoices/processing/{runId}",
      tags: ["invoice-processing"],
      operationId: "getInvoiceProcessingStatus",
      summary: "Get invoice processing status",
    })
    .input(typeBoxStandardSchema(GetInvoiceProcessingStatusSchema.input))
    .output(typeBoxStandardSchema(GetInvoiceProcessingStatusSchema.output)),
});
```

### 2) API runtime adapter (`plugins/api/invoice-processing/*`)

`plugins/api/invoice-processing/src/index.ts`
```ts
import { implement } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import type { Inngest } from "inngest";
import {
  INVOICE_PROCESSING_REQUESTED_EVENT,
  invoiceProcessingContract,
  startInvoiceProcessing,
  getInvoiceProcessingStatus,
  type InvoiceProcessingDeps,
} from "@rawr/invoice-processing";

export type InvoiceApiContext = {
  deps: InvoiceProcessingDeps;
  inngestClient: Inngest;
};

export function registerInvoiceProcessingApiPlugin() {
  const os = implement<typeof invoiceProcessingContract, InvoiceApiContext>(invoiceProcessingContract);

  const router = os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(async ({ context, input }) => {
      const result = await startInvoiceProcessing(context.deps, input);

      await context.inngestClient.send({
        name: INVOICE_PROCESSING_REQUESTED_EVENT,
        data: {
          runId: result.runId,
          invoiceId: input.invoiceId,
          requestedBy: input.requestedBy,
        },
      });

      return result;
    }),

    getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(async ({ context, input }) => {
      if (!input.runId) {
        throw new ORPCError("BAD_REQUEST", { status: 400, message: "runId is required" });
      }
      return await getInvoiceProcessingStatus(context.deps, input.runId);
    }),
  });

  return {
    namespace: "invoiceProcessing" as const,
    contract: invoiceProcessingContract,
    router,
  };
}
```

### 3) Workflow runtime adapter (`plugins/workflows/invoice-processing/*`)

`plugins/workflows/invoice-processing/src/index.ts`
```ts
import type { Inngest } from "inngest";
import { Value } from "typebox/value";
import {
  INVOICE_PROCESSING_REQUESTED_EVENT,
  InvoiceProcessingRequestedEventSchema,
  type InvoiceProcessingDeps,
} from "@rawr/invoice-processing";

export function registerInvoiceProcessingWorkflowPlugin(input: {
  inngestClient: Inngest;
  deps: InvoiceProcessingDeps;
}) {
  const fn = input.inngestClient.createFunction(
    {
      id: "invoice-processing-runner",
      name: "Invoice Processing Runner",
      retries: 2,
    },
    { event: INVOICE_PROCESSING_REQUESTED_EVENT },
    async ({ event, step }) => {
      if (!Value.Check(InvoiceProcessingRequestedEventSchema, event.data)) {
        throw new Error("Invalid invoice-processing event payload");
      }

      await step.run("mark-running", async () => {
        await input.deps.runStore.save({ runId: event.data.runId, status: "running" });
      });

      await step.run("perform-processing", async () => {
        // Domain work goes through package operations/services.
      });

      await step.run("mark-completed", async () => {
        await input.deps.runStore.save({ runId: event.data.runId, status: "completed" });
      });
    },
  );

  return {
    functions: [fn] as const,
  };
}
```

### 4) Composition authority (`rawr.hq.ts`)

`rawr.hq.ts`
```ts
import { Inngest } from "inngest";
import { oc } from "@orpc/contract";
import { createInvoiceProcessingDeps } from "@rawr/invoice-processing/node";
import { registerInvoiceProcessingApiPlugin } from "./plugins/api/invoice-processing/src";
import { registerInvoiceProcessingWorkflowPlugin } from "./plugins/workflows/invoice-processing/src";

const deps = createInvoiceProcessingDeps();
const inngestClient = new Inngest({ id: "rawr-hq" });

const invoiceApi = registerInvoiceProcessingApiPlugin();
const invoiceWorkflows = registerInvoiceProcessingWorkflowPlugin({
  inngestClient,
  deps,
});

const hqContract = oc.router({
  invoiceProcessing: invoiceApi.contract,
});

const hqRouter = {
  invoiceProcessing: invoiceApi.router,
};

export default {
  orpc: {
    contract: hqContract,
    router: hqRouter,
    context: {
      deps,
      inngestClient,
    },
  },
  inngest: {
    client: inngestClient,
    functions: [...invoiceWorkflows.functions],
  },
} as const;
```

### 5) Server host mounts only (`apps/server/src/rawr.ts`)

`apps/server/src/rawr.ts`
```ts
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import { implement } from "@orpc/server";
import { serve as inngestServe } from "inngest/bun";
import rawrHq from "../../rawr.hq";
import type { AnyElysia } from "./plugins";

export function registerRawrRoutes<TApp extends AnyElysia>(app: TApp): TApp {
  const os = implement<typeof rawrHq.orpc.contract, typeof rawrHq.orpc.context>(rawrHq.orpc.contract);
  const router = os.router(rawrHq.orpc.router);

  const rpcHandler = new RPCHandler(router);
  const openApiHandler = new OpenAPIHandler(router);

  app.all("/rpc/*", async ({ request }) => {
    const { response } = await rpcHandler.handle(request, {
      prefix: "/rpc",
      context: rawrHq.orpc.context,
    });
    return response ?? new Response("Not Found", { status: 404 });
  });

  app.all("/api/orpc/*", async ({ request }) => {
    const { response } = await openApiHandler.handle(request, {
      prefix: "/api/orpc",
      context: rawrHq.orpc.context,
    });
    return response ?? new Response("Not Found", { status: 404 });
  });

  const inngestHandler = inngestServe({
    client: rawrHq.inngest.client,
    functions: rawrHq.inngest.functions,
  });
  app.all("/api/inngest", async ({ request }) => inngestHandler(request));

  return app;
}
```

## What This Example Proves
1. Separate runtime semantics:
- API adapter handles request lifecycle and returns RPC/OpenAPI responses.
- Workflow adapter handles durable execution lifecycle with retries and step boundaries.
2. Unified capability authoring surface:
- Schemas, events, contracts, and operations are authored once in `packages/invoice-processing/*`.
3. No plugin-to-plugin imports:
- API and workflow plugins communicate through package-defined event contracts and shared operations.
4. Composition does not drift upward forever:
- New capability wiring is added in `rawr.hq.ts` once.
- Host apps stay thin and stable.

## How Big `rawr.hq.ts` Should Get
- Target size: registry + wiring only.
- If it grows, split by capability with sibling modules and keep `rawr.hq.ts` as the root aggregator.
- Keep business logic out of `rawr.hq.ts`.

Example growth pattern:
```text
rawr.hq.ts
rawr.hq/
  invoice-processing.ts
  customer-support.ts
  analytics.ts
```

`rawr.hq.ts` remains:
```ts
import invoiceProcessing from "./rawr.hq/invoice-processing";
import customerSupport from "./rawr.hq/customer-support";
import analytics from "./rawr.hq/analytics";

export default {
  ...invoiceProcessing,
  ...customerSupport,
  ...analytics,
};
```

## Migration Guidance (From Current State)
1. Add `rawr.hq.ts` and move capability composition out of `apps/server/src/*`.
2. Keep existing `apps/server` host mounts, but make them consume `rawr.hq.ts`.
3. Move reusable schemas/contracts/events/operations to `packages/*` where missing.
4. Add `plugins/api/*` and `plugins/workflows/*` roots for runtime adapters.
5. Add lint/dependency rule: `plugins/**` cannot import from `plugins/**` (except self package path).
6. Add CI check for composition ownership: `rawr.hq.ts` is required and becomes the only multi-plugin wiring authority.

## Final Recommendation
- Keep flat runtime surface roots.
- Keep capability authoring in packages.
- Keep runtime adapters in plugins.
- Keep composition centralized in `rawr.hq.ts`.
- Do not collapse API/workflows into one runtime type.
- Do not invert topology into capability-root plugin trees in this cycle.
