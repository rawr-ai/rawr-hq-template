# Axis 05: Errors, Logging, and Observability

## In Scope
- API boundary error contract semantics.
- Durable execution lifecycle status/timeline recording.
- Trigger-to-run trace and status correlation policy.

## Out of Scope
- Context envelope construction details (see [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)).
- Middleware placement details (see [AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md](./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md)).

## Canonical Policy
1. API boundary errors MUST use oRPC typed error semantics (`ORPCError` with status/code).
2. Durable execution state MUST be recorded as run/timeline lifecycle events in runtime adapter.
3. Trigger-to-run correlation SHOULD be attached to trace links and persisted status.
4. Host bootstrap MUST initialize `extendedTracesMiddleware()` before Inngest client/function composition so trigger and durable paths share the baseline trace envelope.
5. Inngest `finished` hook usage SHOULD stay idempotent/non-critical; this remains operational guidance and is not expanded into stricter packet policy in this axis.

## Why
- Request/response error consumers and asynchronous run lifecycle operators are different audiences.
- One error shape cannot safely represent both semantics.

## Trade-Offs
- Two reporting shapes exist:
  - boundary API error shape,
  - run/timeline state shape.
- This is intended and operationally correct.

## D-008 Integration Scope
- **Changes:** Baseline trace initialization order is now explicit at host bootstrap and applies to both `/api/workflows/*` and `/api/inngest` execution paths.
- **Unchanged:** Typed boundary error semantics and runtime timeline/status recording remain the same; route ownership/publication boundaries from D-005/D-006/D-007 are unchanged.

## Canonical Snippets

### API boundary typed errors
```ts
// apps/server/src/orpc.ts
try {
  return await queueCoordinationRunWithInngest({
    client: context.inngestClient,
    runtime: context.runtime,
    workflow,
    runId,
    input: input.input ?? {},
    baseUrl: context.baseUrl,
  });
} catch (err) {
  throw new ORPCError("RUN_QUEUE_FAILED", {
    status: 500,
    message: err instanceof Error ? err.message : String(err),
  });
}
```

### Durable timeline + status recording
```ts
// packages/coordination-inngest/src/adapter.ts
await options.runtime.saveRunStatus(queuedRun);
await options.runtime.appendTimeline(
  options.runId,
  createDeskEvent({
    runId: options.runId,
    workflowId: options.workflow.workflowId,
    type: "run.started",
    status: "queued",
    detail: "Coordination run queued for Inngest execution",
    payload: options.input ?? {},
  }),
);
```

```ts
await step.run("coordination/run-start", async () => {
  await input.runtime.appendTimeline(
    event.data.runId,
    createDeskEvent({
      runId: event.data.runId,
      workflowId: event.data.workflow.workflowId,
      type: "run.started",
      status: "running",
      detail: `Inngest execution started (${runId})`,
    }),
  );
});
```

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:80`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:200`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:149`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:298`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:333`

## Cross-Axis Links
- Context propagation contract: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Trigger and durable boundary split: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Durable function posture: [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
