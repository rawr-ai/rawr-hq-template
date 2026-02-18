# ORPC + Inngest Spec Packet (Self-Contained Entry)

## In Scope
- Canonical leaf-spec packet for ORPC boundary APIs, workflow trigger APIs, Inngest durable execution, and host composition.
- Axis-by-axis normative policy coverage with implementation-ready snippets.
- Cross-axis interaction guidance needed to ship changes without semantic drift.
- Canonical policy for workflow routing, boundary ownership, and caller/auth semantics.

## Out of Scope
- Runtime code changes.
- Platform migration planning beyond what is encoded in posture policy.
- Replacing the integrative overview role of `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.

## Packet Role
This packet is the canonical leaf-level spec set.

This packet is self-contained for policy decisions, caller/auth semantics, and ownership boundaries. The parent overview (`../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`) provides subsystem-level orientation.

## Locked Subsystem Policies
1. API boundary and durable execution remain split.
2. oRPC is the primary boundary API harness.
3. Inngest functions are the primary durability harness.
4. Durable endpoints are additive ingress adapters only.
5. Workflow trigger surfaces are manifest-driven and capability-first (`/api/workflows/<capability>/*`) via `rawr.hq.ts`, with explicit workflow context helpers and one runtime-owned Inngest bundle.
6. Workflow/API boundary contracts are plugin-owned (`plugins/workflows/<capability>/src/contract.ts`, `plugins/api/<capability>/src/contract.ts`); packages own shared domain logic/domain schemas only, and workflow trigger/status I/O schemas remain workflow boundary owned.
7. Browser/network callers use composed boundary clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; server-internal callers use in-process package clients; `/api/inngest` is signed runtime ingress only.
8. These policies define canonical target-state behavior independent of implementation sequencing.

> D-005 lock: workflow trigger APIs are caller-facing on manifest-driven `/api/workflows/<capability>/*`; `/rpc` remains first-party/internal transport only, and `/api/inngest` remains signed runtime ingress only.

## Caller/Auth Boundary Matrix
```yaml
caller_modes:
  - caller: browser_mfe_or_network_consumer
    client: composed_boundary_clients
    auth: boundary_auth_session_token
    routes:
      - /api/orpc/*
      - /api/workflows/<capability>/*
    forbidden:
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

## Axis Coverage (Complete)
1. [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
2. [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
3. [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
4. [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
5. [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
6. [AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md](./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md)
7. [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
8. [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
9. [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)

## End-to-End Walkthroughs (Tutorial Layer)
These are implementation-oriented walkthroughs that apply axis policies in concrete flows.

1. [E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md](./examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md)
2. [E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md](./examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md)
3. [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
4. [E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md](./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md)

Tutorial docs are normative only where they reference locked axis policies. If a walkthrough surfaces ambiguity, record it in [DECISIONS.md](./DECISIONS.md).

## Cross-Cutting Defaults
1. External SDK generation uses one composed oRPC/OpenAPI boundary surface.
2. Internal in-process cross-boundary calls default to package internal clients (`client.ts`), not local HTTP.
3. Caller-triggered workflow routes are oRPC workflow trigger routes on `/api/workflows/<capability>/*`; runtime durable ingress is `/api/inngest`.
4. Workflow routing is manifest-driven and capability-first; capability routes come from `rawrHqManifest.workflows.triggerRouter`, the same manifest supplies `rawrHqManifest.inngest`, and workflow boundary context helpers keep `/api/workflows/<capability>/*` caller-facing while `/api/inngest` stays runtime-only.
5. Workflow/API boundary contract ownership remains in plugins; packages do not own caller-facing boundary contracts or workflow trigger/status I/O schemas.
6. Caller-mode client semantics are fixed: browser/network callers use composed boundary clients; server-internal callers use package internal clients; runtime ingress uses signed `/api/inngest` only.
7. TypeBox-only schema authoring is required for contract/procedure surfaces (no Zod-authored contract/procedure schemas); TypeBox remains the baseline for contract I/O and OpenAPI conversion.
8. One runtime-owned Inngest bundle (`client + functions`) exists per process.
9. Domain modules (`domain/*`) hold transport-independent domain concepts only (entities/value objects/invariants/state shapes).
10. Procedure input/output schemas are co-located with procedures (internal package surfaces) or boundary contracts (`contract.ts`) for API/workflow surfaces.
11. Domain filenames within one `domain/` folder avoid redundant domain-prefix tokens.
12. Package/plugin directory naming prefers concise, unambiguous domain names (for example `packages/invoicing`, `plugins/api/invoicing`, `plugins/workflows/invoicing`).
13. Shared context contracts default to explicit `context.ts` modules (or equivalent dedicated context modules), consumed by routers instead of being re-declared inline in router snippets.
14. Request/correlation/principal/network metadata contracts are context-layer concerns and belong in `context.ts` (or equivalent context module), not `domain/*`.
15. Docs helper default for object-root schema wrapping is `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
16. For non-`Type.Object` roots, packet docs/snippets should keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.
17. Packet docs/examples default to inline procedure/contract I/O schema declarations at `.input(...)` and `.output(...)`.
18. Schema extraction is exception-only, for shared schemas or large schemas where inline form materially harms readability.
19. When extraction is used, canonical shape is a paired object with `.input` and `.output` properties (for example `TriggerInvoiceReconciliationSchema.input` and `.output`).
20. Context modeling keeps two envelopes by design: oRPC boundary request context and Inngest runtime function context; packet policy rejects a forced universal context object.
21. Middleware policy keeps two control planes by design: boundary controls in oRPC/Elysia and durable lifecycle controls in Inngest middleware + `step.*`.
22. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe is constrained to leading-subset/same-order middleware chains.

## Packet Interaction Model
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

## Canonical Ownership Split
- Package layer owns domain/service/procedures/internal router/client/errors/index.
- API plugins own caller-facing contracts, boundary operations, and boundary routers.
- Workflow plugins own trigger contracts/operations/routers and durable functions.
- Host layer owns composition spine and explicit route mounting.
- Naming defaults favor concise domain identifiers over longer redundant forms when semantics stay clear.

## Packet-Wide Rules
1. Each axis doc owns one policy slice; cross-axis docs reference owners rather than duplicating policy text.
2. Any new architecture-impacting ambiguity must be logged in [DECISIONS.md](./DECISIONS.md) before execution continues.
3. This packet must remain consistent with `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.
4. Packet examples SHOULD follow the domain naming defaults used in walkthroughs (`invoicing`-style concise capability tokens when clear).
5. Packet snippets SHOULD keep context placement explicit (`context.ts`) and avoid convenience overloading of context contracts inside router snippets.
6. Packet snippets MUST keep procedure input/output schemas with procedures or boundary contracts, and MUST NOT model procedure I/O ownership in `domain/*`.
7. Packet snippets MUST default to inline procedure/contract I/O schema declarations, and SHOULD extract only for shared/large readability cases.
8. Extracted packet snippet I/O schemas SHOULD use paired-object shape `{ input, output }` instead of separate top-level `*InputSchema` / `*OutputSchema` constants.
9. Packet snippets MUST keep contract/procedure schema authoring TypeBox-only; do not introduce Zod-authored contract/procedure snippets.

## Navigation Map (If You Need X, Read Y)
- External client generation and OpenAPI surface ownership -> [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Internal call defaults and package layering -> [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
- Why split is locked and anti-dual-path guardrails -> [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Request vs durable context envelopes and correlation propagation -> [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Error and observability contract by surface -> [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
- Middleware placement by harness -> [AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md](./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md)
- Real-world context and middleware interplay (including dedupe caveats) -> [E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md](./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md)
- Host composition spine, fixtures, and mount order -> [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
- Workflow trigger authoring vs durable execution authoring -> [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Durable endpoint additive-only constraints -> [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
- Micro-frontend caller-mode walkthrough -> [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
- Section-by-section redistribution map from old monolith -> [REDISTRIBUTION_TRACEABILITY.md](./REDISTRIBUTION_TRACEABILITY.md)

## Decision Log
- Packet-local decisions: [DECISIONS.md](./DECISIONS.md)
