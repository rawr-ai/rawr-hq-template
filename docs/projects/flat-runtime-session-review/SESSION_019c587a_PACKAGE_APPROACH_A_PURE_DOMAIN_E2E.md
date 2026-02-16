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
│           └── rawr.ts
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
│           │   ├── internal.contract.ts
│           │   └── internal.handlers.ts
│           ├── clients/
│           │   └── internal-client.ts
│           └── index.ts
└── plugins/
    ├── api/
    │   └── invoice-processing-api/
    │       └── src/
    │           ├── contract.boundary.ts
    │           └── index.ts
    └── workflows/
        └── invoice-processing-workflows/
            └── src/
                ├── contract.event.ts
                └── index.ts
```

## Ownership: Contracts, Implementation, Clients

| Concern | Owns It | Path | Notes |
| --- | --- | --- | --- |
| Domain schemas/types | Package domain | `packages/invoice-processing/src/domain/types.ts` | Domain entities/status/aggregates only. |
| Domain logic | Package domain | `packages/invoice-processing/src/domain/service.ts` | No HTTP, no event bus, no `step.run`, no runtime lifecycle. |
| Internal core contract | Package | `packages/invoice-processing/src/contracts/internal.contract.ts` | Embedded IO shapes; stable core contract. |
| Internal contract handlers | Package | `packages/invoice-processing/src/contracts/internal.handlers.ts` | Maps internal contract to domain logic. |
| Boundary API contract | API plugin | `plugins/api/invoice-processing-api/src/contract.boundary.ts` | Embedded boundary IO shapes and boundary semantics. |
| Boundary workflow/event contract | Workflow plugin | `plugins/workflows/invoice-processing-workflows/src/contract.event.ts` | Event payload semantics for runtime orchestration. |
| Runtime orchestration glue | Boundary plugins | `plugins/api/*`, `plugins/workflows/*` | Policy/auth/step orchestration belongs here. |
| Clients | Package | `packages/invoice-processing/src/clients/internal-client.ts` | Typed client for internal consumers/tests. |
| Composition authority | Root manifest | `rawr.hq.ts` | Single assembly authority. |
| Mounting paths | App host | `apps/server/src/rawr.ts` | Mount manifest outputs for `/rpc`, `/api/orpc`, `/api/inngest`. |

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

### Internal contract (IO shapes embedded in contract)
```ts
// packages/invoice-processing/src/contracts/internal.contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { InvoiceStatusSchema } from "../domain/types";

export const invoiceInternalContract = oc.router({
  start: oc
    .input(
      Type.Object({
        invoiceId: Type.String({ minLength: 1 }),
        requestedBy: Type.String({ minLength: 1 }),
      }),
    )
    .output(
      Type.Object({
        runId: Type.String({ minLength: 1 }),
        status: InvoiceStatusSchema,
      }),
    ),

  getStatus: oc
    .input(Type.Object({ runId: Type.String({ minLength: 1 }) }))
    .output(
      Type.Object({
        runId: Type.String({ minLength: 1 }),
        status: InvoiceStatusSchema,
      }),
    ),
});
```

## API Integration Variant A1

### A1 Definition
API plugin mounts/re-exports package internal contract and its implementation mapping with minimal boundary additions.

### A1 Plugin Example
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { implement } from "@orpc/server";
import {
  invoiceInternalContract,
  createInvoiceInternalHandlers,
  type InvoiceDeps,
} from "@rawr/invoice-processing";

export type ApiContext = { deps: InvoiceDeps; requestId: string };

export function registerInvoiceProcessingApiPluginA1() {
  const os = implement<typeof invoiceInternalContract, ApiContext>(invoiceInternalContract);

  return {
    namespace: "invoiceProcessing" as const,
    contract: invoiceInternalContract,
    router: os.router(createInvoiceInternalHandlers(os)),
  };
}
```

### A1 Evaluation
- Simpler: fastest path, minimal duplication.
- Tradeoff: exposes internal contract semantics more directly; acceptable for internal-first surfaces.

## API Integration Variant A2

### A2 Definition
API plugin defines or extends boundary-specific contract semantics, then maps boundary handlers into domain logic/internal contract.

### A2 Boundary Contract Example
```ts
// plugins/api/invoice-processing-api/src/contract.boundary.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";

export const invoiceBoundaryContract = oc.router({
  startInvoice: oc
    .route({ method: "POST", path: "/invoice-processing/runs" })
    .input(
      Type.Object({
        invoiceId: Type.String({ minLength: 1 }),
        requestedBy: Type.String({ minLength: 1 }),
        traceToken: Type.Optional(Type.String()),
      }),
    )
    .output(Type.Object({ runId: Type.String({ minLength: 1 }), accepted: Type.Boolean() })),

  forceReconcile: oc
    .route({ method: "POST", path: "/invoice-processing/runs/{runId}/force-reconcile" })
    .input(Type.Object({ runId: Type.String({ minLength: 1 }) }))
    .output(Type.Object({ accepted: Type.Boolean() })),
});
```

### A2 Plugin Mapping Example
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { implement } from "@orpc/server";
import { invoiceBoundaryContract } from "./contract.boundary";
import { createInvoiceService } from "@rawr/invoice-processing";

export function registerInvoiceProcessingApiPluginA2(deps: { domain: ReturnType<typeof createInvoiceService> }) {
  const os = implement(invoiceBoundaryContract);

  return {
    namespace: "invoiceProcessing" as const,
    contract: invoiceBoundaryContract,
    router: os.router({
      startInvoice: os.startInvoice.handler(async ({ input }) => {
        const result = await deps.domain.start({ invoiceId: input.invoiceId, requestedBy: input.requestedBy });
        return { runId: result.runId, accepted: true };
      }),
      forceReconcile: os.forceReconcile.handler(async ({ input }) => {
        await deps.domain.forceReconcile(input.runId);
        return { accepted: true };
      }),
    }),
  };
}
```

### A2 Evaluation
- Simpler for boundary evolution: public contract can diverge safely.
- Harder: explicit translation layer and more adapter tests.
- Recommended when public/admin boundary semantics differ from internal contract.

## Workflow Integration Without Domain Runtime Leakage

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

### Workflow runtime adapter
```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
import { Value } from "typebox/value";
import { InvoiceRequestedEventShape } from "./contract.event";
import { createInvoiceService } from "@rawr/invoice-processing";

export function registerInvoiceProcessingWorkflowPlugin(client: any, deps: any) {
  const domain = createInvoiceService(deps);

  const fn = client.createFunction(
    { id: "invoice-processing.reconcile", retries: 2 },
    { event: "invoice.processing.requested" },
    async ({ event, step }: any) => {
      if (!Value.Check(InvoiceRequestedEventShape, event.data)) {
        throw new Error("invalid event payload");
      }

      await step.run("mark-running", async () => domain.markRunning(event.data.runId));
      await step.run("perform-work", async () => domain.reconcile(event.data.runId));
      await step.run("mark-complete", async () => domain.markCompleted(event.data.runId));
    },
  );

  return { functions: [fn] as const };
}
```

Evaluation:
- Domain remains stable core.
- Durable orchestration stays in runtime adapter where retry/time semantics belong.

## Composition in `rawr.hq.ts` and Host Mounting Path

### Composition authority
```ts
// rawr.hq.ts
import { oc } from "@orpc/contract";
import { Inngest } from "inngest";
import { createInvoiceDeps } from "@rawr/invoice-processing";
import { registerInvoiceProcessingApiPluginA1 } from "./plugins/api/invoice-processing-api/src";
import { registerInvoiceProcessingWorkflowPlugin } from "./plugins/workflows/invoice-processing-workflows/src";

const deps = createInvoiceDeps();
const inngestClient = new Inngest({ id: "rawr-hq" });

const invoiceApi = registerInvoiceProcessingApiPluginA1();
const invoiceWorkflows = registerInvoiceProcessingWorkflowPlugin(inngestClient, deps);

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({ invoiceProcessing: invoiceApi.contract }),
    router: { invoiceProcessing: invoiceApi.router },
    context: { deps },
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

### Host mounting path
```ts
// apps/server/src/rawr.ts
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { serve as inngestServe } from "inngest/bun";
import { rawrHqManifest } from "../../rawr.hq";

export function registerRawrRoutes(app: any) {
  const os = implement<typeof rawrHqManifest.orpc.contract, typeof rawrHqManifest.orpc.context>(
    rawrHqManifest.orpc.contract,
  );
  const router = os.router(rawrHqManifest.orpc.router);

  const rpc = new RPCHandler(router);
  const openapi = new OpenAPIHandler(router);

  app.all("/rpc/*", async ({ request }: any) => (await rpc.handle(request, {
    prefix: "/rpc",
    context: rawrHqManifest.orpc.context,
  })).response);

  app.all("/api/orpc/*", async ({ request }: any) => (await openapi.handle(request, {
    prefix: "/api/orpc",
    context: rawrHqManifest.orpc.context,
  })).response);

  const inngestHandler = inngestServe({
    client: rawrHqManifest.inngest.client,
    functions: rawrHqManifest.inngest.functions,
  });
  app.all("/api/inngest", async ({ request }: any) => inngestHandler(request));
}
```

## What Gets Simpler / What Gets Harder

| Area | Gets Simpler | Gets Harder | Mitigation |
| --- | --- | --- | --- |
| Domain model quality | Domain schema files stay semantically meaningful. | Boundary IO shape duplication across contracts. | Allow extraction only when reuse is proven across boundaries. |
| Contract readability | IO shapes are visible at contract definitions. | Larger contract files. | Split contract modules by bounded context, not by schema type. |
| Runtime separation | Boundary semantics and orchestration are isolated in plugins. | Adapter translation code increases. | Add adapter integration tests and explicit mapping helpers. |
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
- A1 default, A2 explicit exception for boundary divergence.

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
