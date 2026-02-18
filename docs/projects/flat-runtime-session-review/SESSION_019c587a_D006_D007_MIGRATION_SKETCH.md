# SESSION_019c587a D-006 + D-007 Migration Sketch

## Goal
Converge packet docs to the corrected model:
- Plugin-owned boundary contracts.
- Package-owned shared domain schemas/domain logic only; workflow trigger/status I/O schemas remain plugin-boundary-owned.
- Composed boundary clients for browser/network callers.
- In-process package internal clients for server-internal callers.
- `/api/inngest` remains runtime-only ingress.

## Migration Sequence

## Phase 0 — Freeze incorrect direction
1. Freeze edits that assert package-owned boundary contracts.
2. Require contradiction gate checks before packet integration.

## Phase 1 — Correct synthesis/authority docs first
1. Correct synthesis narrative and examples.
2. Correct authority packet decisions and wording.
3. Keep D-005 split semantics unchanged.

## Phase 2 — Close D-006/D-007 in packet decisions
1. Update `DECISIONS.md`:
- D-006: closed with plugin-owned boundary contracts.
- D-007: closed with caller-mode client matrix.
2. Keep D-008/009/010 open with impact notes only.

## Phase 3 — Axis alignment
Update axis docs so all policy references match corrected ownership and client modes:
- `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `AXIS_03_SPLIT_VS_COLLAPSE.md`
- `AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`

## Phase 4 — E2E alignment
1. Update `E2E_03` and `E2E_04` with corrected ownership and auth semantics.
2. Ensure at least one explicit micro-frontend run path shows:
- regular endpoint call,
- workflow endpoint call,
- browser-safe package helper usage,
- no `/api/inngest` browser path.

## Caller/Auth Matrix (must be reflected in docs)
```yaml
caller_matrix:
  - caller: browser_mfe_or_network_consumer
    client: composed boundary clients
    auth: boundary auth/session/token
    routes:
      - /api/orpc/*
      - /api/workflows/<capability>/*
    forbidden:
      - /api/inngest

  - caller: server_internal_consumer
    client: package internal in-process client
    auth: trusted service context
    routes:
      - in_process_only
    forbidden:
      - local_http_self_calls_as_default

  - caller: runtime_ingress
    client: inngest runtime bundle
    auth: signed runtime ingress
    routes:
      - /api/inngest
    forbidden:
      - browser_access
```

## What Changes vs Unchanged
```yaml
changes:
  - boundary ownership language shifts to plugin-owned contracts
  - package role is clarified as shared domain schemas/domain logic only (no package-owned workflow boundary I/O schemas)
  - client usage clarified by caller mode (browser vs server internal vs runtime ingress)

unchanged:
  - d005 split semantics (/api/workflows caller-facing, /api/inngest runtime-only)
  - host mount topology and manifest-driven composition posture
  - package internal client as server/in-process default
```

## Risks and Mitigations
1. Risk: stale wording reappears in leaf docs.
- Mitigation: run hard-gate grep checks before final review.
2. Risk: auth semantics remain implicit.
- Mitigation: require caller/auth matrix in synthesis + at least one axis + one E2E doc.
3. Risk: plugin/package boundary blurs again.
- Mitigation: enforce explicit ownership language in DECISIONS and AXIS docs.

## Exit Criteria
1. No canonical doc states package-owned boundary contracts.
2. D-006 and D-007 are closed with corrected wording in `DECISIONS.md`.
3. Micro-frontend examples consistently use composed boundary clients and avoid `/api/inngest`.
4. Packet docs are contradiction-free on ownership, client usage, and auth semantics.
