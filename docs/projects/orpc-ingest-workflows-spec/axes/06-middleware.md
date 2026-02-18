# Axis 06: Middleware and Cross-Cutting Concerns

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.


## In Scope
- Placement rules for boundary middleware vs durable runtime controls.
- Reuse policy for shared logic without collapsing harness-specific application points.
- Middleware-specific verification boundaries across in-process, boundary, and runtime ingress harnesses.

## Out of Scope
- Full context semantics (see [04-context-propagation.md](./04-context-propagation.md)).
- Full error/timeline semantics (see [05-errors-observability.md](./05-errors-observability.md)).
- Full test harness taxonomy and layer definitions (see [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md)).

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
10. Middleware verification MUST remain harness-specific: boundary middleware is verified via boundary harnesses (`RPCLink`/`OpenAPILink`), package middleware via in-process harnesses (`createRouterClient`), and durable middleware via runtime-ingress harnesses (`/api/inngest` callback flow).
11. Middleware-related test suites MUST include negative route assertions that enforce caller/runtime route separation (for example: caller paths do not use `/api/inngest`, external caller paths do not use `/rpc`).
12. Middleware verification layering MUST align with [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md).
13. Middleware lifecycle suites for web, CLI, API, workflow trigger/status, and runtime ingress MUST declare required harness, route family, and route-forbidden assertions explicitly.
14. Middleware docs/tests MUST treat `rawr.kind` + `rawr.capability` and manifest-owned surfaces as canonical runtime composition anchors, and MUST NOT assign middleware behavior to `templateRole`, `channel`, `publishTier`, or `published`.
15. Reusable middleware harness helpers MUST remain package-first; plugin suites MAY consume package helpers, and package suites MUST NOT import plugin runtime modules.

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

## Middleware Test Harness Contract (Axis 12)
| Middleware concern | Verification layer | Required harness | Must-not assertion gap |
| --- | --- | --- | --- |
| Package/oRPC dedupe markers (`middlewareState`) | in-process integration | `createRouterClient` | do not infer HTTP route publication behavior |
| Boundary auth/network middleware | boundary/network integration | `RPCLink` for first-party `/rpc`; `OpenAPILink` for published routes | do not treat `/api/inngest` as caller route |
| Runtime Inngest middleware lifecycle | runtime ingress verification | signed callback transport on `/api/inngest` | do not infer caller API semantics for runtime ingress |
| Cross-surface policy coherence | E2E | mixed route-aware harnesses | do not collapse boundary/runtime control planes |

## Surface-Specific Middleware Lifecycle Expectations
| Surface | Required suites | Required middleware assertions | Mandatory negative assertions |
| --- | --- | --- | --- |
| Web plugin (first-party default) | boundary/network middleware suite | `/rpc` boundary auth/visibility/rate policy execution with typed failures | web suite rejects caller use of `/api/inngest` |
| CLI plugin (internal command flow) | in-process middleware suite | `createRouterClient` path validates dedupe markers and context hydration behavior | CLI internal suite does not replace in-process verification with local HTTP self-calls |
| API plugin (published boundary) | boundary/network middleware suite | `/api/orpc/*` policy checks and typed boundary failures | API published suite does not treat `/api/inngest` as boundary route |
| Workflow trigger/status plugin | boundary + in-process middleware suites | trigger/status permission checks plus package middleware reuse expectations | external workflow suite rejects `/rpc`; caller suites reject `/api/inngest` |
| Workflow runtime ingress | runtime-ingress middleware suite | signed callback validation, run-lifecycle middleware behavior, retry-safe middleware effects | runtime-ingress suite does not claim caller-route semantics for `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## D-013 and D-014 Compatibility Checks
1. Middleware lifecycle docs/tests remain manifest-first and capability keyed (`rawr.kind` + `rawr.capability`).
2. Middleware lifecycle docs/tests do not use legacy metadata fields as runtime decision keys.
3. Middleware harness ownership and import direction align with [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md) and [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md).

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
- Canonical harness and verification layer strategy: [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md)
