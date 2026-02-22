# Executive Summary: ORPC + Inngest Autonomy Assessment

Date: 2026-02-20
Scope: analysis-only branch; no runtime API/type implementation changes.

## 1) Right Shape?
Judgment: **conditional yes**.

- **Yes**: the packet’s split model (ORPC boundary + Inngest durable runtime + manifest-first composition + plugin-owned boundary contracts) is the right long-term shape for autonomous extension.
- **Condition**: current runtime/control-plane is materially pre-convergence on route topology, metadata semantics, and verification posture.

## 2) Simplest Viable Path
Use conservative incremental hardening first:
1. Lock D-013 metadata semantics in existing tooling.
2. Add mandatory negative-route tests for current route families.
3. Keep current route topology temporarily.

This is simplest, but it must be time-boxed or it becomes permanent architecture drift.

## 3) Most Robust Path
Use manifest-first direct convergence:
1. Manifest-owned capability routes (`/api/workflows/<capability>/*`) as first-class boundary.
2. Strict runtime metadata contract (`rawr.kind`, `rawr.capability`) with legacy semantics removed.
3. Full D-015 caller/persona matrix enforcement (including forbidden-route assertions).
4. Distributed idempotency and queue-state hardening.

This is robust but high blast radius.

## 4) What Might Get Us First (Top Risks)
1. **Route/caller drift**.
   Trigger signals: missing negative-route tests; external `/rpc` traffic; caller use of `/api/inngest`.
2. **Legacy metadata drift**.
   Trigger signals: runtime behavior still keyed by `templateRole/channel/publishTier`.
3. **Autonomy blind spot in plugin discovery**.
   Trigger signals: tooling scans only `cli/agents/web` roots.
4. **Cross-instance duplicate enqueue**.
   Trigger signals: duplicate event IDs/timelines for same `runId`.
5. **Context-envelope mismatch**.
   Trigger signals: static process context reused across requests with no request-derived principal/correlation contract.

## 5) Recommendation
Adopt a phased **Balanced Bridge**.

### Phase 0: No-Regret Moves
1. Define ownership and enforcement gates (`manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`).
2. Normalize packet internal consistency for D-015 downstream execution language.
3. Assign single owner for workspace plugin discovery/lifecycle utility.

### Phase 1: Compatibility Bridge
1. Make `rawr.kind` + `rawr.capability` authoritative for runtime behavior.
2. Keep legacy fields as compatibility reads only.
3. Extend plugin discovery to `plugins/api/*` and `plugins/workflows/*`.

### Phase 2: Target-State Cutover
1. Introduce manifest-driven capability workflow route composition.
2. Keep existing coordination route path as temporary fallback.
3. Add request-scoped context factory aligned with Axis-04.

### Phase 3: Governance Hardening
1. Enforce full D-015 harness matrix + mandatory negative-route tests.
2. Remove legacy metadata behavior shims.
3. Harden queue idempotency and failure telemetry for distributed runtime.

## 6) Proposed API / Interface Delta Table (Not Implemented)

| Surface | Current | Proposed target | Notes |
| --- | --- | --- | --- |
| Route topology | `/rpc`, `/api/orpc/*`, `/api/inngest` | Add manifest-driven `/api/workflows/<capability>/*`; keep `/api/inngest` runtime-only | D-005/D-007 convergence item |
| Manifest contract (`rawr.hq.ts`) | not authoritative in assessed runtime path | sole composition authority for route and runtime surfaces | D-013 + host composition contract |
| Metadata contract | legacy runtime use of `templateRole/channel/publishTier` in tooling | runtime keyed by `rawr.kind` + `rawr.capability`; legacy non-runtime only | D-013 hardening item |
| Caller transport contract | policy says RPC internal / OpenAPI external, but tests mostly positive-path | explicit route-persona assertions and forbidden-route tests by default | D-015 hardening item |
| Context envelope contract | static context object in route registration | request-scoped boundary envelope + durable runtime envelope split | Axis-04 convergence item |
