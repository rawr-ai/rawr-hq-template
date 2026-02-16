# SESSION_019c587a - Pure Package End-to-End (oRPC-First Canonical)

## Status
- Canonical direction for this session: pure package, end-to-end.
- This file is the forward-only source of truth for architecture convergence.
- Historical docs are not retrofitted.

## Locked Defaults
1. Every domain package must ship:
- one internal oRPC router,
- one in-process oRPC client wrapper,
- pure TypeScript service modules.
2. API boundary is boundary-owned by default.
3. Workflow capability exposure is split: caller-triggered workflow API procedures mount under `/api/workflows/<capability>/...`, while Inngest execution ingress is `/api/inngest` only.
4. Workflow trigger procedures default to internal visibility and require explicit per-procedure promotion to external.
5. `rawr.hq.ts` remains central composition now; auto-discovery is deferred.
6. Runtime plugin-to-plugin imports are disallowed.

## Surface Semantics (Hard)

### 1) Domain internal package surface
- Purpose: stable capability logic + internal contract harness.
- Lives in: `packages/<capability>/src/*`.
- Topology lock: exactly one exported internal oRPC router and exactly one in-process internal client wrapper per domain package.
- Transport-neutral: no host mounts, no HTTP ingress binding, no Inngest `serve()` ingress, and no host route registration semantics in package internals.

### 2) Boundary API surface
- Purpose: externally callable API (HTTP/RPC/OpenAPI/WS boundary semantics).
- Lives in: `plugins/api/<capability>-api/src/*`.
- Owns boundary contract, boundary router, boundary client artifacts by default.
- Includes caller-triggered workflow API procedures under `/api/workflows/<capability>/...`.

### 3) Inngest execution ingress surface
- Purpose: machine endpoint for Inngest to execute workflow functions.
- Route: `/api/inngest`.
- Lives in host mounting layer (`apps/server/src/*`), not in package domain logic.
- Not a caller-triggered API surface and never a substitute for `/api/workflows/*`.

## Path Semantics (No Ambiguity)
- `/api/inngest`: execution ingress for Inngest runtime only (signed/guarded), not a caller-triggered trigger API.
- `/api/workflows/<capability>/...`: caller-triggered workflow API surface (boundary API semantics).
- `/api/events/...` is not used as a trigger API alias in this canonical model.

## Hard Policy Rules

### Domain Package Policy (Mandatory)
Each domain package must include:
1. `packages/<capability>/src/router.ts`
- single exported internal oRPC router for the package.
2. `packages/<capability>/src/client.ts`
- in-process server-side oRPC client wrapper for internal callers.
3. `packages/<capability>/src/services/*`
- pure service modules (service-module-first default).

Additional constraints:
- Topology lock (hard): exactly one exported internal router and exactly one in-process client wrapper per domain package.
- Service-module-first is default; split to `operations/*` only when explicit thresholds are exceeded.
- Package router remains transport-neutral with no host mounting semantics.

### API Plugin Policy (Boundary-Owned Default)
Canonical default (Path B: boundary-specific contract + router):
- Boundary plugin owns `contract.boundary.ts` + `router.ts` + boundary client shape.
- Boundary handlers call package internal client and/or package services.

When to use Path B:
- external boundary semantics need independent evolution from package internals,
- auth/rate-limit/shape semantics diverge from package internal procedures,
- boundary requires explicit external-facing contract ownership.

When not to use Path B:
- boundary surface is almost entirely 1:1 with package internal contract and requires no meaningful adaptation.

Exception path (Path A: simple reuse of package internal contract/impl):
- API plugin may reuse package internal contract + internal router only when overlap is high 1:1 and reuse remains simple.

When to use Path A:
- boundary surface is nearly identical to package internal surface,
- no substantial boundary-specific policy/shape divergence.

When not to use Path A:
- public boundary needs independent evolution,
- auth/rate-limit/shape semantics diverge,
- adaptation would create wrapper-heavy extension layers.

Anti-pattern guardrail (hard):
- No extension hell.
- No tangled multi-layer inheritance or contract-extension stacks.
- No tangled multi-router abstraction for a single API plugin.

### Workflows Policy
Execution model default (Inngest-first / ingest-first):
- Workflow execution runs through Inngest functions for durable execution.

