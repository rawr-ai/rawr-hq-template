# SESSION_019c587a D-006 + D-007 Authority Decision Packet

## Scope
This packet locks D-006 and D-007 with the corrected ownership and client model, while keeping D-005 split semantics unchanged.

## Locked Non-Negotiables
1. Plugin/package authoring must not require routine edits in `apps/*`.
2. Plugin runtime layers must not directly depend on other plugin runtime layers.
3. D-005 split remains fixed:
   - caller-facing: `/api/workflows/<capability>/*`
   - runtime-only ingress: `/api/inngest`

## D-006 (Closed): Boundary Contract Ownership
**Decision:** Boundary contracts are plugin-owned.

- API boundary contracts live in `plugins/api/<capability>/src/contract.ts`.
- Workflow boundary contracts live in `plugins/workflows/<capability>/src/contract.ts`.
- Packages own shared domain schemas/domain logic, not canonical boundary contracts.
- Workflow trigger/status I/O schemas are owned at workflow plugin boundary contracts (`plugins/workflows/<capability>/src/contract.ts`) and stay out of shared packages unless they are truly cross-boundary domain schemas.
- Manifest composition consumes plugin boundary contracts/routers and emits host-facing composition outputs.

### Why this closes D-006
- Preserves original boundary principle.
- Keeps package layer pure and reusable.
- Avoids boundary semantic drift between package and plugin layers.

## D-007 (Closed): Client Usage Strategy
**Decision:** Client mode depends on caller context.

```yaml
client_modes:
  - caller: browser_mfe_or_network_consumer
    use: composed boundary clients from manifest-composed plugin contracts
    routes:
      - /api/orpc/*
      - /api/workflows/<capability>/*
    must_not_use:
      - /api/inngest

  - caller: server_internal_consumer
    use: package internal in-process clients
    routes:
      - in_process_only
    default_rule: do_not_self_call_local_http

  - caller: runtime_ingress
    use: inngest_runtime_bundle
    routes:
      - /api/inngest
    access: signed_runtime_only
```

### Why this closes D-007
- Clarifies auth and execution semantics by caller type.
- Prevents browser/runtime boundary collapse.
- Preserves ergonomics for both MFE and server-internal consumers.

## What Changes
1. Policy language now explicitly states plugin-owned boundary contracts.
2. Auth/client semantics are documented as a three-mode matrix.
3. Composition language is clarified: manifest composes plugin boundary surfaces, packages contribute shared schema/logic inputs.

## What Stays Unchanged
1. D-005 split and host mount posture.
2. Existing `/rpc*` and `/api/orpc*` host wiring model.
3. Package internal client server-only in-process default.

## Alternatives Rejected
```yaml
alternatives_rejected:
  - package_owned_boundary_contracts:
      reason: conflicts with boundary ownership principle and blurs package/plugin responsibilities
  - browser_calls_runtime_ingress:
      reason: violates split semantics and runtime security boundary
  - plugin_to_plugin_runtime_imports:
      reason: increases coupling and creates dependency-direction drift
```

## Close-Ready DECISIONS.md Wording
```yaml
d006:
  status: closed
  resolution: >-
    Workflow/API boundary contracts are plugin-owned. Packages own shared domain logic
    and domain schemas only; workflow trigger/status I/O schemas are boundary-owned
    in workflow plugin contracts and are the canonical source for boundary composition.
  closure_scope: spec-policy lock

d007:
  status: closed
  resolution: >-
    Browser/network callers use composed boundary clients for /api/orpc/* and
    /api/workflows/<capability>/*. Server-internal callers use in-process package internal
    clients. /api/inngest remains signed runtime-only ingress.
  closure_scope: spec-policy lock
```

## Open Decision Impacts (No Closure Here)
- D-008: traces bootstrap order standardization point remains host composition bootstrap.
- D-009: dedupe marker strength remains open (MUST vs SHOULD).
- D-010: finished-hook side-effect guardrail remains open.

## Integration Targets
1. `orpc-ingest-spec-packet/DECISIONS.md`
2. `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
3. `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
4. `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
5. `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
6. `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
7. `orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
8. `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
