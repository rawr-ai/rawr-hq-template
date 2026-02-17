# ORPC + Inngest Spec Packet (Self-Contained Entry)

## In Scope
- Canonical leaf-spec packet for ORPC boundary APIs, workflow trigger APIs, Inngest durable execution, and host composition.
- Axis-by-axis normative policy coverage with implementation-ready snippets.
- Cross-axis interaction guidance needed to ship changes without semantic drift.

## Out of Scope
- Runtime code changes.
- Platform migration planning beyond what is already encoded in posture policy.
- Replacing the integrative overview role of `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.

## Packet Role
This packet is the canonical leaf-level spec set.

The parent overview (`../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`) provides subsystem synthesis; this packet provides axis-owned implementation policy depth.

## Locked Subsystem Decisions (Inherited)
1. API boundary and durable execution remain split.
2. oRPC is the primary boundary API harness.
3. Inngest functions are the primary durability harness.
4. Durable endpoints are additive ingress adapters only.
5. D-005: Workflow trigger + manifest-driven workflow surfaces operate via capability-first `/api/workflows/<capability>/*` mounts sourced from `rawr.hq.ts`, with an explicit workflow context helper and single Inngest bundle (see `SESSION_019c587a_D005_HOSTING_COMPOSITION_COHESIVE_RECOMMENDATION.md`).

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
These are implementation-oriented walkthroughs that apply the axis policies in concrete flows.

1. [E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md](./examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md)
2. [E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md](./examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md)
3. [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
4. [E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md](./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md)

Tutorial docs are normative only where they reference locked axis policies. If a walkthrough surfaces ambiguity, the ambiguity must be tracked in [DECISIONS.md](./DECISIONS.md) before further drift occurs.

## Cross-Cutting Defaults
1. External SDK generation uses one composed oRPC/OpenAPI boundary surface.
2. Internal in-process cross-boundary calls default to package internal clients (`client.ts`), not local HTTP.
3. Caller-triggered workflow routes are oRPC workflow trigger routes on `/api/workflows/*`; runtime durable ingress is `/api/inngest`.
4. TypeBox-only schema authoring is required for contract/procedure surfaces (no Zod-authored contract/procedure schemas); TypeBox remains the baseline for contract I/O and OpenAPI conversion.
5. One runtime-owned Inngest bundle (`client + functions`) exists per process.
6. Domain modules (`domain/*`) hold transport-independent domain concepts only (entities/value objects/invariants/state shapes).
7. Procedure input/output schemas are co-located with procedures (internal package surfaces) or boundary contracts (`contract.ts`) for API/workflow surfaces.
8. Domain filenames within one `domain/` folder avoid redundant domain-prefix tokens.
9. Package/plugin directory naming prefers concise, unambiguous domain names (for example `packages/invoicing`, `plugins/api/invoicing`, `plugins/workflows/invoicing`).
10. Shared context contracts default to explicit `context.ts` modules (or equivalent dedicated context modules), consumed by routers instead of being re-declared inline in router snippets.
11. Request/correlation/principal/network metadata contracts are context-layer concerns and belong in `context.ts` (or equivalent context module), not `domain/*`.
12. Docs helper default for object-root schema wrapping is `schema({...})`, where `schema({...})` means `std(Type.Object({...}))`.
13. For non-`Type.Object` roots, packet docs/snippets should keep explicit `std(...)` (or `typeBoxStandardSchema(...)`) wrapping.
14. Packet docs/examples default to inline procedure/contract I/O schema declarations at `.input(...)` and `.output(...)`.
15. Schema extraction is exception-only, for shared schemas or large schemas where inline form materially harms readability.
16. When extraction is used, canonical shape is a paired object with `.input` and `.output` properties (for example `TriggerInvoiceReconciliationSchema.input` and `.output`).
17. Context modeling keeps two envelopes by design: oRPC boundary request context and Inngest runtime function context; packet policy rejects a forced universal context object.
18. Middleware policy keeps two control planes by design: boundary controls in oRPC/Elysia and durable lifecycle controls in Inngest middleware + `step.*`.
19. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe is constrained to leading-subset/same-order middleware chains.

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
- Full walkthroughs by scenario -> [examples/](./examples/)
- Section-by-section redistribution map from old monolith -> [REDISTRIBUTION_TRACEABILITY.md](./REDISTRIBUTION_TRACEABILITY.md)

## Decision Log
- Packet-local decisions: [DECISIONS.md](./DECISIONS.md)
