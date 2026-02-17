# Axis 01: Internal Package Layering

## Canonical Source
Extracted from:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Per-Axis Policy Axis 2, Naming Rules, Hard Rules, Canonical File Inventory, Internal Package Default)

## In Scope
- Internal package default structure and layer responsibilities.
- Internal in-process calling defaults.
- Transport-neutral package constraints.

## Out of Scope
- Boundary API plugin contract ownership (see [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)).
- Workflow trigger and `/api/inngest` ingress semantics (see [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)).
- Host mount wiring (see [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)).

## Policy
1. Default internal cross-boundary calls MUST use capability in-process internal clients at `packages/<capability>/src/client.ts`.
2. Server runtime code MUST NOT self-call local HTTP (`/rpc`, `/api/orpc`) for in-process calls.
3. Domain packages MUST remain transport-neutral (no host mounts, no Inngest serve ingress definitions inside domain package internals).

## Canonical Internal Package Shape
```text
packages/<capability>/src/
  domain/*
  service/*
  procedures/*
  router.ts
  client.ts
  errors.ts
  index.ts
```

## Layer Responsibilities
- `domain/*`: entities/value objects and invariants only.
- `service/*`: pure use-case logic with injected dependencies.
- `procedures/*`: internal procedure boundary (schema + handler composition).
- `router.ts`: package-level internal router composition.
- `client.ts`: default internal invocation path.
- `errors.ts`: package-level typed errors.
- `index.ts`: explicit package public surface.

## Naming Defaults (Inherited)
Canonical role names for this axis:
- `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`
- Internal package layered defaults MAY also include `domain/*`, `service/*`, `procedures/*`, `errors.ts`.

## Cross-Axis Links
- Boundary plugin contracts and external generation source policy: [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)
- Workflow trigger routers and durable execution split: [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)
- Composition spine and host fixtures: [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)
- Exception and scale guardrails: [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md)

## Implementation Checklist
1. New capability packages follow the canonical shape unless a documented exception exists in [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md).
2. In-process server calls route through package internal clients, not local HTTP endpoints.
3. Any transport adapter logic remains outside package domain/service internals.
