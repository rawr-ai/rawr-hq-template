# Axis 08: Workflows vs APIs Boundaries

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for workflow trigger boundaries versus durable runtime ingress.
- **What it covers:** workflow trigger authoring posture, contract/schema ownership boundaries, caller-mode route semantics, and host/runtime seam guarantees.
- **What this communicates:** caller-facing workflow APIs stay on boundary routes, while `/api/inngest` remains runtime ingress only.
- **Who should read this:** workflow plugin authors, host/runtime owners, and reviewers evaluating workflow boundary proposals.
- **Jump conditions:** for host mount and control-plane ordering, jump to [07-host-composition.md](./07-host-composition.md); for additive durable endpoint constraints, jump to [09-durable-endpoints.md](./09-durable-endpoints.md); for anti-dual-path posture, jump to [03-split-vs-collapse.md](./03-split-vs-collapse.md).


## In Scope
- Caller-triggered workflow API authoring posture.
- Workflow trigger router and durable function role split.
- Canonical workflow plugin shape.

## Out of Scope
- Durable endpoint additive-only ingress policy details (see [09-durable-endpoints.md](./09-durable-endpoints.md)).
- Host mount implementation specifics (see [07-host-composition.md](./07-host-composition.md)).

## Canonical Policy

### Trigger-vs-Runtime Boundary Invariants
1. Workflow trigger APIs MUST remain caller-trigger surfaces distinct from Inngest execution ingress.
2. API-exposed workflow triggers MUST be authored as oRPC procedures that dispatch into Inngest durable execution.
3. Durable execution functions MUST remain Inngest function definitions.
4. Split path enforcement MUST be explicit at host mounts: caller-facing workflow trigger/status routes live on capability-first `/api/workflows/<capability>/*` paths (mounted under `/api/workflows/*`), while `/api/inngest` is runtime ingress only.
5. `/rpc` is first-party/internal transport only; first-party callers (including MFEs by default) use `RPCLink` unless an explicit exception is documented.
6. Workflow OpenAPI surfaces (`/api/workflows/<capability>/*`) are externally published boundaries and MAY be used by first-party callers only via explicit exception.
7. Browser and generic API callers MUST NOT invoke `/api/inngest` directly.
8. No dedicated `/rpc/workflows` mount is required by default; workflow RPC procedures compose under existing `/rpc`.

