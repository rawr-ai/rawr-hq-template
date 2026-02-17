# E2E 04 — Real-World Context and Middleware Across Package, API, and Workflows

## 1) Goal and Real-World Framing
This walkthrough shows one capability (`invoicing`) under realistic context scale:
1. Multi-tenant principal + role checks.
2. Request metadata (`requestId`, `correlationId`, IP, UA).
3. Network policy (trusted ingress + egress policy tagging).
4. Internal package orchestration via in-process client.
5. Workflow trigger API that enqueues durable execution.
6. Inngest runtime execution with run-level middleware context.

This is intentionally not a toy single-parameter example.

## 2) Non-Negotiable Route Semantics
1. `/api/workflows/*` is caller-facing trigger/status.
2. `/api/inngest` is runtime ingress only.
3. Browser and API callers do not invoke `/api/inngest` directly.

## 3) Topology Diagram
```mermaid
flowchart LR
  Caller["Caller or Internal UI"] --> Api["/api/orpc/invoicing/*"]
  Caller --> Workflows["/api/workflows/invoicing/*"]

  Api --> ApiPlugin["plugins/api/invoicing\ncontext + contract + operations + router"]
  Workflows --> WfPlugin["plugins/workflows/invoicing\ncontext + contract + operations + router"]

  ApiPlugin --> PkgClient["packages/invoicing/src/client.ts"]
  WfPlugin --> PkgClient

  WfPlugin --> SendEvent["inngest.send(invoicing.reconciliation.requested)"]
  SendEvent --> Ingress["/api/inngest"]
  Ingress --> Fn["Inngest function\ninvoicing.reconciliation"]
  Fn --> PkgClient

  Host["apps/server/src/rawr.ts"] --> Api
  Host --> Workflows
  Host --> Ingress
  Compose["rawr.hq.ts"] --> Host
```

## 4) Canonical File Tree
```text
rawr.hq.ts
apps/server/src/
  rawr.ts
  boundary/
    context.ts
packages/orpc-standards/src/
  typebox-standard-schema.ts
  index.ts
packages/invoicing/src/
  context.ts
  domain/
    reconciliation.ts
  middleware.ts
  procedures/
    preflight-reconciliation.ts
    get-reconciliation-status.ts
    mark-reconciliation-result.ts
    index.ts
  router.ts
  client.ts
  errors.ts
  index.ts
plugins/api/invoicing/src/
  context.ts
  contract.ts
  operations/
    start-reconciliation.ts
    get-reconciliation-status.ts
  router.ts
  index.ts
plugins/workflows/invoicing/src/
  context.ts
  contract.ts
  operations/
    trigger-reconciliation.ts
    get-run-status.ts
  router.ts
  inngest-middleware.ts
  functions/
    reconciliation.ts
  index.ts
```

## 5) Key Files and Concrete Code

### 5.1 Package layer: shared domain, context contract, and idempotent middleware

I/O ownership note: domain modules keep domain concepts only; procedure and boundary route schemas are defined beside procedures/contracts. Inline `.input/.output` is default for route/procedure I/O, and extracted I/O schemas are reserved for truly shared/large payloads using `{ input, output }` pairing.

```ts
// packages/invoicing/src/domain/reconciliation.ts
import { Type, type Static } from "typebox";

export const ReconciliationScopeSchema = Type.Object(
  {
    accountId: Type.String({ minLength: 1 }),
    invoiceIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    dryRun: Type.Boolean({ default: false }),
  },
  { additionalProperties: false, $id: "ReconciliationScope" },
);
export type ReconciliationScope = Static<typeof ReconciliationScopeSchema>;

export const ReconciliationStateSchema = Type.Union(
  [
    Type.Literal("queued"),
    Type.Literal("running"),
    Type.Literal("completed"),
    Type.Literal("failed"),
  ],
  { $id: "ReconciliationState" },
);
export type ReconciliationState = Static<typeof ReconciliationStateSchema>;

export function isTerminalReconciliationState(status: ReconciliationState): boolean {
  return status === "completed" || status === "failed";
}

export const ReconciliationStatusSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    tenantId: Type.String({ minLength: 1 }),
    status: ReconciliationStateSchema,
    isTerminal: Type.Boolean(),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false, $id: "ReconciliationStatus" },
);
export type ReconciliationStatus = Static<typeof ReconciliationStatusSchema>;
```