Default workflow plugin requirement:
- Workflow plugins must generate a workflow trigger oRPC router mounted under `/api/workflows/<capability>/...`.
- Workflow plugins must also provide Inngest functions as the execution surface.

Visibility policy:
- Per-procedure metadata: `visibility: "internal" | "external"`.
- Default visibility: `internal`.
- Promotion to `external` is explicit per procedure (no implicit external exposure).
- Internal callers are trusted server/operator flows by default; external callers can invoke only explicitly promoted procedures.

Boundary constraints:
- No runtime plugin-to-plugin imports.
- Workflow-to-workflow orchestration composes through Inngest-native patterns (`step.invoke`, `step.sendEvent`) and/or package logic, not direct plugin imports.
- Cross-workflow calls flow via composed surfaces only (trigger routers + Inngest functions/events), not plugin runtime imports.

### Composition Policy (`rawr.hq.ts`)
- Central manual composition is active in this phase.
- Active capability manifest fields (per capability):
- `capabilityId`
- `api: { contract, router }` for boundary API surface artifacts.
- `workflows: { triggerContract, triggerRouter, functions }` for workflow trigger + Inngest execution artifacts.
- Active merge behavior in `rawr.hq.ts`:
- `orpc.contract` merges each capability boundary API contract + workflow trigger contract under capability namespaces.
- `orpc.router` merges each capability boundary API router + workflow trigger router under capability namespaces.
- `inngest.functions` merges all capability workflow function arrays into one composed execution registration list.
- Discovery-driven auto-composition from plugin manifests is deferred.

## Deferred Discovery Decision (Explicit)
Deferred for later cutover phase only:
- Plugin-local capability manifests + auto-discovery composition pipeline.

Current phase non-goal:
- No discovery-driven assembly replacing explicit `rawr.hq.ts` registration.

Cutover trigger for re-open:
- At least 3 capabilities show repeated manual registration boilerplate and manifest drift risk.

## Canonical n=1 Structure

```text
.
├── rawr.hq.ts
├── apps/
│   └── server/
│       └── src/
│           ├── rawr.ts
│           ├── orpc/register-routes.ts
│           └── inngest/register-route.ts
├── packages/
│   └── invoice-processing/
│       └── src/
│           ├── domain/
│           │   ├── types.ts
│           │   └── invariants.ts
│           ├── services/
│           │   ├── invoice-lifecycle.service.ts
│           │   └── index.ts
│           ├── contract.ts
│           ├── router.ts
│           ├── client.ts
│           └── index.ts
└── plugins/
    ├── api/
    │   └── invoice-processing-api/
    │       └── src/
    │           ├── contract.boundary.ts
    │           ├── router.ts
    │           ├── surface.ts
    │           └── index.ts
    └── workflows/
        └── invoice-processing-workflows/
            └── src/
                ├── contract.triggers.ts
                ├── router.triggers.ts
                ├── visibility.ts
                ├── functions/
                │   ├── reconcile-invoice.fn.ts
                │   └── index.ts
                ├── surface.ts
                └── index.ts
```

## Canonical n>1 Structure (Scaled)

```text
.
├── rawr.hq.ts
├── packages/
│   ├── invoice-processing/src/{domain/*,services/*,contract.ts,router.ts,client.ts,index.ts}
│   └── payment-ops/src/{domain/*,services/*,contract.ts,router.ts,client.ts,index.ts}
├── plugins/api/
│   ├── invoice-processing-api/src/{contract.boundary.ts,router.ts,surface.ts,index.ts}
│   └── payment-ops-api/src/{contract.boundary.ts,router.ts,surface.ts,index.ts}
└── plugins/workflows/
    ├── invoice-processing-workflows/src/{contract.triggers.ts,router.triggers.ts,visibility.ts,functions/*,surface.ts,index.ts}
    └── payment-ops-workflows/src/{contract.triggers.ts,router.triggers.ts,visibility.ts,functions/*,surface.ts,index.ts}
```

Scaled merge rule (same policy, many capabilities):
1. Each capability contributes one `api` surface: `{ contract, router }`.
2. Each capability contributes one `workflows` surface: `{ triggerContract, triggerRouter, functions }`.
3. `rawr.hq.ts` merges all capability surfaces into `orpc.contract`, `orpc.router`, and `inngest.functions`.

