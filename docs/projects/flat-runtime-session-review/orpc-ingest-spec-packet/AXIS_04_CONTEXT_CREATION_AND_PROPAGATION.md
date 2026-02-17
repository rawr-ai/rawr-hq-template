# Axis 04: Context Creation and Propagation

## In Scope
- Request context creation and injection for oRPC boundary handling.
- Durable context derivation in Inngest execution.
- Trigger-to-run correlation propagation rules.

## Out of Scope
- Surface ownership split itself (see [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)).
- Error and observability semantics beyond context propagation (see [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)).

## Canonical Policy
1. Request context MUST be created at oRPC ingress and injected per request.
2. Durable run context MUST be derived from event payload plus runtime adapter during Inngest execution.
3. Correlation metadata SHOULD be propagated from trigger boundary to durable run payload/timeline.

## Why
- Request lifecycle and durable run lifecycle are distinct execution models.
- Explicit context propagation preserves trace continuity without conflating context envelopes.

## Trade-Offs
- Two context envelopes exist instead of one universal context object.
- This is required by the execution-model split.

## Canonical Snippets

### Request context envelope (oRPC ingress)
```ts
// apps/server/src/orpc.ts
type RawrOrpcContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};

app.all("/api/orpc/*", async (ctx) =>
  (await openapiHandler.handle(ctx.request as Request, {
    prefix: "/api/orpc",
    context: options,
  })).response,
{ parse: "none" });
```

### Durable context envelope (Inngest adapter)
```ts
// packages/coordination-inngest/src/adapter.ts
const queuedRun: RunStatusV1 = {
  runId: options.runId,
  workflowId: options.workflow.workflowId,
  workflowVersion: options.workflow.version,
  status: "queued",
  startedAt: new Date().toISOString(),
  input: options.input ?? {},
  traceLinks: defaultTraceLinks(options.baseUrl, options.runId, {
    inngestBaseUrl: options.runtime.inngestBaseUrl,
  }),
};
```

## Correlation Propagation Contract
1. Trigger operation payload carries correlation-ready identifiers (`runId`, workflow identity, base URL context).
2. Runtime adapter stores run state and timeline events with trace links.
3. Durable function step timeline writes preserve run ID continuity.

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:41`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:314`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:91`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:175`
- Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle)

## Cross-Axis Links
- Error and observability shape split: [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
- Middleware placement by harness: [AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md](./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md)
- Host composition and context injection mounting: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
