# Axis 03: End-to-End Examples (Code-First)

This axis is intentionally code-heavy.

It demonstrates the **target model we're committing to**:
- **Packages** hold schemas, events, and **runtime-agnostic implementations** (`service.ts` with injected deps).
- **Runtime plugins** bind runtime deps and attach those services to a specific runtime surface:
  - API plugins attach to **oRPC** (via `@orpc/server`).
  - Workflow plugins attach to **Inngest** (via `inngest`).
- **No `plugins/**` importing other `plugins/**`**.
- `rawr.hq.ts` is the **only cross-surface composition point**.

Stable example naming across this doc:
- Capability: `invoice-processing`
- API plugin id: `@rawr/plugin-invoice-processing-api`
- Workflows plugin id: `@rawr/plugin-invoice-processing-workflows`

---

## Canonical Pattern: "Service In Packages, Adapters In Plugins"

### Why we do it this way
This answers the question: "why not define implementation in the package?"

We **do** define the real implementation in `packages/**`.
We just define it as **runtime-agnostic services** (deps-injected functions), not as:
- an oRPC router (would pull `@orpc/server` into packages)
- an Inngest function definition (would pull Inngest runtime + serving semantics into packages)
- an Elysia mount (would pull HTTP framework semantics into packages)

The outcome:
- Shared business logic is reusable across API + workflows + CLI + tests.
- Runtime plugins stay thin: "bind deps, map inputs/outputs, attach to runtime".

---

## Shared Capability Package (`packages/invoice-processing/*`)

### File structure
```text
packages/invoice-processing/
  package.json
  src/
    schemas.ts
    events.ts
    service.ts
    orpc/
      typebox-standard-schema.ts
      contract.ts
    index.ts
```

### Schemas (TypeBox)
```ts
// packages/invoice-processing/src/schemas.ts
import { Type, type Static } from "typebox";

export const InvoiceIdSchema = Type.String({ minLength: 8, pattern: "^INV-" });
export type InvoiceId = Static<typeof InvoiceIdSchema>;

export const StartInvoiceProcessingInputSchema = Type.Object(
  {
    invoiceId: InvoiceIdSchema,
    customerId: Type.String({ minLength: 3 }),
    amountCents: Type.Integer({ minimum: 0 }),
    requestedBy: Type.String({ minLength: 3 }),
  },
  { additionalProperties: false },
);

export const StartInvoiceProcessingOutputSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    accepted: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const GetInvoiceProcessingStatusInputSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const InvoiceProcessingStatusSchema = Type.Union([
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("failed"),
  Type.Literal("unknown"),
]);

export const GetInvoiceProcessingStatusOutputSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    status: InvoiceProcessingStatusSchema,
    riskScore: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    failureReason: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const InvoiceProcessingRequestedEventDataSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    invoiceId: InvoiceIdSchema,
    customerId: Type.String({ minLength: 3 }),
    amountCents: Type.Integer({ minimum: 0 }),
    requestedBy: Type.String({ minLength: 3 }),
  },
  { additionalProperties: false },
);

export type StartInvoiceProcessingInput = Static<typeof StartInvoiceProcessingInputSchema>;
export type StartInvoiceProcessingOutput = Static<typeof StartInvoiceProcessingOutputSchema>;
export type GetInvoiceProcessingStatusInput = Static<typeof GetInvoiceProcessingStatusInputSchema>;
export type GetInvoiceProcessingStatusOutput = Static<typeof GetInvoiceProcessingStatusOutputSchema>;
export type InvoiceProcessingRequestedEventData = Static<typeof InvoiceProcessingRequestedEventDataSchema>;
```

### Events (no Inngest dependency)
```ts
// packages/invoice-processing/src/events.ts
export const INVOICE_PROCESSING_REQUESTED_EVENT = "invoice-processing.requested" as const;
```

