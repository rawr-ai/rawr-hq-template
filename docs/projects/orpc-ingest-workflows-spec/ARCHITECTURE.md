# ORPC + Inngest Workflows Architecture (ORPC + Inngest Workflows)

## Document Role
This file is the canonical integrative architecture authority for ORPC + Inngest workflows.

Normative leaf policy depth remains in:
- `axes/01-external-client-generation.md`
- `axes/02-internal-clients.md`
- `axes/03-split-vs-collapse.md`
- `axes/04-context-propagation.md`
- `axes/05-errors-observability.md`
- `axes/06-middleware.md`
- `axes/07-host-composition.md`
- `axes/08-workflow-api-boundaries.md`
- `axes/09-durable-endpoints.md`
- `axes/10-legacy-metadata-and-lifecycle-simplification.md`
- `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
- `axes/12-testing-harness-and-verification-strategy.md`
- `axes/13-distribution-and-instance-lifecycle-model.md`

Reference walkthrough depth remains in:
- `examples/e2e-01-basic-package-api.md`
- `examples/e2e-02-api-workflows-composed.md`
- `examples/e2e-03-microfrontend-integration.md`
- `examples/e2e-04-context-middleware.md`

Implementation-adjacent downstream update contract remains in:
- `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

Concern-based expansion navigation remains in:
- `CANONICAL_EXPANSION_NAV.md`

Decision authority is in `DECISIONS.md`.

## 1) Scope
This subsystem posture defines how this system composes:
1. oRPC boundary APIs,
2. workflow trigger APIs,
3. Inngest durable execution,
4. optional Durable Endpoint ingress adapters,
under TypeBox + oRPC + Elysia + Inngest.

This is a policy/spec artifact. It is not a migration checklist.