```ts
// packages/invoicing/src/context.ts
import type { ReconciliationScope, ReconciliationStatus } from "./domain/reconciliation";

export type InvoicingPrincipal = {
  subject: string;
  tenantId: string;
  roles: string[];
};

export type InvoicingRequest = {
  // Request metadata is boundary/context-owned, not a domain concept.
  requestId: string;
  correlationId: string;
  sourceIp?: string;
  userAgent?: string;
};

export type InvoicingDeps = {
  newRunId: () => string;
  nowIso: () => string;
  preflightReconciliation: (args: {
    tenantId: string;
    requestedBy: string;
    input: { requestId: string; scope: ReconciliationScope };
  }) => Promise<{ accepted: true; runId: string; correlationId: string }>;
  getStatus: (args: { tenantId: string; runId: string }) => Promise<ReconciliationStatus | null>;
  markResult: (args: { tenantId: string; input: { runId: string; ok: boolean } }) => Promise<ReconciliationStatus>;
};

export type InvoicingMiddlewareState = {
  roleChecked?: true;
  depsHydrated?: true;
};

export type InvoicingProcedureContext = {
  principal: InvoicingPrincipal;
  request: InvoicingRequest;
  deps: InvoicingDeps;
  middlewareState?: InvoicingMiddlewareState;
};
```

```ts
// packages/invoicing/src/middleware.ts
import { ORPCError, os } from "@orpc/server";
import type { InvoicingProcedureContext } from "./context";

const base = os.$context<InvoicingProcedureContext>();

export const requireFinanceWriteMiddleware = base.middleware(async ({ context, next }) => {
  // Manual dedupe: avoid repeating expensive or noisy checks in nested internal calls.
  if (context.middlewareState?.roleChecked) return next();

  if (!context.principal.roles.includes("finance:write")) {
    throw new ORPCError("FORBIDDEN", {
      status: 403,
      message: "finance:write role is required",
    });
  }

  return next({
    context: {
      middlewareState: {
        ...context.middlewareState,
        roleChecked: true,
      },
    },
  });
});

export const hydrateDepsMiddleware = base.middleware(async ({ context, next }) => {
  if (context.middlewareState?.depsHydrated) return next();

  return next({
    context: {
      deps: context.deps,
      middlewareState: {
        ...context.middlewareState,
        depsHydrated: true,
      },
    },
  });
});
```

```ts
// packages/invoicing/src/procedures/preflight-reconciliation.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";
import { ReconciliationScopeSchema } from "../domain/reconciliation";
import type { InvoicingProcedureContext } from "../context";
import { hydrateDepsMiddleware, requireFinanceWriteMiddleware } from "../middleware";

const base = os.$context<InvoicingProcedureContext>();

export const preflightReconciliationProcedure = base
  .use(requireFinanceWriteMiddleware)
  .use(hydrateDepsMiddleware)
  .input(
    std(
      Type.Object(
        {
          requestId: Type.String({ minLength: 1 }),
          scope: ReconciliationScopeSchema,
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(
    std(
      Type.Object(
        {
          accepted: Type.Literal(true),
          runId: Type.String({ minLength: 1 }),
          correlationId: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    return context.deps.preflightReconciliation({
      tenantId: context.principal.tenantId,
      requestedBy: context.principal.subject,
      input,
    });
  });
```

```ts
// packages/invoicing/src/procedures/get-reconciliation-status.ts
import { ORPCError, os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";
import { ReconciliationStatusSchema } from "../domain/reconciliation";
import type { InvoicingProcedureContext } from "../context";
import { hydrateDepsMiddleware, requireFinanceWriteMiddleware } from "../middleware";

const base = os.$context<InvoicingProcedureContext>();

export const getReconciliationStatusProcedure = base
  .use(requireFinanceWriteMiddleware)
  .use(hydrateDepsMiddleware)
  .input(std(Type.Object({ runId: Type.String({ minLength: 1 }) })))
  .output(std(ReconciliationStatusSchema))
  .handler(async ({ context, input }) => {
    const status = await context.deps.getStatus({
      tenantId: context.principal.tenantId,
      runId: input.runId,
    });

    if (!status) {
      throw new ORPCError("NOT_FOUND", {
        status: 404,
        message: `Run not found: ${input.runId}`,
      });
    }

    return status;
  });
```