### Contract and Schema Ownership Rules
1. Workflow trigger procedure input/output schemas MUST be declared in boundary contract modules (`contract.ts`) or procedure-local modules adjacent to handlers.
2. Workflow/API boundary contracts are plugin-owned (`plugins/workflows/*/contract.ts`, `plugins/api/*/contract.ts`); packages provide shared domain schemas/domain logic but are not canonical boundary contract owners, and workflow trigger/status I/O schemas stay at the workflow plugin boundary.
3. Domain modules (`domain/*`) MAY be used for transport-independent domain concepts only; they MUST NOT own procedure input/output schema semantics.
4. Shared workflow trigger context contracts and request metadata types (principal/request/correlation/network metadata) SHOULD live in explicit `context.ts` modules (or equivalent context modules), consumed by routers.
5. Docs/examples for workflow trigger procedures MUST default to inline I/O schemas at `.input(...)` and `.output(...)`.
6. I/O schema extraction SHOULD be used only for shared schemas or large readability cases.
7. When extracted, workflow trigger I/O schemas SHOULD use paired-object shape with `.input` and `.output` (for example `TriggerInvoiceReconciliationSchema.input` / `.output`).
8. For object-root schema wrappers in docs, prefer `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
9. For non-`Type.Object` roots, keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.

### Composition and Infrastructure Seam Guarantees
1. Workflow composition/mounting docs MUST stay explicit; do not collapse route ownership into black-box host helpers.
2. Workflow boundary routers MUST consume host-injected infrastructure ports through explicit `context.ts` contracts; plugin modules MUST NOT bootstrap concrete auth/db/runtime adapters.
3. Workflow trigger operations MAY depend on auth/db-ready interfaces exposed in context ports, but concrete adapter selection remains host composition owned.
4. Durable functions SHOULD consume shared package/internal-client abstractions wired from host-injected ports; this reuse does not transfer boundary contract ownership from plugins to packages.
5. D-014 seam guarantees are specified in [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md).
6. When workflow/API boundaries need harness/core infrastructure abstractions, package-oriented shared surfaces are the default; exact package granularity remains implementation-flexible as long as ownership/import invariants hold.

## Consumer model
1. **First-party callers** (including MFEs by default) use `RPCLink` on `/rpc` for workflow-trigger and workflow-status calls under the composed internal contract tree.
2. **External/third-party callers** use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; they do not receive RPC clients.
3. **Internal packages/services** re-use capability logic through in-process clients (`packages/<capability>/src/client.ts`) with trusted service context, keeping domain semantics centralized and bypassing HTTP when appropriate.
4. **Runtime ingress** is `/api/inngest` only, reserved for signed Inngest callback traffic and excluded from browser/API caller usage.
5. **Coordination tooling** (the `hqContract` + coordination operations in `apps/server/src/orpc.ts`) remains an internal administrative contract surface.
This model keeps `/api/workflows/<capability>/*` caller-facing as a published boundary, `/rpc` internal-only for first-party callers, and `/api/inngest` runtime-only.

## Caller/Auth Matrix
This table is an axis-local projection of the canonical caller/auth matrix in [ARCHITECTURE.md](../ARCHITECTURE.md).

| Caller mode | Allowed routes | Default link | Publication boundary | Auth mode | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party MFE/internal caller | `/rpc` | `RPCLink` | internal only | first-party boundary session or trusted service context | `/api/inngest` |
| External/third-party caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | externally published | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | `/api/inngest` | Inngest callback transport | runtime only | signed ingress verification + gateway allow-listing | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## Runtime Ingress Enforcement Requirements
1. `/api/inngest` requests MUST pass signature verification before dispatching to function handlers.
2. Gateway/proxy policy MUST deny browser/API-originated traffic to `/api/inngest`.
3. `/api/inngest` handlers MUST avoid exposing caller-facing error payloads that imply this path is a public API.
4. All caller-facing workflow trigger/status semantics MUST remain on `/api/workflows/<capability>/*` and/or internal `/rpc` procedures.

## Why
- Preserves one trigger story for callers and one durability story for runtime.
- Keeps auth/visibility policy explicit on trigger routes.
- Prevents bypass of caller-facing boundary policy by separating runtime ingress from trigger/status APIs.

## Trade-Offs
- Trigger authoring remains explicit instead of inferred.
- This is beneficial for policy clarity and operational visibility.

## Boundary/Runtime Infrastructure Seam Guarantees (D-014)
Status note: this section maps workflow/API boundary seams to D-014 candidate language and does not alter D-005..D-012 meaning.

| Seam | Owner | Guarantee |
| --- | --- | --- |
| Boundary context seam | host context factories + workflow plugin `context.ts` | Boundary handlers receive principal/request/correlation/network metadata and infrastructure ports through explicit typed context. |
| Trigger operation seam | workflow plugin operations | Trigger operations consume injected ports and package internal clients; they do not construct concrete adapters. |
| Durable runtime seam | host runtime composition + Inngest function wiring | Durable functions execute with runtime-owned bundle and reuse package logic through injected clients/ports. |
| Shared infrastructure seam | shared packages (`packages/*`) | Auth/db-ready interfaces and helper contracts remain transport-neutral and reusable across API/workflow surfaces. |

## What Changes vs Unchanged
- **Changes:** Workflow/API boundary language now explicitly defines infrastructure seam ownership (host injects ports, plugins consume ports, durable functions reuse injected abstractions), mapped as D-014 text.
- **Unchanged:** D-005 route split semantics, D-006 plugin boundary ownership, D-007 caller transport/publication boundaries, D-011 context/schema ownership, and D-012 inline-I/O defaults remain intact.

## Canonical Workflow Plugin Shape
```text
plugins/workflows/<domain>/src/contract.ts
  operations/*
  router.ts
  functions/*
  index.ts
  durable/*   # optional additive adapters only
```

## Naming Defaults (Workflow Surface)
1. Prefer concise, unambiguous workflow plugin directory names (for example `plugins/workflows/invoicing`).
2. Keep role-oriented filenames (`contract.ts`, `router.ts`, `operations/*`, `functions/*`) and avoid context-baked suffixes.
3. If a workflow package owns `domain/*`, avoid redundant domain-prefix filenames inside that folder.
4. Keep procedure I/O schema ownership in `contract.ts` (boundary) or procedure-local modules, not in `domain/*`.
5. Keep request/correlation/principal/network metadata contracts in `context.ts`, not `domain/*`.
6. In docs, prefer `schema({...})` for object-root wrappers (`schema({...})` => `std(Type.Object({...}))`).
7. Keep `std(...)` (or `typeBoxStandardSchema(...)`) explicit for non-`Type.Object` roots.
8. If snippet I/O is extracted instead of inline, prefer paired-object naming (`<ProcedureName>Schema.input` / `.output`) over separate `*InputSchema` and `*OutputSchema` constants.

## Canonical Snippets

### Trigger contract (default inline form)
```ts
export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(schema({ runId: Type.String() }))
    .output(schema({ accepted: Type.Literal(true) })),
});
```

### Trigger contract (extracted exception form for shared/large readability)
```ts
import { oc } from "@orpc/contract";
import { Type, type Static } from "typebox";
import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";

// Exception: extracted because input/output shapes are reused by contract wiring
// and operation-level static types.
const TriggerInvoiceReconciliationSchema = {
  input: Type.Object({
    runId: Type.String(),
  }),
  output: Type.Object({
    accepted: Type.Literal(true),
  }),
} as const;

export type TriggerInvoiceReconciliationInput = Static<
  (typeof TriggerInvoiceReconciliationSchema)["input"]
>;

export type TriggerInvoiceReconciliationOutput = Static<
  (typeof TriggerInvoiceReconciliationSchema)["output"]
>;

export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(std(TriggerInvoiceReconciliationSchema.input))
    .output(std(TriggerInvoiceReconciliationSchema.output)),
});
```

### Trigger operation (explicit boundary operation)
```ts
import type {
  TriggerInvoiceReconciliationInput,
  TriggerInvoiceReconciliationOutput,
} from "./contract";

export async function triggerReconciliationOperation(
  inngest: Inngest,
  input: TriggerInvoiceReconciliationInput,
): Promise<TriggerInvoiceReconciliationOutput> {
  await inngest.send({
    name: "invoice.reconciliation.requested",
    data: { runId: input.runId },
  });
  return { accepted: true as const };
}
```

### Trigger router
```ts
// plugins/workflows/invoicing/src/context.ts
import type { Inngest } from "inngest";

export type WorkflowRequestMetadata = {
  requestId: string;
  correlationId: string;
  principalId: string;
  tenantId: string;
  sourceIp?: string;
};

export type InvoiceWorkflowTriggerContext = {
  inngest: Inngest;
  canCallInternal: boolean;
  request: WorkflowRequestMetadata;
};
```

```ts
// plugins/workflows/invoicing/src/router.ts
import { implement } from "@orpc/server";
import { invoiceWorkflowTriggerContract } from "./contract";
import type { InvoiceWorkflowTriggerContext } from "./context";

const os = implement<typeof invoiceWorkflowTriggerContract, InvoiceWorkflowTriggerContext>(invoiceWorkflowTriggerContract);

export function createInvoiceWorkflowTriggerRouter() {
  return os.router({
    triggerInvoiceReconciliation: os.triggerInvoiceReconciliation.handler(async ({ context, input }) => {
      if (!context.canCallInternal) throw new Error("Procedure is internal");
      return triggerReconciliationOperation(context.inngest, input);
    }),
  });
}
```

### Durable function
```ts
export function createReconciliationFunction(inngest: Inngest) {
  return inngest.createFunction(
    { id: "invoice.reconciliation", retries: 2 },
    { event: "invoice.reconciliation.requested" },
    async ({ event, step }) => {
      await step.run("invoice/reconcile", async () => ({ runId: event.data.runId, ok: true }));
      return { ok: true as const };
    },
  );
}
```

### Host split-path enforcement
```ts
app.all("/api/workflows/*", async ({ request }) => {
  const result = await workflowHandler.handle(request, {
    prefix: "/api/workflows",
    context: boundaryContext,
  });
  return result.matched ? result.response : new Response("not found", { status: 404 });
}, { parse: "none" });

app.all("/api/inngest", async ({ request }) => inngestHandler(request));
```

### First-party MFE default vs external workflow client transport
```ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

// First-party default (internal transport)
const internalWorkflowClient = createORPCClient(capabilityClients.invoicing.workflows, {
  link: new RPCLink({ url: `${baseUrl}/rpc` }),
});

// External publication surface (or documented first-party exception)
const publishedWorkflowClient = createORPCClient(externalContracts.invoicing.workflows, {
  link: new OpenAPILink({ url: `${baseUrl}/api/workflows` }),
});
```

### Path strategy: capability-first vs surface-first
- **Surface-first (rejected):** One generic `/api/workflows/*` path requires payload-based routing, complicates API discovery, and still forces host logic to route to per-capability routers. This offers no tangible DX benefit for plugin authors.
- **Capability-first (chosen):** Namespace workflows per capability (e.g., `/api/workflows/search/enrich`), aligning paths with `plugins/api/<capability>` and `plugins/workflows/<capability>`. The manifest (`rawrHqManifest.workflows.triggerRouter`) can enumerate these namespaces so regenerating docs/SDKs is mechanical.
Recommendation: keep capability prefixes explicit, emit them via the manifest helper, and hook them into the host’s `OpenAPIHandler`.

### Internal calling + workflow triggering model
- **Internal clients** use `withInternalClient(context, args, run)` to reach `packages/<capability>/src/client.ts` (service logic + validation), which prevents HTTP round-trips for server-only work.
- **Workflow triggers** call `queueCoordinationRunWithInngest(...)` (in `apps/server/src/orpc.ts`), which persists run/timeline state (`CoordinationRuntimeAdapter`), sets trace links (`createDeskEvent`), and sends the Inngest event.
- **Manifest-driven registration** ensures `rawrHqManifest.workflows.triggerRouter` maps each capability to the right handler and `rawrHqManifest.inngest` supplies the durable functions; the workflow boundary context helpers (`apps/server/src/workflows/context.ts`) keep principal/correlation metadata separate from `RawrOrpcContext`.


### Manifest-driven composition note
Hosts build the workflow handler from `rawrHqManifest.workflows.triggerRouter`, so capability-first `/api/workflows/<capability>/*` mounts, the `OpenAPIHandler`, and the Inngest function bundle stay in sync even when new capabilities land. Regenerate `rawr.hq.ts` through the packet’s manifest composition flow (see `ARCHITECTURE.md` and `07-host-composition.md`) instead of editing `apps/*` directly.


### Workflow surface export
```ts
export function createInvoiceWorkflowSurface(inngest: Inngest) {
  return {
    triggerContract: invoiceWorkflowTriggerContract,
    triggerRouter: createInvoiceWorkflowTriggerRouter(),
    functions: [createReconciliationFunction(inngest)] as const,
  } as const;
}
```

## Example B End-to-End Interaction
Caller intent: trigger durable workflow run.

1. Caller invokes oRPC trigger procedure.
2. Trigger router delegates to trigger operation.
3. Trigger operation emits event via `inngest.send`.
4. Inngest function receives event and executes durable step workflow.
5. Caller checks run status through caller-facing workflow status route, not `/api/inngest`.

## References
- Packet entrypoint: `../ARCHITECTURE.md`
- Packet decisions: `../DECISIONS.md:11`
- Host composition policy: `./07-host-composition.md`
- E2E: [e2e-04-context-middleware.md](../examples/e2e-04-context-middleware.md)
- oRPC: [Procedure](https://orpc.dev/docs/procedure)
- oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract)
- oRPC: [Context](https://orpc.dev/docs/context)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Events](https://www.inngest.com/docs/events)
- Inngest: [Next.js quick start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)

## Cross-Axis Links
- Split posture and anti-dual-path: [03-split-vs-collapse.md](./03-split-vs-collapse.md)
- Durable endpoint additive-only limits: [09-durable-endpoints.md](./09-durable-endpoints.md)
- Host mount boundaries: [07-host-composition.md](./07-host-composition.md)
- Context envelope boundaries: [04-context-propagation.md](./04-context-propagation.md)
- Core infrastructure packaging + composition guarantees: [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md)
- Micro-frontend integration baseline: [e2e-03-microfrontend-integration.md](../examples/e2e-03-microfrontend-integration.md)
