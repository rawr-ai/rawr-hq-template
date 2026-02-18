# SESSION_019c587a — ORPC + Inngest/Workflows Integration Overview (Reference)

## Role Metadata
- Role: Reference
- Authority: Integrative cross-axis overview for ORPC + Inngest composition.
- Owns: Explanatory topology, interaction synthesis, and navigation guidance for canonical packet artifacts.
- Depends on: `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`, `orpc-ingest-spec-packet/DECISIONS.md`, `orpc-ingest-spec-packet/CANONICAL_READ_PATH.md`, `orpc-ingest-spec-packet/CANONICAL_ROLE_CONTRACT.md`, `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md` through `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`.
- Last validated against: `SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Normative Boundary
1. This file is non-normative by default.
2. Requirement language in this file mirrors canonical packet policy and does not create independent policy ownership.
3. Canonical policy authority remains in `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`, `orpc-ingest-spec-packet/DECISIONS.md`, and the axis annexes.
4. If this file conflicts with canonical packet artifacts, canonical packet artifacts win.

## Canonical Packet References
Canonical axis-level leaf specs live in:
- `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`

Redistribution traceability lives in:
- `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`

## 1) Scope
This subsystem posture defines how this system composes:
1. oRPC boundary APIs,
2. workflow trigger APIs,
3. Inngest durable execution,
4. optional Durable Endpoint ingress adapters,
under TypeBox + oRPC + Elysia + Inngest.

This is an integration reference artifact. It does not establish canonical policy ownership and it is not a migration checklist.

## 2) Canonical Policy Snapshot (Reference Mirror)
1. Split semantics are fixed between API boundary and durable execution.
2. oRPC is the primary API harness (contracts, routers, OpenAPI, external client generation).
3. Inngest functions are the primary durability harness (durable orchestration, retries, step semantics).
4. Durable Endpoints are additive ingress adapters only, never a second first-party trigger authoring path.
5. Workflow trigger mounts are manifest-driven and capability-first at `/api/workflows/<capability>/*`, with explicit workflow boundary context helpers and one runtime-owned Inngest bundle.
6. Host bootstrap initializes baseline `extendedTracesMiddleware()` before Inngest bundle construction, workflow composition, or route registration.
7. Plugin runtime middleware may extend baseline instrumentation context but may not replace or reorder that baseline.
8. Workflow/API boundary contracts are plugin-owned (`plugins/api/*/contract.ts`, `plugins/workflows/*/contract.ts`); workflow trigger/status I/O schemas remain workflow boundary owned.
9. `/rpc` + `RPCLink` are first-party/internal only; RPC client artifacts are never externally published.
10. First-party callers (including MFEs by default) use `RPCLink` on `/rpc` unless an explicit exception is documented.
11. Externally published clients use OpenAPI boundary routes (`/api/orpc/*`, `/api/workflows/<capability>/*`).
12. Runtime ingress uses signed `/api/inngest` only.
13. No dedicated `/rpc/workflows` mount is added by default.
14. Composition and mounting contracts are explicit and non-black-box.

## 2.1) Canonical Caller/Transport Matrix
| Caller type | Route family | Link type | Publication boundary | Auth expectation | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party MFE (default) | `/rpc` | `RPCLink` | internal only (never published) | first-party boundary session/auth | `/api/inngest` |
| First-party server/CLI | in-process package client (default), optional `/rpc` | `createRouterClient` / `RPCLink` | internal only (never published) | trusted service context | `/api/inngest` |
| Third-party/external caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | externally published OpenAPI clients | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress (Inngest) | `/api/inngest` | Inngest callback transport | runtime-only | signed ingress verification + gateway allow-listing | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## 3) Original Tensions (Resolved)
1. Collapse into one plugin/surface for simplicity vs preserve semantic correctness across non-equivalent runtime models.
2. Enable flexible internal calling styles vs enforce one deterministic default to prevent drift.
3. Reduce composition boilerplate vs avoid hiding ownership and runtime boundaries.
4. Reuse one client-generation path vs introduce ingress-specific behaviors that weaken contract guarantees.

## 4) Core Invariants Map (Reference Mirror)
1. `/api/inngest` is runtime ingress only.
2. Caller-triggered workflow APIs stay on oRPC workflow trigger surfaces (`/api/workflows/<capability>/*`).
3. `/rpc` is first-party/internal transport only.
4. First-party callers (including MFEs by default) use `RPCLink` on `/rpc` unless an explicit exception is documented.
5. External SDK generation comes from published OpenAPI surfaces (`/api/orpc/*`, `/api/workflows/<capability>/*`) and never from RPC clients.
6. One runtime-owned Inngest client bundle exists per process in host composition.
7. Host bootstrap initializes baseline traces middleware before Inngest client/function composition and route setup.
8. Plugin runtime middleware can extend baseline instrumentation context but does not replace/reorder the baseline traces middleware.
9. Domain packages stay transport-neutral.
10. Workflow/API boundary contracts are plugin-owned; packages do not own workflow boundary contracts or workflow trigger/status I/O schemas.
11. Server-internal callers use in-process package internal clients with trusted service context and no local HTTP self-calls as default.
12. No dedicated `/rpc/workflows` mount exists by default.
13. TypeBox-only schema authoring is required for contract/procedure surfaces (no Zod-authored contract/procedure schemas).
14. Domain modules (`domain/*`) hold transport-independent domain concepts only.
15. Procedure input/output schemas live with owning procedures or boundary contracts, not in domain modules.
16. Domain filenames inside one `domain/` folder omit redundant domain-prefix tokens.
17. Naming defaults prefer concise, unambiguous domain identifiers for package/plugin directories and namespaces.
18. Shared context contracts live in `context.ts` (or equivalent dedicated context module).
19. Request/correlation/principal/network metadata contracts belong in context modules, not `domain/*`.
20. Docs helper default for object-root schemas is `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
21. For non-`Type.Object` roots, docs/snippets keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.
22. Spec docs/examples default to inline procedure/contract I/O schema declarations at `.input(...)` and `.output(...)` callsites.
23. Schema extraction is exception-only for shared schemas or large readability cases.
24. Extracted schema shape is paired as `{ input, output }`.
25. No second first-party trigger authoring path exists for the same workflow behavior.
26. No direct `inngest.send` from arbitrary boundary API modules when canonical workflow trigger routers exist.
27. Shared TypeBox adapter and OpenAPI converter helper usage is centralized.
28. Typed composition helpers are optional DX accelerators, not hidden runtime policy.
29. Context envelopes remain split by runtime model: oRPC boundary request context and Inngest function runtime context are distinct.
30. Middleware control planes remain split by runtime model: boundary enforcement in oRPC/Elysia, durable lifecycle control in Inngest middleware + `step.*`.
31. oRPC middleware dedupe assumptions stay explicit: use context-cached markers for heavy checks; built-in dedupe remains constrained to leading-subset/same-order chains.

## 4.1) Invariant Ownership Map
| Reference section in this file | Canonical owner |
| --- | --- |
| `2) Canonical Policy Snapshot (Reference Mirror)` | `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (`Locked Subsystem Policies`) and `orpc-ingest-spec-packet/DECISIONS.md` (D-005..D-010 state) |
| `2.1) Canonical Caller/Transport Matrix` | `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (`Caller/Auth Boundary Matrix`) |
| `4) Core Invariants Map (Reference Mirror)` | `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (`Cross-Cutting Defaults`) |
| `9.1) D-008 Integration Scope` | `orpc-ingest-spec-packet/DECISIONS.md` (`D-008`) and `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (`D-008 Integration Scope`) |

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
startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
  startInvoiceOperation(context, input),
);

return context.invoice.start(input);
```

### Flow B: External API -> Workflow Trigger -> Inngest Durable Execution
Intent: caller-triggered durable run.

```ts
await inngest.send({
  name: "invoice.reconciliation.requested",
  data: { runId: input.runId },
});

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
1. Initialize baseline `extendedTracesMiddleware()` before host composition work.
2. Compose one runtime-owned Inngest bundle (`client + functions`).
3. Compose one oRPC contract/router tree for boundary API surfaces.
4. Mount `/api/inngest` explicitly.
5. Mount `/api/workflows/*` with explicit workflow boundary context helpers and manifest-owned trigger routers.
6. Register oRPC routes (`/rpc`, `/api/orpc`) with parse-safe forwarding and injected context, keeping `/rpc` internal-only.

## 9) Routing, Ownership, and Caller Semantics Snapshot
- **Host/route spine:** Capability-first `/api/workflows/<capability>/*` remains caller-facing and `/api/inngest` remains runtime-only ingress.
- **Bootstrap order:** Hosts initialize baseline traces first, compose one runtime-owned Inngest bundle, mount `/api/inngest`, mount `/api/workflows/*`, then register `/rpc` + `/api/orpc/*`.
- **Internal transport:** `/rpc` is first-party/internal only; no dedicated `/rpc/workflows` mount is required by default.
- **Manifest composition:** `rawr.hq.ts` exposes canonical `orpc` and `workflows` namespaces plus the shared Inngest bundle; hosts mount `rawrHqManifest.workflows.triggerRouter` and `rawrHqManifest.inngest` explicitly.
- **Ownership split:** Workflow/API boundary contracts are plugin-owned; packages remain transport-neutral and own shared domain logic/domain schemas plus internal client/service layers only.
- **Caller-mode split:** First-party callers (including MFEs by default) use `RPCLink` on `/rpc`; external callers use published OpenAPI clients (`/api/orpc/*`, `/api/workflows/<capability>/*`); runtime ingress remains signed `/api/inngest`.
- **File structure:** Host wiring remains explicit in `apps/server/src/rawr.ts` and workflow context helpers; capability files remain under `packages/*` and `plugins/*`.

## 9.1) D-008 Integration Scope
- **Changes:** Baseline traces initialization order, single runtime-owned bundle ownership, and explicit mount/control-plane ordering are now locked.
- **Unchanged:** D-005 route split semantics, D-006 plugin boundary ownership, and D-007 caller transport/publication boundaries are unchanged.

## 10) Naming, Adoption, and Scale Governance (Global)
1. Canonical role names: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
2. Internal package layered defaults may include `domain/*`, `service/*`, `procedures/*`, `errors.ts`.
3. Within one `domain/` folder, filenames avoid repeating the domain token.
4. `domain/*` contains transport-independent domain concepts only; do not store procedure I/O ownership there.
5. Procedure input/output schemas belong next to procedures (internal package surfaces) or in boundary contracts (`contract.ts`) for API/workflow surfaces.
6. Request/correlation/principal/network metadata contracts belong in `context.ts` (or equivalent context module), not `domain/*`.
7. Package/plugin directory names prefer concise domain forms when clear.
8. Shared context contracts default to `context.ts` (or equivalent dedicated context module), and router modules consume that contract.
9. In policy docs, prefer `schema({...})` for object-root wrapper shorthand where `schema({...})` means `std(Type.Object({...}))`.
10. Keep `std(...)` (or `typeBoxStandardSchema(...)`) explicit for non-`Type.Object` roots.
11. Docs/examples default to inline procedure/contract I/O schemas at `.input(...)` and `.output(...)`.
12. Extraction is exception-only for shared or large readability cases, and extracted shape is paired as `{ input, output }`.
13. Adoption exception is allowed only for true 1:1 overlap between boundary and internal surface, and must be explicitly documented.
14. Scale rule: split handlers/operations first; split contracts only when behavior/policy/audience diverges.

## 11) Source Anchors
- Packet decisions: `orpc-ingest-spec-packet/DECISIONS.md`
- Packet examples: `orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`, `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- oRPC: [Contract-first define](https://orpc.dev/docs/contract-first/define-contract), [Implement](https://orpc.dev/docs/contract-first/implement-contract), [Procedure](https://orpc.dev/docs/procedure), [Context](https://orpc.dev/docs/context), [Middleware](https://orpc.dev/docs/middleware), [Dedupe middleware](https://orpc.dev/docs/best-practices/dedupe-middleware), [RPC handler](https://orpc.dev/docs/rpc-handler), [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler), [Server-side clients](https://orpc.dev/docs/client/server-side)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve), [Create function](https://www.inngest.com/docs/reference/functions/create), [Step run](https://www.inngest.com/docs/reference/functions/step-run), [Middleware lifecycle](https://www.inngest.com/docs/reference/middleware/lifecycle), [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
- Elysia: [Lifecycle](https://elysiajs.com/essential/life-cycle), [Mount](https://elysiajs.com/patterns/mount)
- TypeBox: [Repository/docs](https://github.com/sinclairzx81/typebox)

## 12) Navigation
- If you need one axis policy in implementation-ready depth, start in `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` and follow its axis map.
- If you need tutorial-style concrete implementations, read:
  - `orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
  - `orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
  - `orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- If you need “what moved where” from pre-breakout monolith, use `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`.
- If you identify a new architecture-impacting ambiguity, record it in `orpc-ingest-spec-packet/DECISIONS.md` before continuing.
