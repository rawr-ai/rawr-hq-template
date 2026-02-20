# Axis 12: Testing Harness and Verification Strategy

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is the canonical test harness and verification authority for this packet.

## Axis Opening
- **What this axis is:** the canonical policy slice for selecting and structuring verification harnesses by caller mode and route family.
- **What it covers:** layer-by-layer harness boundaries, required negative route assertions, package-first harness ownership, and D-015 lock language.
- **What this communicates:** verification confidence depends on route-aware harness choice and non-overlapping layer responsibilities.
- **Who should read this:** test-suite maintainers, plugin/package authors adding coverage, and reviewers evaluating conformance to route/caller policy.
- **Jump conditions:** for observability-specific assertions, jump to [05-errors-observability.md](./05-errors-observability.md); for middleware verification constraints, jump to [06-middleware.md](./06-middleware.md); for distribution/lifecycle seam implications, jump to [13-distribution-and-instance-lifecycle-model.md](./13-distribution-and-instance-lifecycle-model.md).

## In Scope
- Canonical harness selection by caller mode, route family, and plugin surface.
- Verification layer boundaries (unit, in-process integration, boundary/network integration, runtime ingress verification, E2E).
- Required negative tests for forbidden route usage.
- Package-first harness ownership and import-direction principles.
- D-015 documentation/testing contract language.

## Out of Scope
- Runtime code implementation details.
- Prescriptive framework-specific test runner wiring.
- Process/runbook doc edits outside this packet.
- Decision-register mutation beyond already-locked D-015.

## Canonical Policy
1. Test harness choice MUST follow caller-mode and route-family policy already locked in [ARCHITECTURE.md](../ARCHITECTURE.md).
2. Server-internal behavior verification MUST default to in-process harnesses using `createRouterClient`.
3. First-party caller network verification (including MFE default) MUST use `RPCLink` on `/rpc` unless an explicit documented exception exists.
4. External/third-party boundary verification MUST use `OpenAPILink` on published routes (`/api/orpc/*`, `/api/workflows/<capability>/*`).
5. Runtime ingress verification MUST target `/api/inngest` as signed runtime callback traffic only.
6. Caller-path tests (browser, CLI caller-style HTTP, third-party SDK) MUST NOT treat `/api/inngest` as a callable boundary API.
7. External/third-party tests MUST NOT treat `/rpc` as an allowed route.
8. Runtime-ingress tests MUST NOT claim caller-boundary behavior guarantees for `/rpc`, `/api/orpc/*`, or `/api/workflows/<capability>/*`.
9. Verification layers MUST have non-overlapping purpose boundaries to prevent false confidence.
10. Middleware verification MUST remain harness-specific: boundary middleware via boundary harnesses, durable middleware via runtime ingress harnesses.
11. Error and observability assertions MUST verify route-appropriate semantics (typed boundary errors vs durable run/timeline lifecycle states).
12. Testing harness ownership SHOULD be package-first where reasonable: reusable in-process harness primitives belong in capability packages, while plugins keep boundary/runtime adapter assertions specific to their surface.
13. Import direction in tests MUST remain clean: `plugins/*` tests may depend on `packages/*` test helpers/contracts, but package-layer tests MUST NOT depend on plugin runtime modules.
14. TypeScript test harness utilities SHOULD expose explicit typed factories/contracts (no implicit `any` escape hatches in canonical snippets).
15. This axis is additive and does not alter D-005..D-012 semantics.

## Why
- Route-family and caller-mode policy cannot be validated reliably with one generic harness.
- Layer-specific verification boundaries reduce false confidence and make drift easier to detect.
- Negative-route assertions are necessary to preserve the split between caller APIs and runtime ingress.

## Trade-Offs
- Teams maintain multiple harness patterns instead of one universal test style.
- Coverage planning is more explicit, but this yields clearer failure signals and policy conformance evidence.

## Package-First Harness Ownership Contract
This section is a **design contract**, not an implementation prescription.

