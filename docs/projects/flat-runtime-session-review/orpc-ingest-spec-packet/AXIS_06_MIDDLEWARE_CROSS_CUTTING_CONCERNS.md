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
3. Middleware control planes MUST remain separated by runtime model: boundary middleware stacks do not become durable runtime middleware stacks, and vice versa.
4. Shared policy logic MAY be reused, but application points MUST remain harness-specific.
5. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe MUST be treated as constrained (leading subset in identical order), not universal.
6. Split path enforcement is part of middleware placement: caller-facing policy executes on `/api/orpc/*` or `/api/workflows/*`, while `/api/inngest` remains runtime ingress.
7. Middleware that depends on request/correlation/principal/network metadata MUST consume those contracts from context-layer modules (`context.ts`), not from `domain/*`.
8. Middleware-adjacent procedure/contract docs/examples SHOULD default to inline I/O schemas; extraction is exception-only for shared/large readability and should use paired `{ input, output }` shape.

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
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:214`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:253`
- E2E: [E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md](./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md)
- oRPC: [Middleware](https://orpc.dev/docs/middleware)
- oRPC: [Dedupe middleware](https://orpc.dev/docs/best-practices/dedupe-middleware)
- Inngest: [Step run](https://www.inngest.com/docs/reference/functions/step-run)
- Inngest: [Create function](https://www.inngest.com/docs/reference/functions/create)
- Inngest: [Middleware lifecycle](https://www.inngest.com/docs/reference/middleware/lifecycle)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)

## Cross-Axis Links
- Context propagation boundaries: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Error and observability semantics by surface: [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
- Host composition application points: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
- Trigger/runtime boundary enforcement: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