Growth invariants:
1. One exported internal router per domain package.
2. One in-process internal client per domain package.
3. One boundary router per API plugin.
4. Workflow trigger router exists for each workflow plugin.
5. Service modules are cohesive first; split to `operations/*` only by threshold.

## End-to-End Example (Invoicing Capability)

This walkthrough is one continuous path:
1. Domain package owns pure services + internal oRPC surface.
2. API and workflow plugins expose boundary/trigger surfaces.
3. `rawr.hq.ts` merges capability surfaces.
4. Host app mounts merged surfaces at `/api/workflows/*` and `/api/inngest`.

### 1) Domain package: pure services + mandatory internal oRPC router + internal client

```ts
// packages/invoice-processing/src/services/invoice-lifecycle.service.ts
export type InvoiceLifecycleDeps = {
  newRunId: () => string;
  saveRun: (run: { runId: string; status: "queued" | "running" | "completed" | "failed" }) => Promise<void>;
  getRun: (runId: string) => Promise<{ runId: string; status: "queued" | "running" | "completed" | "failed" } | null>;
};

export async function startInvoiceProcessing(
  deps: InvoiceLifecycleDeps,
  input: { invoiceId: string; requestedBy: string },
) {
  const runId = deps.newRunId();
  await deps.saveRun({ runId, status: "queued" });
  return { runId, accepted: true as const };
}

export async function getInvoiceProcessingStatus(deps: InvoiceLifecycleDeps, runId: string) {
  const run = await deps.getRun(runId);
  return run ?? { runId, status: "failed" as const };
}
```

```ts
// packages/invoice-processing/src/contract.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export const invoiceInternalContract = oc.router({
  start: oc
    .input(
      z.object({
        invoiceId: z.string().min(1),
        requestedBy: z.string().min(1),
      }),
    )
    .output(
      z.object({
        runId: z.string().min(1),
        accepted: z.literal(true),
      }),
    ),

  getStatus: oc
    .input(z.object({ runId: z.string().min(1) }))
    .output(
      z.object({
        runId: z.string().min(1),
        status: z.enum(["queued", "running", "completed", "failed"]),
      }),
    ),
});
```

```ts
// packages/invoice-processing/src/router.ts
import { implement } from "@orpc/server";
import { invoiceInternalContract } from "./contract";
import { getInvoiceProcessingStatus, startInvoiceProcessing, type InvoiceLifecycleDeps } from "./services/invoice-lifecycle.service";

export type InvoicePackageContext = {
  deps: InvoiceLifecycleDeps;
};

export function createInvoiceInternalRouter() {
  const os = implement<typeof invoiceInternalContract, InvoicePackageContext>(invoiceInternalContract);

  return os.router({
    start: os.start.handler(async ({ context, input }) => {
      return startInvoiceProcessing(context.deps, input);
    }),
    getStatus: os.getStatus.handler(async ({ context, input }) => {
      return getInvoiceProcessingStatus(context.deps, input.runId);
    }),
  });
}
```

```ts
// packages/invoice-processing/src/client.ts
import { createRouterClient } from "@orpc/server";
import { createInvoiceInternalRouter, type InvoicePackageContext } from "./router";

export function createInvoiceInternalClient(context: InvoicePackageContext) {
  return createRouterClient(createInvoiceInternalRouter(), { context });
}
```

```ts
// packages/invoice-processing/src/index.ts
export { invoiceInternalContract } from "./contract";
export { createInvoiceInternalRouter, type InvoicePackageContext } from "./router";
export { createInvoiceInternalClient } from "./client";
export type { InvoiceLifecycleDeps } from "./services/invoice-lifecycle.service";
```

### 2) API plugin: boundary-owned default (Path B)

```ts
// plugins/api/invoice-processing-api/src/contract.boundary.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/start" })
    .input(
      z.object({
        invoiceId: z.string().min(1),
        requestedBy: z.string().min(1),
        traceToken: z.string().optional(),
      }),
    )
    .output(z.object({ runId: z.string().min(1), accepted: z.boolean() })),

  getInvoiceProcessingStatus: oc
    .route({ method: "GET", path: "/invoices/processing/{runId}" })
    .input(z.object({ runId: z.string().min(1) }))
    .output(z.object({ runId: z.string().min(1), status: z.enum(["queued", "running", "completed", "failed"]) })),
});
```

