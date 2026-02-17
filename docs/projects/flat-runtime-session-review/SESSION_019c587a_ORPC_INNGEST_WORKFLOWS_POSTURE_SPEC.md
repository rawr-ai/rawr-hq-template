# SESSION_019c587a — ORPC + Inngest/Workflows Posture Spec (Integrative Overview)

## Document Role
This file is the integrative subsystem overview for ORPC + Inngest posture.

Canonical axis-level leaf specs now live in:
- `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`

Redistribution proof is recorded in:
- `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`

## 1) Scope
This subsystem posture defines how this system composes:
1. oRPC boundary APIs,
2. workflow trigger APIs,
3. Inngest durable execution,
4. optional Durable Endpoint ingress adapters,
under TypeBox + oRPC + Elysia + Inngest.

This is a policy/spec artifact. It is not a migration checklist.

## 2) Locked Decisions (Accepted)
1. Keep split semantics between API boundary and durable execution; reject full runtime-surface collapse.
2. Use oRPC as the primary API harness (contracts, routers, OpenAPI, external client generation).
3. Use Inngest functions as the primary durability harness (durable orchestration, retries, step semantics).
4. Treat Inngest Durable Endpoints as additive ingress adapters only, never as a second first-party trigger authoring path.

## 3) Original Tensions (Resolved)
1. Collapse into one plugin/surface for simplicity vs preserve semantic correctness across non-equivalent runtime models.
2. Enable flexible internal calling styles vs enforce one deterministic default to prevent drift.
3. Reduce composition boilerplate vs avoid hiding ownership and runtime boundaries.
4. Reuse one client-generation path vs introduce ingress-specific behaviors that weaken contract guarantees.

## 4) Global Invariants (Subsystem-Wide)
1. `/api/inngest` is runtime ingress only.
2. Caller-triggered workflow APIs stay on oRPC workflow trigger surfaces (for example `/api/workflows/<domain>/*`).
3. External SDK generation comes from one composed oRPC/OpenAPI boundary surface.
4. One runtime-owned Inngest client bundle exists per process in host composition.
5. Domain packages stay transport-neutral.
6. TypeBox-first schema flow is preserved for procedure-local/boundary-contract I/O and OpenAPI conversion.
7. Domain modules (`domain/*`) hold transport-independent domain concepts only (entities/value objects/invariants/state shapes).
8. Procedure input/output schemas live with the owning procedure (internal package surface) or boundary contract (`contract.ts` on API/workflow surfaces), not in domain modules.
9. Domain filenames inside one `domain/` folder omit redundant domain-prefix tokens.
10. Naming defaults prefer concise, unambiguous domain identifiers for package/plugin directories and namespaces (for example `invoicing`).
11. Shared context contract defaults live in `context.ts` (or equivalent dedicated context module), and routers consume that contract rather than re-declaring it inline.
12. Request/correlation/principal/network metadata contracts are context-layer concerns and belong in `context.ts` (or equivalent context module), not `domain/*`.
13. Snippet alias default is `typeBoxStandardSchema as std`; terse aliases like `_`/`_$` are feasible but non-canonical due to readability.
14. Spec docs/examples default to inline procedure/contract I/O schema declarations at `.input(...)` and `.output(...)` callsites.
15. Schema extraction is exception-only, for shared schemas or large schemas where inline form materially harms readability.
16. When extraction is used, canonical shape is a paired object with `.input` and `.output` properties (for example `TriggerInvoiceReconciliationSchema.input` and `.output`).
17. No second first-party trigger authoring path for the same workflow behavior.
18. No local HTTP self-calls (`/rpc`, `/api/orpc`) as in-process default.
19. No direct `inngest.send` from arbitrary boundary API modules when canonical workflow trigger routers exist.
20. Shared TypeBox adapter and OpenAPI converter helper usage is centralized.
21. Typed composition helpers are optional DX accelerators, not hidden runtime policy.
22. Context envelopes remain split by runtime model: oRPC boundary request context and Inngest function runtime context are distinct and not forced into one universal context object.
23. Middleware control planes remain split by runtime model: boundary enforcement in oRPC/Elysia, durable lifecycle control in Inngest middleware + `step.*`.
24. oRPC middleware dedupe assumptions stay explicit: use context-cached markers for heavy checks, and treat built-in dedupe as constrained to leading-subset/same-order chains.

## 5) Axis Map (Coverage)
| Axis | Policy surface | Canonical leaf spec |
| --- | --- | --- |
| 1 | External client generation | `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md` |
| 2 | Internal clients/internal calling | `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` |
| 3 | Split vs collapse posture | `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md` |
| 4 | Context creation/propagation | `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md` |
| 5 | Errors/logging/observability | `orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md` |
| 6 | Middleware/cross-cutting concerns | `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md` |
| 7 | Host hooking/composition | `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md` |
| 8 | Workflows vs APIs boundaries | `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` |
| 9 | Durable endpoints vs durable functions | `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md` |