### Service Implementation (runtime-agnostic, deps-injected)
```ts
// packages/invoice-processing/src/service.ts
import type {
  GetInvoiceProcessingStatusOutput,
  InvoiceId,
  InvoiceProcessingRequestedEventData,
  StartInvoiceProcessingInput,
  StartInvoiceProcessingOutput,
} from "./schemas";

export type InvoiceProcessingRun = {
  runId: string;
  invoiceId: InvoiceId;
  customerId: string;
  amountCents: number;
  requestedBy: string;
  status: GetInvoiceProcessingStatusOutput["status"];
  riskScore?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceRunStore = {
  save: (run: InvoiceProcessingRun) => Promise<void>;
  get: (runId: string) => Promise<InvoiceProcessingRun | null>;
  patch: (runId: string, patch: Partial<InvoiceProcessingRun>) => Promise<void>;
};

export type InvoiceProcessingLogger = {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

export type InvoiceProcessingDeps = {
  runStore: InvoiceRunStore;
  nowIso: () => string;
  newRunId: () => string;
  logger: InvoiceProcessingLogger;
};

export type InvoiceProcessingService = {
  startInvoiceProcessing: (input: StartInvoiceProcessingInput) => Promise<StartInvoiceProcessingOutput>;
  getStatus: (runId: string) => Promise<GetInvoiceProcessingStatusOutput>;

  // Intended to be called from a durable runtime (Inngest) step.
  markRunning: (runId: string) => Promise<void>;
  assessAndFinalize: (payload: InvoiceProcessingRequestedEventData) => Promise<void>;
  markFailed: (runId: string, reason: string) => Promise<void>;
};

export function createInvoiceProcessingService(deps: InvoiceProcessingDeps): InvoiceProcessingService {
  return {
    startInvoiceProcessing: async (input) => {
      const now = deps.nowIso();
      const runId = deps.newRunId();

      await deps.runStore.save({
        runId,
        invoiceId: input.invoiceId,
        customerId: input.customerId,
        amountCents: input.amountCents,
        requestedBy: input.requestedBy,
        status: "queued",
        createdAt: now,
        updatedAt: now,
      });

      deps.logger.info("invoice-processing: queued", { runId, invoiceId: input.invoiceId });
      return { runId, accepted: true };
    },

    getStatus: async (runId) => {
      const run = await deps.runStore.get(runId);
      if (!run) return { runId, status: "unknown" };

      return {
        runId: run.runId,
        status: run.status,
        riskScore: run.riskScore,
        failureReason: run.failureReason,
      };
    },

    markRunning: async (runId) => {
      const now = deps.nowIso();
      await deps.runStore.patch(runId, { status: "running", updatedAt: now, failureReason: undefined });
      deps.logger.info("invoice-processing: running", { runId });
    },

    assessAndFinalize: async (payload) => {
      const now = deps.nowIso();

      // Example "real" logic: risk score based on amount.
      const riskScore = Math.min(1, payload.amountCents / 150_000);

      await deps.runStore.patch(payload.runId, {
        status: "completed",
        riskScore,
        updatedAt: now,
      });

      deps.logger.info("invoice-processing: completed", {
        runId: payload.runId,
        invoiceId: payload.invoiceId,
        riskScore,
      });
    },

    markFailed: async (runId, reason) => {
      const now = deps.nowIso();
      await deps.runStore.patch(runId, {
        status: "failed",
        failureReason: reason,
        updatedAt: now,
      });

      deps.logger.error("invoice-processing: failed", { runId, reason });
    },
  };
}
```

### oRPC Standard Schema Adapter (TypeBox -> Standard Schema)
This keeps `@orpc/contract` happy without introducing Zod.

```ts
// packages/invoice-processing/src/orpc/typebox-standard-schema.ts
import { type Schema, type SchemaIssue } from "@orpc/contract";
import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

function decodePathSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;
  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodePathSegment(segment))
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
          return path
            ? ({ message: issue.message, path } satisfies SchemaIssue)
            : ({ message: issue.message } satisfies SchemaIssue);
        });

        return {
          issues: issues.length > 0 ? issues : [{ message: "Validation failed" }],
        };
      },
    },

    // Used by our OpenAPI generator schema converter (see apps/server/src/orpc.ts).
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
```

### oRPC Contract (in the package, but still runtime-agnostic)
Important: this is a **contract**, not a router implementation. It imports `@orpc/contract`, not `@orpc/server`.

