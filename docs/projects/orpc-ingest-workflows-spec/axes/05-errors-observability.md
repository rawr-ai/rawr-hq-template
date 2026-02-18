# Axis 05: Errors, Logging, and Observability

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.


## In Scope
- API boundary error contract semantics.
- Durable execution lifecycle status/timeline recording.
- Trigger-to-run trace and status correlation policy.
- Route-aware observability verification boundaries for tests.

## Out of Scope
- Context envelope construction details (see [04-context-propagation.md](./04-context-propagation.md)).
- Middleware placement details (see [06-middleware.md](./06-middleware.md)).
- Full harness-layer taxonomy (see [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md)).

## Canonical Policy
1. API boundary errors MUST use oRPC typed error semantics (`ORPCError` with status/code).
2. Durable execution state MUST be recorded as run/timeline lifecycle events in runtime adapter.
3. Trigger-to-run correlation SHOULD be attached to trace links and persisted status.
4. Host bootstrap MUST initialize `extendedTracesMiddleware()` before Inngest client/function composition so trigger and durable paths share the baseline trace envelope.
5. Inngest `finished` hook usage SHOULD stay idempotent/non-critical; this remains operational guidance and is not expanded into stricter packet policy in this axis.
6. Observability verification MUST use route-appropriate harnesses defined in [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md) (`createRouterClient` in-process, `RPCLink` on `/rpc`, `OpenAPILink` on published boundaries, runtime-ingress callback on `/api/inngest`).
7. Caller-path observability suites (browser, CLI caller flows, external SDK flows) MUST assert `/api/inngest` is not a caller-facing route.
8. Surface-level observability suites for web, CLI, API, and workflow paths MUST explicitly state route family, harness type, and required negative-route assertions.
9. Observability drift checks MUST include `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard`, and MUST treat `rawr.kind` + `rawr.capability` as canonical runtime identity keys.
10. Observability assertions MUST NOT branch on legacy metadata fields (`templateRole`, `channel`, `publishTier`, `published`) for runtime behavior expectations.
11. Reusable observability harness helpers MUST remain package-first, with one-way import direction (`plugins/*` suites may import `packages/*` helpers; package suites MUST NOT import plugin runtime modules).

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

## Verification Harness Alignment (Axis 12)
| Verification layer | Observability assertion focus | Harness contract |
| --- | --- | --- |
| Unit + in-process integration | deterministic error mapping and timeline-event shape creation | direct function tests + `createRouterClient` |
| Boundary/network integration | typed boundary `ORPCError` behavior, status/code shape, caller-route policy observability | `RPCLink` on `/rpc` or `OpenAPILink` on published routes |
| Runtime ingress verification | signature-gated ingress behavior, durable run/timeline lifecycle signals | signed callback flow on `/api/inngest` |
| E2E | trigger-to-run trace continuity without route-policy violations | mixed route-aware harnesses per [Axis 12](./12-testing-harness-and-verification-strategy.md) |

## Surface-Specific Observability Requirements (Lifecycle-Ready)
| Surface | Required harness | Required observability assertions | Required negative-route assertions |
| --- | --- | --- | --- |
| Web plugin (first-party default) | `RPCLink` on `/rpc` | typed boundary error shape, correlation propagation from request to run status reads | browser/web caller suite rejects `/api/inngest` |
| CLI plugin (internal command flow) | `createRouterClient` | in-process error mapping and timeline-event shape from package/client path | CLI internal suite does not replace in-process calls with local HTTP self-calls |
| API plugin (published boundary) | `OpenAPILink` on `/api/orpc/*` | published boundary status/code semantics and trace continuity fields | published API suite does not call `/api/inngest` |
| Workflow trigger/status plugin | `RPCLink` on `/rpc` (first-party) and `OpenAPILink` on `/api/workflows/<capability>/*` (published) | trigger-to-run correlation continuity, typed boundary errors, route-family policy adherence | trigger/status suites reject caller use of `/api/inngest`; external suites reject `/rpc` |
| Workflow runtime ingress | signed callback flow on `/api/inngest` | signature-gated runtime ingress behavior, durable lifecycle timeline/status transitions, retry-safe logging context | runtime-ingress suite does not claim caller-boundary guarantees for `/rpc`, `/api/orpc/*`, or `/api/workflows/<capability>/*` |

## D-013 and D-014 Compatibility Checks
1. Observability docs/tests treat runtime composition identity as `rawr.kind` + `rawr.capability` and manifest-owned surfaces.
2. Observability docs/tests do not assign runtime behavior to `templateRole`, `channel`, `publishTier`, or `published`.
3. Observability helper placement and imports follow the package-first and one-way import-direction contract described in [11-core-infrastructure-packaging-and-composition-guarantees.md](./11-core-infrastructure-packaging-and-composition-guarantees.md).

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
- Local: `apps/server/src/orpc.ts:80`
- Local: `apps/server/src/orpc.ts:200`
- Local: `packages/coordination-inngest/src/adapter.ts:149`
- Local: `packages/coordination-inngest/src/adapter.ts:298`
- Local: `packages/coordination-inngest/src/adapter.ts:333`

## Cross-Axis Links
- Context propagation contract: [04-context-propagation.md](./04-context-propagation.md)
- Trigger and durable boundary split: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Durable function posture: [09-durable-endpoints.md](./09-durable-endpoints.md)
- Canonical harness and verification layer strategy: [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md)