```ts
// packages/invoicing/src/procedures/mark-reconciliation-result.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";
import { ReconciliationStatusSchema } from "../domain/reconciliation";
import type { InvoicingProcedureContext } from "../context";
import { hydrateDepsMiddleware, requireFinanceWriteMiddleware } from "../middleware";

const base = os.$context<InvoicingProcedureContext>();

export const markReconciliationResultProcedure = base
  .use(requireFinanceWriteMiddleware)
  .use(hydrateDepsMiddleware)
  .input(
    std(
      Type.Object(
        {
          runId: Type.String({ minLength: 1 }),
          ok: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(std(ReconciliationStatusSchema))
  .handler(async ({ context, input }) => {
    return context.deps.markResult({
      tenantId: context.principal.tenantId,
      input,
    });
  });
```

```ts
// packages/invoicing/src/router.ts
import { os } from "@orpc/server";
import { preflightReconciliationProcedure } from "./procedures/preflight-reconciliation";
import { getReconciliationStatusProcedure } from "./procedures/get-reconciliation-status";
import { markReconciliationResultProcedure } from "./procedures/mark-reconciliation-result";

export const invoicingRouter = os.router({
  preflightReconciliation: preflightReconciliationProcedure,
  getReconciliationStatus: getReconciliationStatusProcedure,
  markReconciliationResult: markReconciliationResultProcedure,
});
```

```ts
// packages/invoicing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { invoicingRouter } from "./router";
import type { InvoicingProcedureContext } from "./context";

export type InvoicingClient = ReturnType<typeof createInvoicingInternalClient>;

export function createInvoicingInternalClient(context: InvoicingProcedureContext) {
  return createRouterClient(invoicingRouter, { context });
}
```

### 5.2 API plugin: boundary context and middleware concerns (auth/role/network)

```ts
// plugins/api/invoicing/src/context.ts
import type { InvoicingClient } from "@rawr/invoicing";

export type ApiPrincipal = {
  subject: string;
  tenantId: string;
  roles: string[];
  canCallInternal: boolean;
};

export type ApiRequestMeta = {
  requestId: string;
  correlationId: string;
  sourceIp?: string;
  userAgent?: string;
  forwardedFor?: string;
};

export type ApiNetworkPolicy = {
  trustedCidrs: string[];
  enforceInternalOnly: boolean;
  egressPolicyTag: string;
};

export type InvoicingApiContext = {
  principal: ApiPrincipal;
  request: ApiRequestMeta;
  networkPolicy: ApiNetworkPolicy;
  invoicing: InvoicingClient;
};
```

```ts
// plugins/api/invoicing/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";
import {
  ReconciliationScopeSchema,
  ReconciliationStatusSchema,
} from "@rawr/invoicing/domain/reconciliation";

const tag = ["invoicing-api"] as const;

export const invoicingApiContract = oc.router({
  startReconciliation: oc
    .route({
      method: "POST",
      path: "/invoicing/reconciliation/start",
      tags: tag,
      operationId: "invoicingStartReconciliation",
    })
    .input(
      std(
        Type.Object(
          {
            requestId: Type.String({ minLength: 1 }),
            scope: ReconciliationScopeSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      std(
        Type.Object(
          {
            accepted: Type.Literal(true),
            runId: Type.String({ minLength: 1 }),
            correlationId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    ),

  getReconciliationStatus: oc
    .route({
      method: "GET",
      path: "/invoicing/reconciliation/{runId}",
      tags: tag,
      operationId: "invoicingGetReconciliationStatus",
    })
    .input(std(Type.Object({ runId: Type.String({ minLength: 1 }) })))
    .output(std(ReconciliationStatusSchema)),
});
```

```ts
// plugins/api/invoicing/src/operations/start-reconciliation.ts
import { ORPCError } from "@orpc/server";
import type { ReconciliationScope } from "@rawr/invoicing/domain/reconciliation";
import type { InvoicingApiContext } from "../context";

function assertNetworkPolicy(context: InvoicingApiContext) {
  if (!context.networkPolicy.enforceInternalOnly) return;

  const trusted = context.networkPolicy.trustedCidrs;
  const source = context.request.sourceIp ?? "";
  const allowed = trusted.some((cidr) => source.startsWith(cidr.replace("/32", "")));

  if (!allowed) {
    throw new ORPCError("FORBIDDEN", {
      status: 403,
      message: "Source IP is not allowed by boundary policy",
    });
  }
}

function assertRole(context: InvoicingApiContext) {
  if (!context.principal.canCallInternal) {
    throw new ORPCError("FORBIDDEN", {
      status: 403,
      message: "Caller is not allowed to invoke internal invoicing procedures",
    });
  }
}

export async function startReconciliationOperation(
  context: InvoicingApiContext,
  input: { requestId: string; scope: ReconciliationScope },
): Promise<{ accepted: true; runId: string; correlationId: string }> {
  assertNetworkPolicy(context);
  assertRole(context);

  return context.invoicing.preflightReconciliation({
    ...input,
    // boundary-owned trace key propagation
    requestId: context.request.requestId,
  });
}
```