1. Package layer is the default home for reusable in-process harness primitives:
   - typed context factories,
   - internal client builders (`createRouterClient` wrappers),
   - domain/service/procedure test fixtures.
2. Plugin-layer harness code stays thin and surface-specific:
   - API/workflow boundary route assertions,
   - caller-mode transport assertions (`RPCLink`/`OpenAPILink`),
   - runtime-ingress assertions for `/api/inngest`.
3. Import direction is one-way for harness composition:
   - allowed: `plugins/*` test suites -> `packages/*` harness helpers,
   - disallowed: package test suites -> plugin runtime modules.
4. DX objective: deterministic, low-friction wiring.
   - one obvious in-process harness entrypoint per capability package,
   - one obvious boundary harness entrypoint per plugin surface,
   - one obvious runtime-ingress harness entrypoint per workflow runtime bundle.

## TypeScript Harness Quality Contract
1. Prefer explicit context interfaces and typed factory functions over ad hoc object literals.
2. Keep test helpers transport-neutral at package layer; bind transport (`RPCLink`/`OpenAPILink`) only in boundary suites.
3. Avoid broad `any` in canonical harness contracts; use constrained generics or inferred contract-router clients.
4. Keep assertion helpers route-family-aware so failures identify caller-mode drift quickly.

## Harness Model by Surface

| Surface context | Primary verification harness | Route family under test | Link/client pattern | Forbidden test paths |
| --- | --- | --- | --- | --- |
| Web plugin (first-party default) | boundary/network integration | `/rpc` | `RPCLink` | `/api/inngest` |
| Web plugin (published external flow) | boundary/network integration | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | `/rpc` for external mode, `/api/inngest` |
| CLI plugin (internal command path) | in-process integration | in-process procedure calls | `createRouterClient` | caller-style `/api/inngest` |
| CLI plugin (caller-facing HTTP mode, if applicable) | boundary/network integration | `/rpc` for first-party CLI; published OpenAPI routes for external CLI | `RPCLink` or `OpenAPILink` (mode-dependent) | `/api/inngest` as caller path |
| API plugin | unit + in-process integration + boundary/network integration | operation layer (in-process) and `/api/orpc/*` (network) | `createRouterClient` + `OpenAPILink` | `/api/inngest` |
| Workflow plugin (trigger/status) | boundary/network integration + in-process integration | `/rpc` (first-party default) and `/api/workflows/<capability>/*` (published boundary) | `RPCLink`, `OpenAPILink`, `createRouterClient` (preflight internals) | caller-path `/api/inngest` |
| Workflow runtime functions | runtime ingress verification | `/api/inngest` | Inngest callback transport | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## In-Process vs Network Harness Patterns

### Pattern A: In-process capability verification (`createRouterClient`)
Use when validating package logic, operation mapping, and middleware effects without HTTP transport variables.

```ts
const invoicing = createRouterClient(invoicingRouter, { context: trustedContext });
const result = await invoicing.preflightReconciliation({ requestId, scope });
```

### Pattern B: First-party network verification (`RPCLink` on `/rpc`)
Use when validating first-party boundary behavior, auth/session checks, and internal route contracts.

```ts
const client = createORPCClient(capabilityClients.invoicing.workflows, {
  link: new RPCLink({ url: `${baseUrl}/rpc` }),
});
const run = await client.getRunStatus({ runId });
```

### Pattern C: Published boundary verification (`OpenAPILink`)
Use when validating externally published API/workflow contracts and OpenAPI-facing behavior.

```ts
const apiClient = createORPCClient(externalContracts.invoicing.api, {
  link: new OpenAPILink({ url: `${baseUrl}/api/orpc` }),
});
const workflowClient = createORPCClient(externalContracts.invoicing.workflows, {
  link: new OpenAPILink({ url: `${baseUrl}/api/workflows` }),
});
```

### Pattern D: Runtime ingress verification (`/api/inngest`)
Use only for signed runtime callback verification, ingress hardening, and durable lifecycle behavior.