## 2) Locked Subsystem Policies
1. API boundary and durable execution remain split.
2. oRPC is the primary boundary API harness.
3. Inngest functions are the primary durability harness.
4. Durable endpoints are additive ingress adapters only.
5. Workflow trigger surfaces are manifest-driven and capability-first (`/api/workflows/<capability>/*`) via `rawr.hq.ts`, with explicit workflow context helpers and one runtime-owned Inngest bundle.
6. Workflow/API boundary contracts are plugin-owned (`plugins/workflows/<capability>/src/contract.ts`, `plugins/api/<capability>/src/contract.ts`); packages own shared domain logic/domain schemas only, and workflow trigger/status I/O schemas remain workflow boundary owned.
7. Caller-mode transport semantics are fixed: first-party callers (including MFEs by default) use `RPCLink` on `/rpc` unless an explicit exception is documented; external/third-party callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; server-internal callers use in-process package clients; `/api/inngest` is signed runtime ingress only.
8. Host bootstrap initializes baseline `extendedTracesMiddleware()` before Inngest client/function composition or route registration, and host mount/control-plane ordering remains explicit (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`).
9. Plugin middleware may extend baseline instrumentation context but may not replace or reorder the baseline traces middleware.
10. Runtime composition semantics are minimal and manifest-owned: runtime behavior is derived from plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`; legacy fields (`templateRole`, `channel`, `publishTier`, `published`) do not drive runtime behavior.
11. Distribution posture is explicit: upstream template remains engineering truth; default consumer path is instance-kit/no-fork-repeatability; long-lived fork is maintainer-only by default; no singleton-global assumptions are introduced and alias/instance seams are contract-required now (full UX/packaging mechanics deferred).
12. These policies define canonical target-state behavior independent of implementation sequencing.

> D-005 lock: workflow trigger APIs are caller-facing on manifest-driven `/api/workflows/<capability>/*`; `/rpc` remains first-party/internal transport only, and `/api/inngest` remains signed runtime ingress only.
>
> D-013 lock: runtime metadata semantics are reduced to canonical manifest composition keys (`rawr.kind`, `rawr.capability`, surface root + `rawr.hq.ts` registration). Legacy metadata fields are non-runtime.
>
> D-016 lock: default consumer distribution is instance-kit/no-fork-repeatability, long-lived fork posture is maintainer-only by default, and multi-owner safety is enforced now via alias/instance seam contracts without adding singleton-global assumptions.

## 2.1) Canonical Caller/Auth Matrix
This is the canonical caller/auth matrix source. Any matrix renderings in axis/example docs are contextual views.

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

## 4) Global Invariants (Subsystem-Wide)
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
32. Runtime composition decisions are derived from plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`.
33. `templateRole` and `channel` have no runtime semantics and do not influence runtime composition behavior.
34. `publishTier` and `published` may be retained as release/distribution metadata but do not influence runtime composition behavior.
35. Downstream docs/runbook/testing artifacts are required to align with this metadata contract (`manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`) even when those artifacts live outside this packet.
36. `RAWR HQ-Template` remains upstream engineering truth; consumer distribution defaults to instance-kit/no-fork-repeatability.
37. Long-lived fork posture is a maintainer path and not the default consumer lifecycle path.
38. Manifest-first composition authority remains `rawr.hq.ts`; distribution/lifecycle choices do not introduce alternate runtime authorities.
39. No new singleton-global assumptions are introduced for runtime composition or lifecycle behavior.
40. Alias/instance seam is required now by contract; full UX/packaging mechanics remain deferred and centralized in axis 13.

## 5) Cross-Cutting Defaults
1. External SDK generation uses one composed oRPC/OpenAPI boundary surface.
2. Internal in-process cross-boundary calls default to package internal clients (`client.ts`), not local HTTP.
3. Caller-triggered workflow routes are oRPC workflow trigger routes on `/api/workflows/<capability>/*`; runtime durable ingress is `/api/inngest`.
4. Workflow routing is manifest-driven and capability-first; capability routes come from `rawrHqManifest.workflows.triggerRouter`, the same manifest supplies `rawrHqManifest.inngest`, and workflow boundary context helpers keep `/api/workflows/<capability>/*` caller-facing while `/api/inngest` stays runtime-only.
5. Workflow/API boundary contract ownership remains in plugins; packages do not own caller-facing boundary contracts or workflow trigger/status I/O schemas.
6. Caller-mode client semantics are fixed: first-party callers (including MFEs by default) use `RPCLink` on `/rpc` unless an explicit exception is documented; external/third-party callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; server-internal callers use package internal clients; runtime ingress uses signed `/api/inngest` only.
7. TypeBox-only schema authoring is required for contract/procedure surfaces (no Zod-authored contract/procedure schemas); TypeBox remains the baseline for contract I/O and OpenAPI conversion.
8. One runtime-owned Inngest bundle (`client + functions`) exists per process.
9. Host bootstrap initializes `extendedTracesMiddleware()` before building the Inngest bundle and before mounting route families.
10. Mount/control-plane order is explicit: `/api/inngest`, then `/api/workflows/*`, then `/rpc` and `/api/orpc/*`.
11. Plugin-added Inngest middleware extends baseline instrumentation context but does not replace/reorder baseline traces middleware.
12. Domain modules (`domain/*`) hold transport-independent domain concepts only (entities/value objects/invariants/state shapes).
13. Procedure input/output schemas are co-located with procedures (internal package surfaces) or boundary contracts (`contract.ts`) for API/workflow surfaces.
14. Domain filenames within one `domain/` folder avoid redundant domain-prefix tokens.
15. Package/plugin directory naming prefers concise, unambiguous domain names (for example `packages/invoicing`, `plugins/api/invoicing`, `plugins/workflows/invoicing`).
16. Shared context contracts default to explicit `context.ts` modules (or equivalent dedicated context modules), consumed by routers instead of being re-declared inline in router snippets.
17. Request/correlation/principal/network metadata contracts are context-layer concerns and belong in `context.ts` (or equivalent context module), not `domain/*`.
18. Docs helper default for object-root schema wrapping is `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
19. For non-`Type.Object` roots, packet docs/snippets should keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.
20. Packet docs/examples default to inline procedure/contract I/O schema declarations at `.input(...)` and `.output(...)`.
21. Schema extraction is exception-only, for shared schemas or large schemas where inline form materially harms readability.
22. When extraction is used, canonical shape is a paired object with `.input` and `.output` properties (for example `TriggerInvoiceReconciliationSchema.input` and `.output`).
23. Context modeling keeps two envelopes by design: oRPC boundary request context and Inngest runtime function context; packet policy rejects a forced universal context object.
24. Middleware policy keeps two control planes by design: boundary controls in oRPC/Elysia and durable lifecycle controls in Inngest middleware + `step.*`.
25. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe is constrained to leading-subset/same-order middleware chains.
26. Runtime metadata semantics are minimal: runtime behavior is derived from plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`.
27. Legacy metadata fields (`templateRole`, `channel`, `publishTier`, `published`) are non-runtime and do not alter host mount, caller-mode, or durability behavior.
28. Downstream conformance checks include `manifest-smoke`, `metadata-contract` (`rawr.kind` + `rawr.capability` required), `import-boundary`, and `host-composition-guard`.
29. Default consumer distribution remains instance-kit/no-fork-repeatability; long-lived fork posture is maintainer-only by default.
30. Multi-owner safety requires alias/instance seams now and forbids introducing singleton-global assumptions in runtime composition.
31. Distribution/lifecycle defer-later details are centralized in `axes/13-distribution-and-instance-lifecycle-model.md` to avoid policy scatter.

## 6) Composition Spine (Cross-Axis Contract)
1. Initialize baseline `extendedTracesMiddleware()` before host composition work.
2. Compose one runtime-owned Inngest bundle (`client + functions`).
3. Compose one oRPC contract/router tree for boundary API surfaces.
4. Mount `/api/inngest` explicitly.
5. Mount `/api/workflows/*` with explicit workflow boundary context helpers and manifest-owned trigger routers.
6. Register oRPC routes (`/rpc`, `/api/orpc`) with parse-safe forwarding and injected context, keeping `/rpc` internal-only.

## 7) Integrative Topology (Cross-Axis)
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

Topology note: `operations/*` is the canonical default organization for boundary mapping logic, but direct boundary procedure exports in `router.ts` are valid for small/local handlers when ownership and route semantics remain unchanged.

## 8) Integrative Interaction Flows

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

## 9) Routing, Ownership, and Caller Semantics Snapshot
- **Host/route spine:** Capability-first `/api/workflows/<capability>/*` remains caller-facing and `/api/inngest` remains runtime-only ingress.
- **Bootstrap order:** Hosts initialize baseline traces first, compose one runtime-owned Inngest bundle, mount `/api/inngest`, mount `/api/workflows/*`, then register `/rpc` + `/api/orpc/*`.
- **Internal transport:** `/rpc` is first-party/internal only; no dedicated `/rpc/workflows` mount is required by default.
- **Manifest composition:** `rawr.hq.ts` exposes canonical `orpc` and `workflows` namespaces plus the shared Inngest bundle; hosts mount `rawrHqManifest.workflows.triggerRouter` and `rawrHqManifest.inngest` explicitly.
- **Ownership split:** Workflow/API boundary contracts are plugin-owned; packages remain transport-neutral and own shared domain logic/domain schemas plus internal client/service layers only.
- **Caller-mode split:** First-party callers (including MFEs by default) use `RPCLink` on `/rpc`; external callers use published OpenAPI clients (`/api/orpc/*`, `/api/workflows/<capability>/*`); runtime ingress remains signed `/api/inngest`.
- **File structure:** Host wiring remains explicit in `apps/server/src/rawr.ts` and workflow context helpers; capability files remain under `packages/*` and `plugins/*`.

## 10) Legacy Metadata + Distribution/Instance Lifecycle Snapshot (D-013, D-016)
- **What changes:**
  - `templateRole` and `channel` are removed from runtime semantics.
  - `publishTier` and `published` are retained only as release/distribution metadata and do not drive runtime behavior.
  - Runtime behavior derivation is constrained to plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`.
  - Default consumer distribution posture is locked to instance-kit/no-fork-repeatability; long-lived fork posture is maintainer-only by default.
  - Multi-owner invariant is explicit now: alias/instance seam is required now and no singleton-global assumptions are allowed.
- **What stays unchanged:**
  - D-005..D-015 route/ownership/caller/context/middleware/schema/testing semantics remain unchanged.
  - Split route model stays fixed: caller-facing routes remain `/rpc` and `/api/workflows/<capability>/*`; runtime ingress remains `/api/inngest`.
  - Plugin-owned boundary contract model remains unchanged.
- **Policy obligations (external artifact updates required, but not edited here):**
  - Docs/process/runbook artifacts must remove legacy metadata runtime claims.
  - Testing/lint gates must include `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard`.
  - Lifecycle/status tooling must operate by `rawr.kind` + `rawr.capability` on manifest-owned surfaces.
  - Do-now vs defer-later distribution/lifecycle details stay centralized in `axes/13-distribution-and-instance-lifecycle-model.md`.

## 11) Axis Coverage Map
| Axis | Policy surface | Canonical leaf spec |
| --- | --- | --- |
| 1 | External client generation | `axes/01-external-client-generation.md` |
| 2 | Internal clients/internal calling | `axes/02-internal-clients.md` |
| 3 | Split vs collapse posture | `axes/03-split-vs-collapse.md` |
| 4 | Context creation/propagation | `axes/04-context-propagation.md` |
| 5 | Errors/logging/observability | `axes/05-errors-observability.md` |
| 6 | Middleware/cross-cutting concerns | `axes/06-middleware.md` |
| 7 | Host hooking/composition | `axes/07-host-composition.md` |
| 8 | Workflows vs APIs boundaries | `axes/08-workflow-api-boundaries.md` |
| 9 | Durable endpoints vs durable functions | `axes/09-durable-endpoints.md` |
| 10 | Legacy metadata + lifecycle simplification | `axes/10-legacy-metadata-and-lifecycle-simplification.md` |
| 11 | Core infrastructure packaging + composition guarantees | `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` |
| 12 | Testing harness + verification strategy | `axes/12-testing-harness-and-verification-strategy.md` |
| 13 | Distribution default + instance lifecycle model | `axes/13-distribution-and-instance-lifecycle-model.md` |

## 12) Navigation Map (If You Need X, Read Y)
- External client generation and OpenAPI surface ownership -> `axes/01-external-client-generation.md`
- Internal call defaults and package layering -> `axes/02-internal-clients.md`
- Why split is locked and anti-dual-path guardrails -> `axes/03-split-vs-collapse.md`
- Request vs durable context envelopes and correlation propagation -> `axes/04-context-propagation.md`
- Error and observability contract by surface -> `axes/05-errors-observability.md`
- Middleware placement by harness -> `axes/06-middleware.md`
- Real-world context and middleware interplay (including dedupe caveats) -> `examples/e2e-04-context-middleware.md`
- Host composition spine, fixtures, and mount order -> `axes/07-host-composition.md`
- Workflow trigger authoring vs durable execution authoring -> `axes/08-workflow-api-boundaries.md`
- Durable endpoint additive-only constraints -> `axes/09-durable-endpoints.md`
- Legacy metadata runtime simplification and lifecycle obligations -> `axes/10-legacy-metadata-and-lifecycle-simplification.md`
- Core infrastructure seam ownership and import-direction guarantees (D-014 locked concern) -> `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
- Canonical testing harness matrix and verification-layer boundaries (D-015 locked concern) -> `axes/12-testing-harness-and-verification-strategy.md`
- Distribution default and instance-lifecycle do-now/defer boundary (D-016 locked concern) -> `axes/13-distribution-and-instance-lifecycle-model.md`
- Downstream docs/runbook/testing update execution contract (implementation-adjacent, non-policy-authority) -> `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
- Micro-frontend caller-mode walkthrough -> `examples/e2e-03-microfrontend-integration.md`
- Expansion concern index (D-013/D-014/D-015/D-016 quick routing) -> `CANONICAL_EXPANSION_NAV.md`
- Section-by-section redistribution map from old monolith -> `../_archive/orpc-ingest-workflows-spec/session-lineage-from-ongoing/redistribution-traceability.md`

## 13) Source Anchors
- Decision register: `DECISIONS.md`
- Packet router/authority index: `README.md`
- Implementation-adjacent update contract: `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

## 14) No-Drift Note
This document is a clarity/structure consolidation. Locked policy meaning is preserved from the canonical posture + packet sources.

## Appendix: Source-Parity Snippets (No-Drift Gate)

### Caller/Auth Boundary Matrix (verbatim source YAML)
```yaml
caller_modes:
  - caller: first_party_mfe_default
    client: rpc_link_on_rpc
    auth: first_party_boundary_session_auth
    routes:
      - /rpc
    forbidden:
      - /api/inngest

  - caller: external_or_third_party_consumer
    client: published_openapi_clients
    auth: boundary_auth_session_token
    routes:
      - /api/orpc/*
      - /api/workflows/<capability>/*
    forbidden:
      - /rpc
      - /api/inngest

  - caller: server_internal_consumer
    client: package_internal_client
    auth: trusted_service_context
    routes:
      - in_process_only
    forbidden:
      - local_http_self_calls_as_default

  - caller: runtime_ingress
    client: inngest_runtime_bundle
    auth: signed_runtime_ingress
    routes:
      - /api/inngest
    forbidden:
      - browser_access
```

### Packet Interaction Model (verbatim source text)
```text
Caller
  -> oRPC boundary procedure
      -> boundary operation
          -> package internal client/service
              -> immediate response

Caller
  -> oRPC workflow trigger procedure
      -> trigger operation (inngest.send)
          -> Inngest durable function (step.run)
              -> run/timeline lifecycle state
```