```ts
// plugins/api/invoice-processing-api/src/router.ts
import { implement } from "@orpc/server";
import { createInvoiceInternalClient, type InvoicePackageContext } from "@rawr/invoice-processing";
import { invoiceApiContract } from "./contract.boundary";

export type InvoiceApiContext = InvoicePackageContext;

export function createInvoiceApiRouter() {
  const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(async ({ context, input }) => {
      const internal = createInvoiceInternalClient(context);
      return internal.start({
        invoiceId: input.invoiceId,
        requestedBy: input.requestedBy,
      });
    }),

    getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(async ({ context, input }) => {
      const internal = createInvoiceInternalClient(context);
      return internal.getStatus({ runId: input.runId });
    }),
  });
}
```

```ts
// plugins/api/invoice-processing-api/src/surface.ts
import { invoiceApiContract } from "./contract.boundary";
import { createInvoiceApiRouter } from "./router";

export const invoiceApiSurface = {
  contract: invoiceApiContract,
  router: createInvoiceApiRouter(),
} as const;
```

### 3) API plugin reuse exception (Path A)

```ts
// plugins/api/invoice-processing-api/src/reuse-surface.ts
import { invoiceInternalContract, createInvoiceInternalRouter } from "@rawr/invoice-processing";

// Use only when overlap is mostly 1:1 and no complex boundary divergence is needed.
export const invoiceApiReuseSurface = {
  contract: invoiceInternalContract,
  router: createInvoiceInternalRouter(),
} as const;
```

Path A use/non-use criteria are canonical in `API Plugin Policy (Boundary-Owned Default)` above; this section demonstrates only the reuse surface shape.

### 4) Workflow plugin: ingest execution + trigger router

```ts
// plugins/workflows/invoice-processing-workflows/src/visibility.ts
export type TriggerVisibility = "internal" | "external";

export const workflowTriggerVisibility = {
  triggerInvoiceReconciliation: "internal",
  retryInvoiceReconciliation: "internal",
} as const satisfies Record<string, TriggerVisibility>;
```

```ts
// plugins/workflows/invoice-processing-workflows/src/contract.triggers.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/trigger-reconciliation" })
    .input(z.object({ runId: z.string().min(1) }))
    .output(z.object({ accepted: z.boolean() })),

  retryInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/retry" })
    .input(z.object({ runId: z.string().min(1), reason: z.string().min(1) }))
    .output(z.object({ accepted: z.boolean() })),
});
```

```ts
// plugins/workflows/invoice-processing-workflows/src/router.triggers.ts
import { implement } from "@orpc/server";
import type { Inngest } from "inngest";
import { invoiceWorkflowTriggerContract } from "./contract.triggers";
import { workflowTriggerVisibility } from "./visibility";

export type WorkflowTriggerContext = {
  inngest: Inngest;
  canCallInternal: boolean;
};

function assertVisible(procedure: keyof typeof workflowTriggerVisibility, context: WorkflowTriggerContext) {
  const visibility = workflowTriggerVisibility[procedure];
  if (visibility === "internal" && !context.canCallInternal) {
    throw new Error(`Procedure ${String(procedure)} is internal`);
  }
}

export function createInvoiceWorkflowTriggerRouter() {
  const os = implement<typeof invoiceWorkflowTriggerContract, WorkflowTriggerContext>(invoiceWorkflowTriggerContract);

  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      assertVisible("triggerInvoiceReconciliation", context);
      await context.inngest.send({
        name: "invoice.reconciliation.requested",
        data: { runId: input.runId },
      });
      return { accepted: true };
    }),

    retryInvoiceReconciliation: os.retryInvoiceReconciliation.handler(async ({ context, input }) => {
      assertVisible("retryInvoiceReconciliation", context);
      await context.inngest.send({
        name: "invoice.reconciliation.retry.requested",
        data: { runId: input.runId, reason: input.reason },
      });
      return { accepted: true };
    }),
  });
}
```