```ts
// packages/invoice-processing/src/orpc/contract.ts
import { oc } from "@orpc/contract";
import {
  GetInvoiceProcessingStatusInputSchema,
  GetInvoiceProcessingStatusOutputSchema,
  StartInvoiceProcessingInputSchema,
  StartInvoiceProcessingOutputSchema,
} from "../schemas";
import { typeBoxStandardSchema } from "./typebox-standard-schema";

const invoiceProcessingTag = ["invoice-processing"] as const;

export const invoiceProcessingContract = oc.router({
  startInvoiceProcessing: oc
    .route({
      method: "POST",
      path: "/invoice-processing/runs",
      tags: invoiceProcessingTag,
      summary: "Queue invoice processing",
      operationId: "invoiceProcessingStart",
    })
    .input(typeBoxStandardSchema(StartInvoiceProcessingInputSchema))
    .output(typeBoxStandardSchema(StartInvoiceProcessingOutputSchema)),

  getInvoiceProcessingStatus: oc
    .route({
      method: "GET",
      path: "/invoice-processing/runs/{runId}",
      tags: invoiceProcessingTag,
      summary: "Get invoice processing status",
      operationId: "invoiceProcessingGetStatus",
    })
    .input(typeBoxStandardSchema(GetInvoiceProcessingStatusInputSchema))
    .output(typeBoxStandardSchema(GetInvoiceProcessingStatusOutputSchema)),
});

export type InvoiceProcessingContract = typeof invoiceProcessingContract;
```

### Package export surface
```ts
// packages/invoice-processing/src/index.ts
export * from "./schemas";
export * from "./events";
export * from "./service";

export * from "./orpc/contract";
```

---

## Runtime: API Plugin (`plugins/api/invoice-processing-api/*`)

### File structure
```text
plugins/api/invoice-processing-api/
  package.json
  src/
    index.ts
    runtime/
      in-memory-run-store.ts
```

### Runtime run-store adapter (example)
This is deliberately in the plugin because it's a runtime decision (you'll likely swap to sqlite/postgres/etc).

```ts
// plugins/api/invoice-processing-api/src/runtime/in-memory-run-store.ts
import type { InvoiceProcessingRun, InvoiceRunStore } from "@rawr/invoice-processing";

export function createInMemoryInvoiceRunStore(): InvoiceRunStore {
  const runs = new Map<string, InvoiceProcessingRun>();

  return {
    save: async (run) => {
      runs.set(run.runId, run);
    },

    get: async (runId) => {
      return runs.get(runId) ?? null;
    },

    patch: async (runId, patch) => {
      const existing = runs.get(runId);
      if (!existing) return;
      runs.set(runId, { ...existing, ...patch });
    },
  };
}
```

### API plugin binds deps + implements the contract
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { implement } from "@orpc/server";
import type { Inngest } from "inngest";

import {
  INVOICE_PROCESSING_REQUESTED_EVENT,
  createInvoiceProcessingService,
  invoiceProcessingContract,
  type InvoiceProcessingDeps,
} from "@rawr/invoice-processing";

export type RegisterInvoiceProcessingApiPluginOptions = {
  deps: InvoiceProcessingDeps;
  inngestClient: Inngest;
};

