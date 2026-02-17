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
4. `/api/inngest` is runtime ingress only; caller-trigger workflow routes are separate oRPC surfaces.

## Why
- Preserves one trigger story for callers and one durability story for runtime.
- Keeps auth/visibility policy explicit on trigger routes.

## Trade-Offs
- Trigger authoring remains explicit instead of inferred.
- This is beneficial for policy clarity and operational visibility.

## Canonical Workflow Plugin Shape
```text
plugins/workflows/<capability>-workflows/src/
  contract.ts
  operations/*
  router.ts
  functions/*
  index.ts
  durable/*   # optional additive adapters only
```

## Canonical Snippets

### Trigger contract
```ts
export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String() })))
    .output(typeBoxStandardSchema(Type.Object({ accepted: Type.Literal(true) }))),
});
```

### Trigger operation (explicit boundary operation)
```ts
export async function triggerReconciliationOperation(inngest: Inngest, input: { runId: string }) {
  await inngest.send({
    name: "invoice.reconciliation.requested",
    data: { runId: input.runId },
  });
  return { accepted: true as const };
}
```

### Trigger router
```ts
type InvoiceWorkflowTriggerContext = { inngest: Inngest; canCallInternal: boolean };
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

## References
- Agent I: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md:6`
- Integrated synthesis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md:61`
- Canonical baseline: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`

## Cross-Axis Links
- Split posture and anti-dual-path: [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Durable endpoint additive-only limits: [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
- Host mount boundaries: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