```ts
// plugins/workflows/invoice-processing-workflows/src/functions/index.ts
import type { Inngest } from "inngest";
import { createInvoiceInternalClient, type InvoicePackageContext } from "@rawr/invoice-processing";

export function createInvoiceWorkflowFunctions(
  inngest: Inngest,
  packageContext: InvoicePackageContext,
) {
  const reconcile = inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: "invoice.reconciliation.requested" },
    async ({ event, step }) => {
      await step.run("invoice/reconcile", async () => {
        const internal = createInvoiceInternalClient(packageContext);
        return internal.getStatus({ runId: event.data.runId });
      });

      await step.sendEvent("invoice/reconciliation/completed", {
        name: "invoice.reconciliation.completed",
        data: { runId: event.data.runId },
      });

      return { ok: true as const };
    },
  );

  return [reconcile] as const;
}
```

```ts
// plugins/workflows/invoice-processing-workflows/src/surface.ts
import type { Inngest } from "inngest";
import type { InvoicePackageContext } from "@rawr/invoice-processing";
import { invoiceWorkflowTriggerContract } from "./contract.triggers";
import { createInvoiceWorkflowTriggerRouter } from "./router.triggers";
import { createInvoiceWorkflowFunctions } from "./functions";

export function createInvoiceWorkflowSurface(inngest: Inngest, packageContext: InvoicePackageContext) {
  return {
    triggerContract: invoiceWorkflowTriggerContract,
    triggerRouter: createInvoiceWorkflowTriggerRouter(),
    functions: createInvoiceWorkflowFunctions(inngest, packageContext),
  } as const;
}
```

## `rawr.hq.ts` Capability Composition (Central Now)

Snippet context:
- Applies the active central composition policy already defined above (manual now, discovery deferred).

```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { Inngest } from "inngest";
import type { InvoicePackageContext } from "@rawr/invoice-processing";
import { invoiceApiSurface } from "./plugins/api/invoice-processing-api/src/surface";
import { createInvoiceWorkflowSurface } from "./plugins/workflows/invoice-processing-workflows/src/surface";

const inngest = new Inngest({ id: "rawr-hq" });

const invoicePackageContext: InvoicePackageContext = {
  deps: {
    newRunId: () => crypto.randomUUID(),
    saveRun: async () => {},
    getRun: async () => null,
  },
};

const invoiceCapability = {
  capabilityId: "invoicing",
  api: invoiceApiSurface,
  workflows: createInvoiceWorkflowSurface(inngest, invoicePackageContext),
} as const;

const capabilities = [invoiceCapability] as const;

export const rawrHqManifest = {
  capabilities,
  orpc: {
    contract: oc.router({
      invoicing: {
        api: invoiceCapability.api.contract,
        workflows: invoiceCapability.workflows.triggerContract,
      },
    }),
    router: {
      invoicing: {
        api: invoiceCapability.api.router,
        workflows: invoiceCapability.workflows.triggerRouter,
      },
    },
  },
  inngest: {
    client: inngest,
    functions: capabilities.flatMap((capability) => capability.workflows.functions),
  },
} as const;
```

## Host Mounting Semantics

```ts
// apps/server/src/rawr.ts
import type { AnyElysia } from "./plugins";
import { rawrHqManifest } from "../../rawr.hq";
import { registerOrpcRoutes } from "./orpc/register-routes";
import { registerInngestRoute } from "./inngest/register-route";

export function registerRawrRoutes<TApp extends AnyElysia>(app: TApp): TApp {
  registerOrpcRoutes(app, rawrHqManifest.orpc, {
    workflowPrefix: "/api/workflows",
  });

  registerInngestRoute(app, rawrHqManifest.inngest, {
    path: "/api/inngest",
  });

  return app;
}
```

Mounting guarantees:
1. `/api/inngest` is ingress-only and signed/guarded for Inngest runtime.
2. Trigger contracts stay capability-relative (for example `/invoicing/*`); host `workflowPrefix: "/api/workflows"` yields final `/api/workflows/<capability>/*` trigger APIs with visibility enforcement.
3. `/rpc` and `/api/orpc` remain available for core API procedures.