```ts
// plugins/api/invoicing/src/operations/get-reconciliation-status.ts
import type { ReconciliationStatus } from "@rawr/invoicing/domain/reconciliation";
import type { InvoicingApiContext } from "../context";

export async function getReconciliationStatusOperation(
  context: InvoicingApiContext,
  input: { runId: string },
): Promise<ReconciliationStatus> {
  return context.invoicing.getReconciliationStatus(input);
}
```

```ts
// plugins/api/invoicing/src/router.ts
import { implement } from "@orpc/server";
import { invoicingApiContract } from "./contract";
import type { InvoicingApiContext } from "./context";
import { getReconciliationStatusOperation } from "./operations/get-reconciliation-status";
import { startReconciliationOperation } from "./operations/start-reconciliation";

const os = implement<typeof invoicingApiContract, InvoicingApiContext>(invoicingApiContract);

export function createInvoicingApiRouter() {
  return os.router({
    startReconciliation: os.startReconciliation.handler(async ({ context, input }) =>
      startReconciliationOperation(context, input),
    ),
    getReconciliationStatus: os.getReconciliationStatus.handler(async ({ context, input }) =>
      getReconciliationStatusOperation(context, input),
    ),
  });
}
```

### 5.3 Workflow plugin: trigger boundary and Inngest runtime relationship

```ts
// plugins/workflows/invoicing/src/context.ts
import type { Inngest } from "inngest";
import type { InvoicingClient } from "@rawr/invoicing";

export type WorkflowPrincipal = {
  subject: string;
  tenantId: string;
  roles: string[];
  canTriggerWorkflows: boolean;
};

export type WorkflowRequest = {
  requestId: string;
  correlationId: string;
};

export type WorkflowRuntime = {
  getRunStatus: (runId: string, tenantId: string) => Promise<{ runId: string; status: string; updatedAt: string } | null>;
};

export type InvoicingWorkflowContext = {
  principal: WorkflowPrincipal;
  request: WorkflowRequest;
  runtime: WorkflowRuntime;
  inngest: Inngest;
  invoicing: InvoicingClient;
};
```

```ts
// plugins/workflows/invoicing/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";
import {
  ReconciliationScopeSchema,
  ReconciliationStatusSchema,
} from "@rawr/invoicing/domain/reconciliation";

const tag = ["invoicing-workflows"] as const;

export const invoicingWorkflowContract = oc.router({
  triggerReconciliation: oc
    .route({
      method: "POST",
      path: "/invoicing/reconciliation/trigger",
      tags: tag,
      operationId: "invoicingTriggerReconciliation",
    })
    .input(
      std(
        Type.Object(
          {
            requestId: Type.String({ minLength: 1 }),
            scope: ReconciliationScopeSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      std(
        Type.Object(
          {
            accepted: Type.Literal(true),
            runId: Type.String({ minLength: 1 }),
            correlationId: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    ),

  getRunStatus: oc
    .route({
      method: "GET",
      path: "/invoicing/runs/{runId}",
      tags: tag,
      operationId: "invoicingWorkflowGetRunStatus",
    })
    .input(std(Type.Object({ runId: Type.String({ minLength: 1 }) })))
    .output(std(ReconciliationStatusSchema)),
});
```

