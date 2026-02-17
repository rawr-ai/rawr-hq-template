# Axis 08: Workflows vs APIs Boundaries

## In Scope
- Caller-triggered workflow API authoring posture.
- Workflow trigger router and durable function role split.
- Canonical workflow plugin shape.

## Out of Scope
- Durable endpoint additive-only ingress policy details (see [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)).
- Host mount implementation specifics (see [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)).

## Canonical Policy
1. Workflow trigger APIs MUST remain caller-trigger surfaces distinct from Inngest execution ingress.
2. API-exposed workflow triggers MUST be authored as oRPC procedures that dispatch into Inngest durable execution.
3. Durable execution functions MUST remain Inngest function definitions.
4. Split path enforcement MUST be explicit at host mounts: caller-facing workflow trigger/status routes live on `/api/workflows/*` (or equivalent caller-facing oRPC workflow surface), while `/api/inngest` is runtime ingress only.
5. Workflow trigger procedure input/output schemas MUST be declared in boundary contract modules (`contract.ts`) or procedure-local modules adjacent to handlers.
6. Domain modules (`domain/*`) MAY be used for transport-independent domain concepts only; they MUST NOT own procedure input/output schema semantics.
7. Shared workflow trigger context contracts and request metadata types (principal/request/correlation/network metadata) SHOULD live in explicit `context.ts` modules (or equivalent context modules), consumed by routers.
8. Browser and generic API callers MUST NOT invoke `/api/inngest` directly.
9. Docs/examples for workflow trigger procedures MUST default to inline I/O schemas at `.input(...)` and `.output(...)`.
10. I/O schema extraction SHOULD be used only for shared schemas or large readability cases.
11. When extracted, workflow trigger I/O schemas SHOULD use paired-object shape with `.input` and `.output` (for example `TriggerInvoiceReconciliationSchema.input` / `.output`).
12. For object-root schema wrappers in docs, prefer `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
13. For non-`Type.Object` roots, keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.

## Consumer model
1. **External callers** (third-party APIs, micro-frontends) hit `/rpc*`, `/api/orpc*`, and the capability-specific `/api/workflows/<capability>/*` trigger/status paths. These surfaces remain public and audited by `apps/server/src/orpc.ts`.
2. **Internal packages** re-use capability logic through in-process clients (`packages/<capability>/src/client.ts`), keeping domain semantics centralized and bypassing HTTP when appropriate.
3. **Coordination tooling** (the `hqContract` + coordination operations in `apps/server/src/orpc.ts`) powers dashboards, run discovery, and orchestration controls; these consumers speak the administrative contract, not workflow triggers.
Closing the loop on D-005 requires recognizing all three groups so we keep `/api/workflows` caller-facing, `/api/inngest` runtime-only, and tooling on the coordination canvas.

## Why
- Preserves one trigger story for callers and one durability story for runtime.
- Keeps auth/visibility policy explicit on trigger routes.
- Prevents bypass of caller-facing boundary policy by separating runtime ingress from trigger/status APIs.

## Trade-Offs
- Trigger authoring remains explicit instead of inferred.
- This is beneficial for policy clarity and operational visibility.

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

### Path strategy: capability-first vs surface-first
- **Surface-first (rejected):** One generic `/api/workflows/*` path requires payload-based routing, complicates API discovery, and still forces host logic to route to per-capability routers. This offers no tangible DX benefit for plugin authors.
- **Capability-first (chosen):** Namespace workflows per capability (e.g., `/api/workflows/search/enrich`), aligning paths with `plugins/api/<capability>` and `plugins/workflows/<capability>`. The manifest (`rawrHqManifest.workflows.triggerRouter`) can enumerate these namespaces so regenerating docs/SDKs is mechanical.
Recommendation: keep capability prefixes explicit, emit them via the manifest helper, and hook them into the host’s `OpenAPIHandler`.

### Internal calling + workflow triggering model
- **Internal clients** use `withInternalClient(context, args, run)` to reach `packages/<capability>/src/client.ts` (service logic + validation), which prevents HTTP round-trips for server-only work.
- **Workflow triggers** call `queueCoordinationRunWithInngest(...)` (in `apps/server/src/orpc.ts`), which persists run/timeline state (`CoordinationRuntimeAdapter`), sets trace links (`createDeskEvent`), and sends the Inngest event.
- **Manifest-driven registration** ensures `rawrHqManifest.workflows.triggerRouter` maps each capability to the right handler and `rawrHqManifest.inngest` supplies the durable functions; the workflow boundary context helpers (`apps/server/src/workflows/context.ts`) keep principal/correlation metadata separate from `RawrOrpcContext`.


### Manifest-driven composition note
Hosts build the workflow handler from `rawrHqManifest.workflows.triggerRouter`, so capability-first `/api/workflows/<capability>` mounts, the `OpenAPIHandler`, and the Inngest function bundle stay in sync even when new capabilities land. Regenerate `rawr.hq.ts` via the manifest generator described in `SESSION_019c587a_D005_HOSTING_COMPOSITION_COHESIVE_RECOMMENDATION.md` instead of editing `apps/*`.


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
- Agent I: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md:6`
- Integrated synthesis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md:61`
- Canonical baseline: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`
- E2E: [E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md](./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md)
- oRPC: [Procedure](https://orpc.dev/docs/procedure)
- oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract)
- oRPC: [Context](https://orpc.dev/docs/context)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Events](https://www.inngest.com/docs/events)
- Inngest: [Next.js quick start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)

## Cross-Axis Links
- Split posture and anti-dual-path: [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Durable endpoint additive-only limits: [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
- Host mount boundaries: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
- Context envelope boundaries: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
