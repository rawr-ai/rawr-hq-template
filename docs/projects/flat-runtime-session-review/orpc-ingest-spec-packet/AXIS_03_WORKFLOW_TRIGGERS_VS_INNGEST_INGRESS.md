# Axis 03: Workflow Triggers vs Inngest Ingress

## Canonical Source
Extracted from:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Per-Axis Policy Axis 3 + Axis 8 + Axis 9, Hard Rules, Anti-Dual-Path Policy, Workflow Trigger Plugin Default)

## In Scope
- Split posture between caller-facing workflow triggers and durable execution ingress.
- Route-level boundary between oRPC trigger surfaces and `/api/inngest`.
- Durable endpoint additive-only policy.

## Out of Scope
- General boundary API plugin contract ownership (see [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)).
- Internal package layering and internal clients (see [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)).
- Host fixture implementation internals (see [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)).

## Policy
1. Split is canonical: API boundary and durability harness remain distinct.
2. Caller-triggered workflow APIs MUST be authored as oRPC workflow trigger procedures (for example `/api/workflows/<capability>/*`).
3. `/api/inngest` MUST remain Inngest runtime ingress only.
4. Durable execution functions MUST remain Inngest function definitions.
5. Durable endpoints MAY be used only as additive ingress adapters for non-overlapping needs.
6. Durable endpoints MUST NOT create a second first-party trigger authoring path for the same capability behavior.

## Canonical Workflow Plugin Shape
```text
plugins/workflows/<capability>-workflows/src/
  contract.ts
  operations/*
  router.ts
  functions/*
  durable/*   # optional additive adapters only
  index.ts
```

## Allowed vs Disallowed Paths
- Allowed:
  - oRPC trigger route -> workflow trigger operation -> `inngest.send` -> Inngest durable function.
  - internal package client path for synchronous in-process behavior.
- Disallowed:
  - parallel first-party trigger authoring paths for identical capability behavior.
  - treating `/api/inngest` as caller-facing trigger API surface.

## Anti-Dual-Path Clarification
Dual path is disallowed unless paths are truly non-overlapping by contract and runtime behavior.

Explicit allowed non-overlap:
1. `packages/<capability>/src/client.ts` internal client path for synchronous in-process calls.
2. Inngest event/function path for durable asynchronous orchestration.

## Cross-Axis Links
- Boundary API contract-first plugin posture: [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)
- Internal package defaults and transport neutrality: [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)
- Host mount ownership and split mount wiring: [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)
- Exception and scale governance: [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md)

## Implementation Checklist
1. Keep trigger routes in oRPC workflow trigger routers.
2. Keep durable function execution behind Inngest function definitions and `/api/inngest` ingress.
3. Use `durable/*` adapters only when ingress behavior is additive and non-overlapping.
4. Reject feature proposals that would create duplicate first-party trigger authoring paths.