```ts
// plugins/workflows/invoicing/src/operations/trigger-reconciliation.ts
import { ORPCError } from "@orpc/server";
import type { ReconciliationScope } from "@rawr/invoicing/domain/reconciliation";
import type { InvoicingWorkflowContext } from "../context";

function assertWorkflowRole(context: InvoicingWorkflowContext) {
  if (!context.principal.canTriggerWorkflows) {
    throw new ORPCError("FORBIDDEN", {
      status: 403,
      message: "Caller cannot trigger workflows",
    });
  }
}

export async function triggerReconciliationOperation(
  context: InvoicingWorkflowContext,
  input: { requestId: string; scope: ReconciliationScope },
): Promise<{ accepted: true; runId: string; correlationId: string }> {
  assertWorkflowRole(context);

  // Reuse package preflight before durable enqueue.
  const preflight = await context.invoicing.preflightReconciliation({
    ...input,
    requestId: context.request.requestId,
  });

  await context.inngest.send({
    name: "invoicing.reconciliation.requested",
    data: {
      tenantId: context.principal.tenantId,
      runId: preflight.runId,
      requestId: context.request.requestId,
      correlationId: context.request.correlationId,
      requestedBy: context.principal.subject,
      scope: input.scope,
    },
  });

  return preflight;
}
```

```ts
// plugins/workflows/invoicing/src/operations/get-run-status.ts
import { ORPCError } from "@orpc/server";
import type { ReconciliationStatus } from "@rawr/invoicing/domain/reconciliation";
import type { InvoicingWorkflowContext } from "../context";

export async function getRunStatusOperation(
  context: InvoicingWorkflowContext,
  input: { runId: string },
): Promise<ReconciliationStatus> {
  const run = await context.runtime.getRunStatus(input.runId, context.principal.tenantId);

  if (!run) {
    throw new ORPCError("NOT_FOUND", {
      status: 404,
      message: `Run not found: ${input.runId}`,
    });
  }

  return {
    runId: run.runId,
    tenantId: context.principal.tenantId,
    status: run.status as "queued" | "running" | "completed" | "failed",
    isTerminal: run.status === "completed" || run.status === "failed",
    updatedAt: run.updatedAt,
  };
}
```

```ts
// plugins/workflows/invoicing/src/router.ts
import { implement } from "@orpc/server";
import { invoicingWorkflowContract } from "./contract";
import type { InvoicingWorkflowContext } from "./context";
import { getRunStatusOperation } from "./operations/get-run-status";
import { triggerReconciliationOperation } from "./operations/trigger-reconciliation";

const os = implement<typeof invoicingWorkflowContract, InvoicingWorkflowContext>(invoicingWorkflowContract);

export function createInvoicingWorkflowRouter() {
  return os.router({
    triggerReconciliation: os.triggerReconciliation.handler(async ({ context, input }) =>
      triggerReconciliationOperation(context, input),
    ),
    getRunStatus: os.getRunStatus.handler(async ({ context, input }) => getRunStatusOperation(context, input)),
  });
}
```

```ts
// plugins/workflows/invoicing/src/inngest-middleware.ts
import { InngestMiddleware } from "inngest";

export const invoicingRunContextMiddleware = new InngestMiddleware({
  name: "invoicing-run-context",
  init() {
    return {
      onFunctionRun() {
        return {
          transformInput({ ctx }) {
            return {
              ctx: {
                runTrace: {
                  requestId: ctx.event?.data?.requestId ?? "unknown",
                  correlationId: ctx.event?.data?.correlationId ?? "unknown",
                },
              },
            };
          },
        };
      },
    };
  },
});
```

```ts
// plugins/workflows/invoicing/src/functions/reconciliation.ts
import type { Inngest } from "inngest";
import type { InvoicingClient } from "@rawr/invoicing";

export function createInvoicingReconciliationFunction(args: {
  inngest: Inngest;
  invoicing: InvoicingClient;
}) {
  return args.inngest.createFunction(
    {
      id: "invoicing.reconciliation",
      retries: 2,
      concurrency: { limit: 10, key: "event.data.tenantId" },
    },
    { event: "invoicing.reconciliation.requested" },
    async ({ event, step, logger, attempt, runTrace }) => {
      logger.info("invoicing reconciliation started", {
        runId: event.data.runId,
        tenantId: event.data.tenantId,
        attempt,
        correlationId: runTrace.correlationId,
      });

      await step.run("invoicing/reconcile", async () => {
        // External reconciliation work omitted for brevity.
        return { ok: true as const };
      });

      const status = await step.run("invoicing/mark-result", async () => {
        return args.invoicing.markReconciliationResult({
          runId: event.data.runId,
          ok: true,
        });
      });

      return {
        ok: true as const,
        runId: status.runId,
        status: status.status,
      };
    },
  );
}
```

### 5.4 Host wiring: composition root and route mounts

