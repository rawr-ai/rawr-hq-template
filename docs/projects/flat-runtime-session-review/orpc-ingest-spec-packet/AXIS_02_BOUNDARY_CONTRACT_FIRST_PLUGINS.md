# Axis 02: Boundary Contract-First Plugins

## Canonical Source
Extracted from:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Per-Axis Policy Axis 1 + Axis 2, Hard Rules, Naming Rules, Boundary API Plugin Default)

## In Scope
- Boundary API plugin contract-first posture.
- External SDK/client-generation source policy.
- Boundary operation mapping defaults.

## Out of Scope
- Internal package layer internals (see [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)).
- Durable execution and Inngest ingress semantics (see [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)).
- Host composition and mounting details (see [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)).

## Policy
1. External SDK/client generation MUST come from one composed boundary oRPC/OpenAPI surface.
2. Package-internal contracts MUST NOT be used for external SDK generation.
3. Boundary plugins default to contract-first with explicit boundary operations.
4. Boundary handlers SHOULD NOT directly call `inngest.send` unless they are designated workflow trigger routers.
5. TypeBox-first schema flow for oRPC contract I/O and OpenAPI conversion path MUST be preserved.

## Canonical Boundary API Plugin Shape
```text
plugins/api/<capability>-api/src/
  contract.ts
  operations/*
  router.ts
  index.ts
```

## Boundary Role Responsibilities
- `contract.ts`: caller-facing boundary contract ownership.
- `operations/*`: explicit boundary behavior mapping.
- `router.ts`: `implement(contract)` and handler bindings.
- `index.ts`: composed surface export for composition root usage.

## Naming Defaults (Inherited)
Canonical role names for boundary plugins:
- `contract.ts`, `router.ts`, `operations/*`, `index.ts`

## Cross-Axis Links
- Internal package client and layering defaults: [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)
- Workflow-trigger routers that are allowed to call `inngest.send`: [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)
- Shared schema adapter/composition fixtures: [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)
- Exception and scale governance: [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md)

## Implementation Checklist
1. Boundary contracts stay owned in plugin `contract.ts`.
2. OpenAPI generation path stays anchored to the composed boundary router surface.
3. Boundary router behavior delegates to explicit operations.
4. Non-workflow boundary modules do not become ad hoc durable-trigger callers.
