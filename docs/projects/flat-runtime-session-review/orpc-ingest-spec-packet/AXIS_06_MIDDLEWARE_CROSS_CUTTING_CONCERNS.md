# Axis 06: Middleware and Cross-Cutting Concerns

## In Scope
- Placement rules for boundary middleware vs durable runtime controls.
- Reuse policy for shared logic without collapsing harness-specific application points.

## Out of Scope
- Full context semantics (see [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)).
- Full error/timeline semantics (see [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)).

## Canonical Policy
1. Boundary/API middleware (auth, shape validation, visibility, rate policy) MUST live in oRPC/Elysia boundary layer.
2. Durable runtime controls (retry, idempotency behavior, step boundaries, concurrency policy) MUST live in Inngest function configuration/implementation.
3. Shared policy logic MAY be reused, but application points MUST remain harness-specific.

## Why
- API boundary policy and durable execution policy are separate control planes.
- Collapsing them creates surprising behavior and weakens debuggability.

## Trade-Offs
- Middleware is not one literal stack.
- This is intentional to preserve semantic correctness.

## Canonical Snippets

### Boundary mount with parse-safe forwarding
```ts
// apps/server/src/orpc.ts
app.all("/rpc/*", async (ctx) =>
  (await rpcHandler.handle(ctx.request as Request, {
    prefix: "/rpc",
    context: options,
  })).response,
{ parse: "none" });
```

### Durable control plane in Inngest function
```ts
// packages/coordination-inngest/src/adapter.ts
const runner = client.createFunction(
  { id: "coordination-workflow-runner", retries: 2 },
  { event: COORDINATION_RUN_EVENT },
  async ({ event, runId, step }) => {
    await step.run("coordination/run-start", async () => {
      // durable-step boundary work
    });
    return { ok: true as const, runId: event.data.runId };
  },
);
```

## Placement Matrix
| Concern | Placement |
| --- | --- |
| Auth, request validation, visibility, rate rules | oRPC/Elysia boundary handlers/middleware |
| Retry semantics, step boundaries, idempotency, durable concurrency | Inngest function config + function body |
| Shared utility logic | Reusable package utility, applied separately in each harness |

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:214`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:253`
- oRPC: [Middleware](https://orpc.dev/docs/middleware)
- Inngest: [Step run](https://www.inngest.com/docs/reference/functions/step-run)
- Inngest: [Create function](https://www.inngest.com/docs/reference/functions/create)

## Cross-Axis Links
- Context propagation boundaries: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Error and observability semantics by surface: [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
- Host composition application points: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