```ts
// rawr.hq.ts
import { Inngest } from "inngest";
import { createInvoicingApiRouter, invoicingApiContract } from "./plugins/api/invoicing/src";
import {
  createInvoicingWorkflowRouter,
  createInvoicingReconciliationFunction,
  invoicingWorkflowContract,
  invoicingRunContextMiddleware,
} from "./plugins/workflows/invoicing/src";

const inngest = new Inngest({
  id: "rawr-hq",
  middleware: [invoicingRunContextMiddleware],
});

export const rawrHqManifest = {
  api: {
    contract: invoicingApiContract,
    router: createInvoicingApiRouter(),
  },
  workflows: {
    contract: invoicingWorkflowContract,
    router: createInvoicingWorkflowRouter(),
  },
  inngest: {
    client: inngest,
    functions: [
      createInvoicingReconciliationFunction({
        inngest,
        // host injects context-bound package client at runtime
        invoicing: {} as any,
      }),
    ],
  },
} as const;
```

```ts
// apps/server/src/boundary/context.ts
import type { Inngest } from "inngest";
import { createInvoicingInternalClient, type InvoicingDeps } from "@rawr/invoicing";

export type BoundaryContextDeps = {
  inngest: Inngest;
  invoicingDeps: InvoicingDeps;
  trustedCidrs: string[];
};

export function createBoundaryContext(request: Request, deps: BoundaryContextDeps) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;

  const principal = {
    subject: request.headers.get("x-sub") ?? "anonymous",
    tenantId: request.headers.get("x-tenant-id") ?? "default",
    roles: (request.headers.get("x-roles") ?? "").split(",").filter(Boolean),
    canCallInternal: true,
    canTriggerWorkflows: true,
  };

  const sourceIp = request.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const invoicing = createInvoicingInternalClient({
    principal: {
      subject: principal.subject,
      tenantId: principal.tenantId,
      roles: principal.roles,
    },
    request: { requestId, correlationId, sourceIp, userAgent },
    deps: deps.invoicingDeps,
    middlewareState: {},
  });

  return {
    principal,
    request: {
      requestId,
      correlationId,
      sourceIp,
      userAgent,
      forwardedFor: request.headers.get("x-forwarded-for") ?? undefined,
    },
    networkPolicy: {
      trustedCidrs: deps.trustedCidrs,
      enforceInternalOnly: true,
      egressPolicyTag: "invoicing-internal",
    },
    runtime: {
      getRunStatus: async (_runId: string, _tenantId: string) => null,
    },
    inngest: deps.inngest,
    invoicing,
  };
}
```

```ts
// apps/server/src/rawr.ts
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { rawrHqManifest } from "../../rawr.hq";
import { createBoundaryContext } from "./boundary/context";

export function registerRoutes(app: any, deps: { invoicingDeps: any; trustedCidrs: string[] }) {
  const apiHandler = new OpenAPIHandler(rawrHqManifest.api.router);
  const workflowHandler = new OpenAPIHandler(rawrHqManifest.workflows.router);
  const inngestHandler = createInngestServeHandler(rawrHqManifest.inngest);

  app.all(
    "/api/orpc/invoicing/*",
    async ({ request }: { request: Request }) => {
      const context = createBoundaryContext(request, {
        inngest: rawrHqManifest.inngest.client,
        invoicingDeps: deps.invoicingDeps,
        trustedCidrs: deps.trustedCidrs,
      });

      const result = await apiHandler.handle(request, {
        prefix: "/api/orpc/invoicing",
        context,
      });

      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all(
    "/api/workflows/*",
    async ({ request }: { request: Request }) => {
      const context = createBoundaryContext(request, {
        inngest: rawrHqManifest.inngest.client,
        invoicingDeps: deps.invoicingDeps,
        trustedCidrs: deps.trustedCidrs,
      });

      const result = await workflowHandler.handle(request, {
        prefix: "/api/workflows",
        context,
      });

      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all("/api/inngest", async ({ request }: { request: Request }) => {
    // Runtime ingress only.
    return inngestHandler(request);
  });
}
```

## 6) Middleware Deduplication Boundaries (Run Once vs Repeated)
| Boundary | Runs Once | Can Repeat | Dedup Strategy |
| --- | --- | --- | --- |
| Host boundary context creation | Once per HTTP request | Every request | Keep pure/idempotent request hydration in one host helper. |
| oRPC package middleware | Once per call chain when deduped | Can repeat via nested internal calls | Use context flags (`middlewareState`) for manual dedupe; rely on built-in dedupe only when leading-subset ordering conditions match. |
| API/workflow boundary checks | Once per boundary request | Every boundary request | Keep auth/network enforcement at boundary, not package runtime. |
| Inngest middleware hooks | Once per function execution phase | Can run again on retries/parallel branches | Restrict side effects to idempotent operations; avoid exactly-once assumptions in hooks like `finished`. |
| `step.run` durable steps | Once per successful step ID state | Retried independently on failure | Use stable step IDs; keep step handler logic retry-safe. |