## 6) Integrative Topology (Cross-Axis)
```text
packages/<domain>/src/
  domain/*
  service/*
  procedures/*
  context.ts
  router.ts
  client.ts
  errors.ts
  index.ts

plugins/api/<domain>/src/contract.ts
  operations/*
  context.ts
  router.ts
  index.ts

plugins/workflows/<domain>/src/contract.ts
  operations/*
  context.ts
  router.ts
  functions/*
  durable/*   # optional additive ingress adapters only
  index.ts

packages/core/src/orpc/hq-router.ts
packages/coordination-inngest/src/adapter.ts
rawr.hq.ts
apps/server/src/orpc.ts
apps/server/src/rawr.ts
```

## 7) Integrative Interaction Flows

### Flow A: External API -> Internal Package Client Path
Intent: non-durable boundary action mapped to package capability logic.

```ts
// boundary router delegates through explicit operation
startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
  startInvoiceOperation(context, input),
);

// operation delegates to internal client
return context.invoice.start(input);
```

### Flow B: External API -> Workflow Trigger -> Inngest Durable Execution
Intent: caller-triggered durable run.

```ts
// trigger operation is explicit boundary behavior
await inngest.send({
  name: "invoice.reconciliation.requested",
  data: { runId: input.runId },
});

// durable function owns retries + step semantics
return inngest.createFunction(
  { id: "invoice.reconciliation", retries: 2 },
  { event: "invoice.reconciliation.requested" },
  async ({ event, step }) => {
    await step.run("invoice/reconcile", async () => ({ runId: event.data.runId, ok: true }));
    return { ok: true as const };
  },
);
```

### Flow C: Non-Workflow Normal Endpoint (oRPC-only)
Intent: non-durable state read.

```ts
state: os.state.router({
  getRuntimeState: os.state.getRuntimeState.handler(async ({ context }) => ({
    repoRoot: context.repoRoot,
  })),
}),
```

## 8) Composition Spine (Cross-Axis Contract)
1. Compose one oRPC contract/router tree for boundary API surfaces.
2. Compose one runtime-owned Inngest bundle (`client + functions`).
3. Mount `/api/inngest` explicitly.
4. Register oRPC routes (`/rpc`, `/api/orpc`) with parse-safe forwarding and injected context.

## 9) Naming, Adoption, and Scale Governance (Global)
1. Canonical role names: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
2. Internal package layered defaults may include `domain/*`, `service/*`, `procedures/*`, `errors.ts`.
3. Within one `domain/` folder, filenames avoid repeating the domain token (`status.ts`, not `invoice-status.ts` inside `invoicing/domain/`).
4. `domain/*` contains transport-independent domain concepts only; do not store procedure I/O ownership there.
5. Procedure input/output schemas belong next to procedures (internal package surfaces) or in boundary contracts (`contract.ts`) for API/workflow surfaces.
6. Request/correlation/principal/network metadata contracts belong in `context.ts` (or equivalent context module), not `domain/*`.
7. Package/plugin directory names prefer concise domain forms when clear (for example `packages/invoicing`, `plugins/api/invoicing`, `plugins/workflows/invoicing`).
8. Shared context contracts default to `context.ts` (or equivalent dedicated context module), and router modules consume that contract.
9. In policy snippets, use `typeBoxStandardSchema as std` as the readability-first alias; `_`/`_$` may appear in local code but are not canonical in spec docs.
10. Docs/examples default to inline procedure/contract I/O schemas at `.input(...)` and `.output(...)`.
11. Extraction is exception-only for shared or large readability cases, and extracted shape should be paired as `{ input, output }`.
12. Adoption exception is allowed only for true 1:1 overlap between boundary and internal surface, and must be explicitly documented.
13. Scale rule: split handlers/operations first; split contracts only when behavior/policy/audience diverges.

## 10) Source Anchors
### Local lineage
1. `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
2. `SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
3. `SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
4. `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
5. `SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md`
6. `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
7. `SESSION_019c587a_AGENT_X_CONTEXT_MIDDLEWARE_RESEARCH_FINDINGS.md`
8. `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

### Upstream references
1. oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract), [Implement](https://orpc.dev/docs/contract-first/implement-contract), [Procedure](https://orpc.dev/docs/procedure), [Context](https://orpc.dev/docs/context), [Middleware](https://orpc.dev/docs/middleware), [Dedupe middleware](https://orpc.dev/docs/best-practices/dedupe-middleware), [RPC handler](https://orpc.dev/docs/rpc-handler), [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [Server-side clients](https://orpc.dev/docs/client/server-side)
2. Inngest: [Serve](https://www.inngest.com/docs/reference/serve), [Create function](https://www.inngest.com/docs/reference/functions/create), [Step run](https://www.inngest.com/docs/reference/functions/step-run), [Middleware lifecycle](https://www.inngest.com/docs/reference/middleware/lifecycle), [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
3. Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle), [Mount](https://elysiajs.com/patterns/mount)
4. TypeBox: [Repository/docs](https://github.com/sinclairzx81/typebox)

## 11) Navigation
- If you need one axis policy in implementation-ready depth, start in `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` and follow its axis map.
- If you need tutorial-style concrete implementations, read:
  - `orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
  - `orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
  - `orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- If you need “what moved where” from pre-breakout monolith, use `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`.
- If you identify a new architecture-impacting ambiguity, record it in `orpc-ingest-spec-packet/DECISIONS.md` before continuing.