export function registerInvoiceProcessingApiPlugin(options: RegisterInvoiceProcessingApiPluginOptions) {
  const service = createInvoiceProcessingService(options.deps);
  const os = implement<typeof invoiceProcessingContract, { requestId: string }>(invoiceProcessingContract);

  return {
    pluginId: "@rawr/plugin-invoice-processing-api" as const,
    namespace: "invoiceProcessing" as const,
    contract: invoiceProcessingContract,

    router: os.router({
      startInvoiceProcessing: os.startInvoiceProcessing.handler(async ({ input, context }) => {
        const result = await service.startInvoiceProcessing(input);

        // "Attach to Inngest" is an adapter concern, so it lives here (plugin runtime), not in the package.
        await options.inngestClient.send({
          name: INVOICE_PROCESSING_REQUESTED_EVENT,
          data: {
            runId: result.runId,
            invoiceId: input.invoiceId,
            customerId: input.customerId,
            amountCents: input.amountCents,
            requestedBy: input.requestedBy,
          },
        });

        // Context is still useful for request-scoped observability.
        void context.requestId;

        return result;
      }),

      getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(async ({ input }) => {
        return await service.getStatus(input.runId);
      }),
    }),
  };
}
```

---

## Runtime: Workflows Plugin (`plugins/workflows/invoice-processing-workflows/*`)

### File structure
```text
plugins/workflows/invoice-processing-workflows/
  package.json
  src/
    index.ts
```

### Workflows plugin binds deps + defines Inngest functions
Key point: the **workflow function definition lives in the plugin**, but the **business behavior lives in the package service**.

```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
import { Value } from "typebox/value";
import type { Inngest } from "inngest";

import {
  InvoiceProcessingRequestedEventDataSchema,
  createInvoiceProcessingService,
  type InvoiceProcessingDeps,
  INVOICE_PROCESSING_REQUESTED_EVENT,
} from "@rawr/invoice-processing";

export type RegisterInvoiceProcessingWorkflowsPluginOptions = {
  client: Inngest;
  deps: InvoiceProcessingDeps;
};

export function registerInvoiceProcessingWorkflowsPlugin(options: RegisterInvoiceProcessingWorkflowsPluginOptions) {
  const service = createInvoiceProcessingService(options.deps);

  const reconcile = options.client.createFunction(
    {
      id: "invoice-processing.reconcile",
      name: "Invoice Processing Reconcile",
      retries: 2,
    },
    { event: INVOICE_PROCESSING_REQUESTED_EVENT },
    async ({ event, step }) => {
      if (!Value.Check(InvoiceProcessingRequestedEventDataSchema, event.data)) {
        throw new Error("invalid invoice-processing.requested payload");
      }

      // Durable orchestration belongs to Inngest; business operations belong to the service.
      await step.run("mark-running", async () => {
        await service.markRunning(event.data.runId);
      });

      await step.run("assess-and-finalize", async () => {
        await service.assessAndFinalize(event.data);
      });

      return { ok: true, runId: event.data.runId };
    },
  );

  return {
    pluginId: "@rawr/plugin-invoice-processing-workflows" as const,
    functions: [reconcile] as const,
  };
}
```

---

## Composition: `rawr.hq.ts` (wires surfaces together)

### File structure
```text
rawr.hq.ts
```

### Composition code
This is where we do the cross-surface wiring that would otherwise force plugin-to-plugin imports.

```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { Inngest } from "inngest";

import { registerInvoiceProcessingApiPlugin } from "./plugins/api/invoice-processing-api/src";
import { createInMemoryInvoiceRunStore } from "./plugins/api/invoice-processing-api/src/runtime/in-memory-run-store";
import { registerInvoiceProcessingWorkflowsPlugin } from "./plugins/workflows/invoice-processing-workflows/src";

const runStore = createInMemoryInvoiceRunStore();
const inngestClient = new Inngest({ id: "rawr-hq" });

const deps = {
  runStore,
  nowIso: () => new Date().toISOString(),
  newRunId: () => `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  logger: console,
} as const;

const invoiceApi = registerInvoiceProcessingApiPlugin({ deps, inngestClient });
const invoiceWorkflows = registerInvoiceProcessingWorkflowsPlugin({ client: inngestClient, deps });

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({
      invoiceProcessing: invoiceApi.contract,
    }),
    router: {
      invoiceProcessing: invoiceApi.router,
    },
    context: {
      requestId: "runtime-generated",
    },
  },

  inngest: {
    client: inngestClient,
    functions: [...invoiceWorkflows.functions],
  },

  // Not shown here.
  web: { mounts: [] },
  cli: { commands: [] },
  agents: { capabilities: [] },
} as const;
```

---

## Host Fixture: Server Mount (Elysia mounts manifest outputs)

This is the last step of "end to end": hosts don't implement per-capability logic.
They just mount what `rawr.hq.ts` composes.

```ts
// apps/server/src/rawr.ts (illustrative excerpt)
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { serve as inngestServe } from "inngest/bun";

import { rawrHqManifest } from "../../rawr.hq";

export function mountRawrManifest(app: any) {
  // ORPC
  const os = implement<typeof rawrHqManifest.orpc.contract, typeof rawrHqManifest.orpc.context>(
    rawrHqManifest.orpc.contract,
  );
  const router = os.router(rawrHqManifest.orpc.router);

  const rpc = new RPCHandler(router);
  const openapi = new OpenAPIHandler(router);

  app.all("/rpc/*", async ({ request }: any) => {
    const result = await rpc.handle(request, {
      prefix: "/rpc",
      context: rawrHqManifest.orpc.context,
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  });

  app.all("/api/orpc/*", async ({ request }: any) => {
    const result = await openapi.handle(request, {
      prefix: "/api/orpc",
      context: rawrHqManifest.orpc.context,
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  });

  // Inngest
  const inngestHandler = inngestServe({
    client: rawrHqManifest.inngest.client,
    functions: rawrHqManifest.inngest.functions as any,
  });
  app.all("/api/inngest", async ({ request }: any) => inngestHandler(request));
}
```

---

## What If The API Is A "View" Over The Package Contract?

Yes: **a different view implies a different contract artifact**.

The crucial part is *where that contract lives*:
- It **cannot live only in an API plugin** if other repo code (web/cli/tests) needs to import it, because plugins can't import other plugins.
- So it lives in `packages/**` as another contract module.

### Concrete pattern: multiple contracts, one service
```text
packages/invoice-processing/src/orpc/
  contract.internal.ts   # no HTTP semantics, RPC-only (optional)
  contract.public.ts     # public OpenAPI view (HTTP route metadata)
plugins/api/invoice-processing-api/src/index.ts
rawr.hq.ts               # chooses which contract gets exposed
```

Example: internal contract (RPC-only, no `.route()`)
```ts
// packages/invoice-processing/src/orpc/contract.internal.ts
import { oc } from "@orpc/contract";
import {
  GetInvoiceProcessingStatusInputSchema,
  GetInvoiceProcessingStatusOutputSchema,
  StartInvoiceProcessingInputSchema,
  StartInvoiceProcessingOutputSchema,
} from "../schemas";
import { typeBoxStandardSchema } from "./typebox-standard-schema";

export const invoiceProcessingInternalContract = oc.router({
  start: oc
    .input(typeBoxStandardSchema(StartInvoiceProcessingInputSchema))
    .output(typeBoxStandardSchema(StartInvoiceProcessingOutputSchema)),

  status: oc
    .input(typeBoxStandardSchema(GetInvoiceProcessingStatusInputSchema))
    .output(typeBoxStandardSchema(GetInvoiceProcessingStatusOutputSchema)),
});
```

Example: public contract (OpenAPI/HTTP view)
```ts
// packages/invoice-processing/src/orpc/contract.public.ts
import { oc } from "@orpc/contract";
import {
  GetInvoiceProcessingStatusInputSchema,
  GetInvoiceProcessingStatusOutputSchema,
  StartInvoiceProcessingInputSchema,
  StartInvoiceProcessingOutputSchema,
} from "../schemas";
import { typeBoxStandardSchema } from "./typebox-standard-schema";

const tag = ["invoice-processing"] as const;

export const invoiceProcessingPublicContract = oc.router({
  start: oc
    .route({
      method: "POST",
      path: "/invoice-processing/runs",
      tags: tag,
      operationId: "invoiceProcessingStart",
      summary: "Queue invoice processing",
    })
    .input(typeBoxStandardSchema(StartInvoiceProcessingInputSchema))
    .output(typeBoxStandardSchema(StartInvoiceProcessingOutputSchema)),

  status: oc
    .route({
      method: "GET",
      path: "/invoice-processing/runs/{runId}",
      tags: tag,
      operationId: "invoiceProcessingGetStatus",
      summary: "Get invoice processing status",
    })
    .input(typeBoxStandardSchema(GetInvoiceProcessingStatusInputSchema))
    .output(typeBoxStandardSchema(GetInvoiceProcessingStatusOutputSchema)),
});
```

And then **the API plugin implements whichever contract we choose to expose** (and `rawr.hq.ts` decides which one is mounted).

### Rule of thumb
- If you have exactly one "public" surface: keep one contract (`contract.ts`) and keep moving.
- If you need multiple views (public vs internal vs admin): create additional contract modules under the same capability package.
- If the contracts become large enough that the capability package feels cluttered: split into a sibling package like `packages/invoice-processing-contracts`, but keep the rule: **contracts stay in packages, not plugins**.