## 7) Runtime Sequence Walkthrough

### 7.1 API-start path (`/api/orpc/invoicing/*`)
1. Host creates boundary context from request.
2. API router enforces network/role concerns.
3. Operation calls package internal client (`preflightReconciliation`).
4. Package middleware validates role, hydrates deps, and returns typed output.

### 7.2 Workflow-trigger path (`/api/workflows/*`)
1. Host creates boundary context.
2. Workflow router enforces trigger permissions.
3. Trigger operation calls package preflight and then sends `invoicing.reconciliation.requested`.
4. Trigger route returns immediately with `{ accepted, runId, correlationId }`.

### 7.3 Durable runtime path (`/api/inngest`)
1. Inngest invokes `serve` ingress.
2. Inngest middleware injects run trace context.
3. Function executes `step.run` durable blocks.
4. Function writes final status through package internal client.
5. Caller polls workflow status route for updates.

## 8) Source-Backed Rationale
1. oRPC separates initial/execution context and supports middleware-based context injection, matching explicit package + boundary context layering.
- https://orpc.dev/docs/context
- https://orpc.dev/docs/middleware
2. Contract-first + handler mounts + per-request context injection support explicit host composition and mount split.
- https://orpc.dev/docs/contract-first/implement-contract
- https://orpc.dev/docs/openapi/openapi-handler
- https://orpc.dev/docs/adapters/elysia
3. Server-side client calls are first-class in oRPC, matching package-internal client usage.
- https://orpc.dev/docs/client/server-side
4. Inngest `serve` is runtime ingress, while `createFunction` + `step.run` own durable control-plane semantics.
- https://www.inngest.com/docs/reference/serve
- https://www.inngest.com/docs/reference/functions/create
- https://www.inngest.com/docs/reference/functions/step-run
5. Inngest middleware lifecycle and tracing docs support explicit runtime middleware layer and observability caveats.
- https://www.inngest.com/docs/reference/middleware/lifecycle
- https://www.inngest.com/docs/reference/typescript/extended-traces

## 9) Open Questions (Explicit Caveats)
1. Extended traces initialization order:
- Caveat: official docs recommend initializing `extendedTracesMiddleware()` before other imports for full auto instrumentation.
- Risk: shared bootstrap files may violate ordering unless standardized.
- Source: https://www.inngest.com/docs/reference/typescript/extended-traces
2. oRPC dedupe assumptions:
- Caveat: built-in dedupe depends on leading subset + same ordering and is not universal.
- Risk: accidental duplicate expensive middleware work if teams assume global dedupe.
- Source: https://orpc.dev/docs/best-practices/dedupe-middleware
3. Inngest `finished` hook behavior:
- Caveat: docs state it is not guaranteed once and can run multiple times.
- Risk: non-idempotent side effects in finalization hooks.
- Source: https://www.inngest.com/docs/reference/middleware/lifecycle

## 10) Policy Consistency Checklist
| Policy | Status | Notes |
| --- | --- | --- |
| TypeBox-first + static types in same file | Satisfied | Domain schemas and `Static<typeof Schema>` are co-located. |
| `context.ts` contract placement | Satisfied | Package/API/workflow context contracts are explicit modules. |
| Procedure/boundary I/O ownership | Satisfied | Procedure and boundary contract snippets own trigger/mark/status route I/O schemas; domain module stays concept-only. |
| Request metadata ownership | Satisfied | `requestId`/`correlationId`/network request metadata live in context-layer request types, not domain schema ownership. |
| `typeBoxStandardSchema as std` alias | Satisfied | Snippets use `std(...)` consistently for contract/procedure I/O. |
| Split semantics (`/api/workflows/*` vs `/api/inngest`) | Satisfied | Trigger/status and runtime ingress are explicitly separate mounts. |
| Boundary vs runtime middleware separation | Satisfied | API/workflow boundary checks stay outside durable function internals. |
| Middleware dedupe guidance | Satisfied | Explicit table documents once/repeated semantics and caveats. |
