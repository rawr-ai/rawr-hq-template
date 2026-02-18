# Axis 06: Middleware and Cross-Cutting Concerns

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.


## In Scope
- Placement rules for boundary middleware vs durable runtime controls.
- Reuse policy for shared logic without collapsing harness-specific application points.

## Out of Scope
- Full context semantics (see [04-context-propagation.md](./04-context-propagation.md)).
- Full error/timeline semantics (see [05-errors-observability.md](./05-errors-observability.md)).

## Canonical Policy
1. Boundary/API middleware (auth, shape validation, visibility, rate policy) MUST live in oRPC/Elysia boundary layer.
2. Durable runtime controls (retry, idempotency behavior, step boundaries, concurrency policy) MUST live in Inngest function configuration/implementation.
3. Middleware control planes MUST remain separated by runtime model: boundary middleware stacks do not become durable runtime middleware stacks, and vice versa.
4. Shared policy logic MAY be reused, but application points MUST remain harness-specific.
5. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe MUST be treated as constrained (leading subset in identical order), not universal.
6. Split path enforcement is part of middleware placement: first-party/internal caller policy executes on `/rpc`, published boundary policy executes on `/api/orpc/*` and `/api/workflows/<capability>/*`, while `/api/inngest` remains runtime ingress.
7. Middleware that depends on request/correlation/principal/network metadata MUST consume those contracts from context-layer modules (`context.ts`), not from `domain/*`.
8. Middleware-adjacent procedure/contract docs/examples SHOULD default to inline I/O schemas; extraction is exception-only for shared/large readability and should use paired `{ input, output }` shape.
9. Host baseline traces middleware (`extendedTracesMiddleware()`) anchors runtime instrumentation; plugin middleware MAY extend this baseline but MUST NOT replace or reorder it.

## Why
- API boundary policy and durable execution policy are separate control planes.
- Collapsing them creates surprising behavior and weakens debuggability.

## Trade-Offs
- Middleware is not one literal stack.
- This is intentional to preserve semantic correctness.

## Middleware Dedupe Contract
1. Manual dedupe pattern is canonical for heavy/expensive boundary checks: write a marker into context and return early on re-entry.
2. Built-in oRPC middleware dedupe applies only when router-level middleware chains satisfy strict ordering/leading-subset constraints.
3. Durable runtime retry behavior stays in Inngest controls (`createFunction`, middleware lifecycle hooks, `step.run`) and is not merged with boundary dedupe assumptions.
4. D-009 remains open and non-blocking: keep this as `SHOULD` guidance (not a new `MUST`) unless repeated implementation evidence requires a stronger lock.

## Decision Status Notes
1. D-008 is closed: host bootstrap initializes baseline traces first and owns ordering between runtime and boundary control planes.
2. D-010 remains open and non-blocking: `finished` hook side effects stay idempotent/non-critical guidance without new architecture-level policy expansion.

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

### Context-cached dedupe for heavy oRPC middleware
```ts
// packages/invoicing/src/middleware.ts
export const requireFinanceWriteMiddleware = base.middleware(async ({ context, next }) => {
  if (context.middlewareState?.roleChecked) return next();

  if (!context.principal.roles.includes("finance:write")) {
    throw new ORPCError("FORBIDDEN", { status: 403, message: "finance:write role is required" });
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
```

## Placement Matrix
| Concern | Placement |
| --- | --- |
| Auth, request validation, visibility, rate rules | oRPC/Elysia boundary handlers/middleware |
| Retry semantics, step boundaries, idempotency, durable concurrency | Inngest function config + function body |
| Heavy middleware dedupe | Explicit context-cached markers in oRPC middleware; do not assume global built-in dedupe |
| Shared utility logic | Reusable package utility, applied separately in each harness |

## References
- Local: `apps/server/src/orpc.ts:339`
- Local: `packages/coordination-inngest/src/adapter.ts:214`
- Local: `packages/coordination-inngest/src/adapter.ts:253`
- E2E: [e2e-04-context-middleware.md](../examples/e2e-04-context-middleware.md)
- oRPC: [Middleware](https://orpc.dev/docs/middleware)
- oRPC: [Dedupe middleware](https://orpc.dev/docs/best-practices/dedupe-middleware)
- Inngest: [Step run](https://www.inngest.com/docs/reference/functions/step-run)
- Inngest: [Create function](https://www.inngest.com/docs/reference/functions/create)
- Inngest: [Middleware lifecycle](https://www.inngest.com/docs/reference/middleware/lifecycle)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)

## Cross-Axis Links
- Context propagation boundaries: [04-context-propagation.md](./04-context-propagation.md)
- Error and observability semantics by surface: [05-errors-observability.md](./05-errors-observability.md)
- Host composition application points: [07-host-composition.md](./07-host-composition.md)
- Trigger/runtime boundary enforcement: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