## Internal vs External Trigger Usage Matrix

| Trigger visibility | Typical callers | Auth policy | Notes |
| --- | --- | --- | --- |
| `internal` | trusted server operators, admin tools, orchestrator jobs | strong internal auth + role guard | default for generated workflow triggers; standard path for trusted/server/operator flows |
| `external` | public or partner API consumers | boundary auth + contract guarantees | callable only for procedures explicitly promoted external, procedure-by-procedure |

## Import Boundary Rules (Hard)

Allowed:
- `plugins/**` -> `packages/**`
- `apps/**` -> `rawr.hq.ts` + host infrastructure

Disallowed:
- `plugins/**` -> other `plugins/**` runtime code
- `packages/**` -> `plugins/**`

## Policy Matrix (Owner by Concern)

| Concern | Domain package | API plugin | Workflows plugin | Host app | Composition manifest (`rawr.hq.ts`) |
| --- | --- | --- | --- | --- | --- |
| Core domain logic | owner | uses | uses | no | no |
| Internal oRPC contract/router/client | owner (mandatory) | consumes/reuses optionally | consumes optionally | no | no |
| Boundary API contract/router/client | no | owner (default) | no | mounts boundary routes | composes capability namespace |
| Workflow trigger contract/router | no | no | owner | mounts with workflow prefix + visibility enforcement | composes capability namespace |
| Inngest function definitions | no | no | owner | serves via ingress endpoint | merges execution registration list |
| Inngest ingress route (`/api/inngest`) | no | no | no | owner | no |
| Workflow trigger path (`/api/workflows/<capability>/*`) | no | optional caller | owner of trigger semantics | owner of route prefix/auth enforcement | owner of capability route grouping |
| Capability grouping + merge | no | no | no | no | owner |
| Plugin-to-plugin runtime imports | forbidden | forbidden | forbidden | n/a | enforced by composed-surface contract |

## Explicit Contradiction Removals
This revision removes or replaces prior ambiguity:
1. Removed conflation between trigger API and Inngest ingress.
2. Removed optional/conditional language for package internal oRPC baseline; now mandatory.
3. Removed implicit suggestion that workflows are only event ingress artifacts; now they also produce trigger router by default.
4. Removed alternative `/api/events/*` trigger naming; canonical trigger API naming is `/api/workflows/*`.
5. Removed unclear reuse defaults for API boundary; now boundary-owned default with explicit simple-reuse exception.
6. Removed stale absolute workflow trigger route examples inside workflow contracts; contract paths are capability-relative and resolved by host `workflowPrefix`.
7. Removed duplicate Path A use/non-use policy statements from the example section; canonical criteria are now declared only in the API policy section.
8. Replaced ambiguous API plugin example/tree artifact (`client.http.ts`) with composition-facing `surface.ts` artifacts aligned to manifest merge responsibilities.
9. Replaced opaque matrix layer naming with explicit composition-manifest ownership semantics (`Composition manifest (rawr.hq.ts)`).

## Acceptance Checks
1. Domain package examples (n=1 structure, n>1 structure, and code sample) consistently show pure services + one internal router + one in-process client.
2. API examples show boundary-owned default and simple reuse exception path.
3. Workflow examples separate `/api/workflows/*` from `/api/inngest`.
4. Trigger visibility metadata exists with default internal behavior.
5. Capability composition merges API routers + workflow trigger routers + Inngest functions in `rawr.hq.ts`, and host mounting consumes that composed surface without extra indirection.
6. n>1 structure preserves one-router-and-one-client-per-domain-package and one-router-per-API-plugin invariants.
7. No cross-plugin runtime import pattern is introduced; cross-workflow calls flow through composed surfaces only.
8. Discovery is explicitly deferred as cutover-only with cutover trigger and non-goal statement.
9. No duplicate or conflicting policy statements remain between policy sections, examples, and owner matrix.

## Assumptions for This Phase
1. Documentation convergence is the immediate deliverable; codebase implementation follows.
2. `rawr.hq.ts` remains manual and explicit for this phase.
3. If a capability needs different exposure semantics, promotion/demotion happens at procedure visibility policy, not by bypassing boundaries.
4. Plugin-local discovery manifests are deferred and not part of current cut.