```ts
const response = await fetch(`${baseUrl}/api/inngest`, {
  method: "POST",
  headers: signedInngestHeaders,
  body: payload,
});
expect(response.status).toBe(200);
```

## Forbidden Route Assertions (Mandatory Negative Tests)

| Test persona | Route that must fail/never be used | Expected assertion |
| --- | --- | --- |
| Browser/MFE caller | `/api/inngest` | forbidden/blocked at gateway or route guard; not exposed in caller SDK |
| External/third-party caller | `/rpc` | unauthorized/not-found by publication policy |
| Runtime ingress harness | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` | ingress flow does not assert caller-boundary behavior |
| Internal in-process suite | local HTTP self-call as default | suite uses `createRouterClient` instead |

## Verification Layer Boundaries

| Layer | Primary purpose | Canonical harness | Must prove | Must not prove |
| --- | --- | --- | --- | --- |
| Unit | domain/service/procedure-local correctness | direct function tests | pure invariants, mapping logic, deterministic error branches | route policy, ingress security, network composition |
| In-process integration | server-internal behavior with trusted context | `createRouterClient` | operation -> package flow, middleware dedupe behavior, context contract usage | HTTP routing/mount correctness, published OpenAPI behavior |
| Boundary/network integration | boundary route and auth/publication behavior | `RPCLink` for first-party, `OpenAPILink` for published routes | route-prefix correctness, typed boundary errors, caller-mode auth and publication constraints | durable callback security as caller path |
| Runtime ingress verification | signed callback ingress and durable lifecycle behavior | Inngest callback transport on `/api/inngest` | signature verification, runtime middleware lifecycle, run/timeline transitions | caller boundary contract semantics |
| E2E | full composed system behavior across boundaries | mixed harnesses by route family | trigger -> enqueue -> durable run -> status read with correct route semantics | policy shortcuts that bypass route/caller constraints |

## Minimum Suite Contract by Capability
1. Unit coverage for domain/service/procedure or operation modules.
2. In-process integration for package internal client flows.
3. Boundary/network integration for first-party `/rpc` and published OpenAPI boundaries as applicable.
4. Runtime ingress verification for `/api/inngest` signature and durable lifecycle handling.
5. E2E traceability that demonstrates caller-to-durable run continuity without route-policy violations.
6. At least one negative route-usage test per caller persona.

## What Changes vs What Stays Unchanged
- **Changes:** This axis centralizes test harness strategy, route-aware verification layers, and required negative-route assertions.
- **Unchanged:** D-005 route split, D-006 plugin boundary ownership, D-007 caller transport/publication boundaries, D-008 bootstrap ordering, D-009/D-010 status, D-011/D-012 schema/context ownership posture.

## D-015 Locked Decision Language
The following language reflects the D-015 lock captured in `DECISIONS.md`:

1. The packet locks a canonical testing harness model keyed by caller mode and route family.
2. Verification is layered into unit, in-process integration, boundary/network integration, runtime ingress verification, and E2E, each with explicit purpose boundaries.
3. `/api/inngest` is runtime-ingress verification only and is not a caller boundary route for browser, first-party caller SDK, CLI caller SDK, or third-party clients.
4. Downstream process/runbook/testing docs must align to this axis; rollout/edit execution is tracked separately from this packet pass.

## References
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [DECISIONS.md](../DECISIONS.md)
- [05-errors-observability.md](./05-errors-observability.md)
- [06-middleware.md](./06-middleware.md)
- [07-host-composition.md](./07-host-composition.md)
- [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- [e2e-04-context-middleware.md](../examples/e2e-04-context-middleware.md)

## Cross-Axis Links
- Error/timeline semantics under tests: [05-errors-observability.md](./05-errors-observability.md)
- Middleware placement and dedupe testing: [06-middleware.md](./06-middleware.md)
- Host route wiring and route families: [07-host-composition.md](./07-host-composition.md)
- Workflow trigger/runtime split: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
