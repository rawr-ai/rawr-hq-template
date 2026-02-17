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

## Cross-Cutting Defaults
1. External SDK generation uses one composed oRPC/OpenAPI boundary surface.
2. Internal in-process cross-boundary calls default to package internal clients (`client.ts`), not local HTTP.
3. Caller-triggered workflow routes are oRPC workflow trigger routes; runtime durable ingress is `/api/inngest`.
4. TypeBox-first schema flow remains the baseline for contract I/O and OpenAPI conversion.
5. One runtime-owned Inngest bundle (`client + functions`) exists per process.

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

## Packet-Wide Rules
1. Each axis doc owns one policy slice; cross-axis docs reference owners rather than duplicating policy text.
2. Any new architecture-impacting ambiguity must be logged in [DECISIONS.md](./DECISIONS.md) before execution continues.
3. This packet must remain consistent with `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.

## Navigation Map (If You Need X, Read Y)
- External client generation and OpenAPI surface ownership -> [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Internal call defaults and package layering -> [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
- Why split is locked and anti-dual-path guardrails -> [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
- Request vs durable context envelopes and correlation propagation -> [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Error and observability contract by surface -> [AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md](./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md)
- Middleware placement by harness -> [AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md](./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md)
- Host composition spine, fixtures, and mount order -> [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
- Workflow trigger authoring vs durable execution authoring -> [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Durable endpoint additive-only constraints -> [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
- Section-by-section redistribution map from old monolith -> [REDISTRIBUTION_TRACEABILITY.md](./REDISTRIBUTION_TRACEABILITY.md)

## Decision Log
- Packet-local decisions: [DECISIONS.md](./DECISIONS.md)
