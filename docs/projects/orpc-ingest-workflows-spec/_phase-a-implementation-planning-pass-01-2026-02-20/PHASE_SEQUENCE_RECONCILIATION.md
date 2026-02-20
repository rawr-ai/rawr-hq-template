# Phase Sequence Reconciliation

## Objective
Reconcile Phase A with later phases without over-planning downstream work.

## Phase A (Detailed in this pass)
- Focus: compatibility bridge + convergence scaffolding + enforcement gates.
- Output: implementable slices with owner map, file map, interface deltas, and hard acceptance criteria.

## Phase B/C/D (Coarse, constrained)
### Phase B — Target-State Consolidation
1. Remove residual transitional alias paths that are no longer needed after Phase A enforcement.
2. Tighten manifest-authority-only runtime composition.
3. Promote full workflow boundary coverage where Phase A left additive bridges.

### Phase C — Runtime Hardening Beyond Seam-Now
1. Distributed idempotency/storage-backed lock semantics where process-local assumptions remain.
2. Deeper telemetry/operational diagnostics maturity.
3. Optional performance and scale refinements.

### Phase D — Lifecycle Productization (Deferred by policy)
1. D-016 deferred UX/packaging mechanics.
2. Multi-instance control-plane UX improvements.
3. Maintainer workflow ergonomics for distribution lifecycle.

## Deferred Register (Canonical)
This table is the single source of truth for all items explicitly deferred out of Phase A.

| defer_id | reason | explicitly_not_in_phase_a | unblock_trigger | target_phase | owner |
| --- | --- | --- | --- | --- | --- |
| `DR-001` | D-016 policy defers UX and packaging mechanics to avoid migration churn. | D-016 UX/packaging productization and maintainer UX surfaces. | Phase A gates fully green and bridge shim retirement complete. | Phase D | `@rawr-distribution-lifecycle` |
| `DR-002` | Cross-instance idempotency redesign is not required for seam-now Phase A safety. | Storage-backed/distributed lock redesign replacing process-local lock assumptions. | Evidence of cross-instance duplication risk after A6, or explicit new decision record. | Phase C | `@rawr-runtime-host` |
| `DR-003` | Deep telemetry maturity is intentionally deferred to keep Phase A lightweight and implementation-focused. | Enterprise-scale telemetry expansion beyond required Phase A counters/events and the 7-day zero-read measurement contract. | Phase A completion and post-cutover observability backlog intake. | Phase C | `@rawr-verification-gates` |
| `DR-004` | Non-convergence refactors are excluded to keep execution deterministic. | Broad refactors not directly tied to D-013/D-015/D-016 convergence obligations. | New scoped milestone approved after Phase A completion. | Phase B | `@rawr-plugin-lifecycle` |

## Explicit Phase Boundary Rules
1. Phase A must not absorb deferred D-016 UX/packaging mechanics.
2. Phase B+ must not reopen D-013/D-015/D-016 locks unless a new decision record explicitly changes policy.
3. Phase B planning starts only after Phase A gates are green and bridge-shim retirement is complete.
4. Any new defer decision or defer-state change must be recorded in this `Deferred Register` before execution changes proceed.

## Why This Order
1. Minimizes churn by forcing runtime identity and route semantics convergence early.
2. Prevents deferred UX/product concerns from derailing migration-critical slices.
3. Keeps forward-only execution pressure while still allowing additive convergence.
