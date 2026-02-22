# Axis 04: Context Creation and Propagation

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for context creation and propagation across boundary and durable runtime models.
- **What it covers:** request-context creation, runtime-context derivation, envelope split rules, and trigger-to-run correlation propagation.
- **What this communicates:** boundary request context and durable runtime context are separate contracts that should stay explicitly split.
- **Who should read this:** host owners, workflow/runtime authors, and plugin/package maintainers modeling context contracts.
- **Jump conditions:** for error/timeline semantics, jump to [05-errors-observability.md](./05-errors-observability.md); for middleware control-plane placement, jump to [06-middleware.md](./06-middleware.md); for host composition boundaries, jump to [07-host-composition.md](./07-host-composition.md).


## In Scope
- Request context creation and injection for oRPC boundary handling.
- Durable context derivation in Inngest execution.
- Trigger-to-run correlation propagation rules.

## Out of Scope
- Surface ownership split itself (see [03-split-vs-collapse.md](./03-split-vs-collapse.md)).
- Error and observability semantics beyond context propagation (see [05-errors-observability.md](./05-errors-observability.md)).

## Canonical Policy
1. Request context MUST be created at oRPC ingress and injected per request.
2. Durable run context MUST be derived from Inngest runtime handler context (`event`, `step`, `runId`, `attempt`, logger/runtime middleware fields) during execution.
3. Context envelopes MUST remain explicitly split: boundary request context and runtime function context are separate contracts, not one universal context object.
4. Correlation metadata SHOULD be propagated from trigger boundary to durable run payload/timeline.
5. Host route split MUST be preserved because it enforces the context model: first-party/internal caller traffic on `/rpc` and published boundary APIs (`/api/orpc/*`, `/api/workflows/<capability>/*`) create boundary context, while `/api/inngest` is runtime ingress.
6. Request/correlation/principal/network metadata types are context-layer contracts and SHOULD live in `context.ts` (or equivalent context modules), not in `domain/*`.
7. Context-related trigger/procedure docs/examples SHOULD default to inline I/O schema declarations; extraction is exception-only for shared/large readability and should use paired `{ input, output }` shape.

## Why
- Request lifecycle and durable run lifecycle are distinct execution models.
- Explicit context propagation preserves trace continuity without conflating context envelopes.

## Trade-Offs
- Two context envelopes exist instead of one universal context object.
- This is required by the execution-model split.

## Two-Envelope Contract
| Envelope | Created by | Typical fields | Lifecycle |
| --- | --- | --- | --- |
| oRPC boundary context | Host boundary handler per HTTP request | principal, request IDs, network policy, injected package clients/deps | request-scoped |
| Inngest runtime context | Inngest function runtime + middleware | event payload, `step`, `runId`, `attempt`, logger, middleware-injected runtime fields | run/attempt-scoped |

## Canonical Snippets

### Request context envelope (oRPC ingress)
```ts
// plugins/api/invoicing/src/context.ts
type ApiPrincipal = {
  subject: string;
  tenantId: string;
  roles: string[];
};

type ApiRequestMetadata = {
  requestId: string;
  correlationId: string;
  sourceIp?: string;
  userAgent?: string;
};

type ApiNetworkMetadata = {
  trustedCidrs: string[];
  egressPolicyTag: string;
};

type InvoicingApiContext = {
  principal: ApiPrincipal;
  request: ApiRequestMetadata;
  network: ApiNetworkMetadata;
};
```

### Durable context envelope (Inngest runtime)
```ts
// plugins/workflows/invoicing/src/functions/reconciliation.ts
return inngest.createFunction(
  { id: "invoicing.reconciliation", retries: 2 },
  { event: "invoicing.reconciliation.requested" },
  async ({ event, step, runId, attempt, logger, runTrace }) => {
    logger.info("reconciliation start", {
      runId,
      attempt,
      correlationId: runTrace.correlationId,
    });
    await step.run("invoicing/reconcile", async () => ({ ok: true as const, runId: event.data.runId }));
    return { ok: true as const };
  },
);
```

## Correlation Propagation Contract
1. Trigger operation payload carries correlation-ready identifiers (`runId`, workflow identity, base URL context).
2. Runtime adapter stores run state and timeline events with trace links.
3. Durable function step timeline writes preserve run ID continuity.

## References
- Local: `apps/server/src/orpc.ts:41`
- Local: `apps/server/src/orpc.ts:314`
- Local: `packages/coordination-inngest/src/adapter.ts:91`
- Local: `packages/coordination-inngest/src/adapter.ts:175`
- E2E: [e2e-04-context-middleware.md](../examples/e2e-04-context-middleware.md)
- oRPC: [Context](https://orpc.dev/docs/context)
- oRPC: [Procedure](https://orpc.dev/docs/procedure)
- oRPC: [Middleware](https://orpc.dev/docs/middleware)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Create function](https://www.inngest.com/docs/reference/functions/create)
- Inngest: [Middleware dependency injection](https://www.inngest.com/docs/features/middleware/dependency-injection)
- Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle)

## Cross-Axis Links
- Error and observability shape split: [05-errors-observability.md](./05-errors-observability.md)
- Middleware placement by harness: [06-middleware.md](./06-middleware.md)
- Host composition and context injection mounting: [07-host-composition.md](./07-host-composition.md)
- Trigger/runtime route split policy: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
