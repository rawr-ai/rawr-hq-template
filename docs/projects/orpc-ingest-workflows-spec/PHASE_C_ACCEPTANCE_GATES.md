# Phase C Acceptance Gates

## Purpose
Define deterministic verification for Phase C progression and exit.

## Cadence Contract
1. Quick suite:
   - run on every commit in active slice,
   - run on every fix commit after review findings.
2. Full suite:
   - run at slice candidate complete,
   - run after blocking/high fix sets,
   - run before independent review,
   - run at phase exit.

## Gate Posture (Non-Negotiable)
1. Forward-only; no rollback track.
2. Critical conformance checks hard-fail.
3. Drift-core checks run in every slice quick run.
4. Phase C verifier source-of-truth is `scripts/phase-c/*.mjs`; Phase A scripts are reused only as drift-core checks.

## Drift-Core Baseline (Always-on)
- `bun run phase-a:gate:metadata-contract`
- `bun run phase-a:gate:import-boundary`
- `bun run phase-a:gate:host-composition-guard`
- `bun run phase-a:gate:route-negative-assertions`
- `bun run phase-a:gate:harness-matrix`
- `bun run phase-a:gate:manifest-smoke-completion`
- `bun run phase-a:gate:legacy-metadata-hard-delete-static-guard`

## Slice Gate Matrix

### C1 (Storage-Lock Redesign)
Quick:
- `bun run phase-c:gate:drift-core`
- `bun run phase-c:gate:c1-storage-lock-static`
- `bun run phase-c:gate:c1-storage-lock-runtime`

Full:
- `bun run phase-c:c1:quick`
- `bunx vitest run --project server apps/server/test/rawr.test.ts`

Required outcomes:
1. Concurrent lock/write contention is deterministic and safe.
2. Instance-local authority defaults preserved.
3. No route/caller semantics drift.

### C2 (Telemetry Contract Expansion)
Quick:
- `bun run phase-c:gate:drift-core`
- `bun run phase-c:gate:c2-telemetry-contract`
- `bun run phase-c:gate:c2-telemetry-runtime`

Full:
- `bun run phase-c:c2:quick`
- `bun run phase-a:gate:observability-contract`

Required outcomes:
1. Telemetry contract is required, not optional/no-op.
2. Adversarial observability checks pass.
3. No boundary/route policy drift.

### C3 (Distribution/Lifecycle Mechanics)
Quick:
- `bun run phase-c:gate:drift-core`
- `bun run phase-c:gate:c3-distribution-contract`
- `bun run phase-c:gate:c3-distribution-runtime`

Full:
- `bun run phase-c:c3:quick`
- `bun run phase-a:gate:legacy-metadata-hard-delete-static-guard`

Required outcomes:
1. Alias/instance seam behavior is explicit and isolated.
2. Channel A/B remain command surfaces only.
3. No singleton-global assumptions introduced.

### C4 (Conditional Decision Tightening)
Quick/Full:
- `bun run phase-c:c4:assess` to evaluate trigger conditions
- `bun run phase-c:gate:c4-disposition` is mandatory before C5 regardless of trigger outcome
- if triggered: run touched-slice impacted gates plus new tightened-policy assertions

Required outcomes:
1. Trigger evidence is measurable and captured in `C4_TRIGGER_EVIDENCE.md`.
2. `C4_DISPOSITION.md` records one explicit state: `triggered` or `deferred`.
3. If no trigger, explicit defer disposition is recorded in C7 and C5 still requires `C4_DISPOSITION.md`.

## Mandatory Review/Fix Gate (C5)
1. Independent TypeScript + oRPC review after C3 first full-green (and C4 if triggered).
2. Blocking/high findings must be fixed before progression.
3. After each fix set:
   - rerun impacted quick suites,
   - rerun impacted full suites,
   - rerun independent review for touched scope.

## Mandatory Structural Gate (C5A)
1. Run structural/taste assessment after C5 closure.
2. Blocking/high structural findings must be fixed in-run.
3. Re-run impacted quick/full suites after structural fixes.

## Docs/Cleanup Gate (C6)
1. Canonical docs aligned to as-landed behavior.
2. Cleanup manifest complete with rationale per path.
3. No stale normative references left in packet entrypoints.

## Phase Exit Gate
Required before declaring Phase C complete:
1. `C1..C3` accepted in order.
2. `C4` disposition complete (triggered-and-closed or explicit defer).
3. `C5` and `C5A` closures complete.
4. `C6` docs/cleanup closure complete.
5. `C7` readiness output complete.
6. `bun run phase-c:gates:exit` green on final landed branch state.

## Planned Command Contract Additions (to `package.json` during runtime phase)
```json
{
  "phase-c:gate:drift-core": "bun run phase-a:gate:metadata-contract && bun run phase-a:gate:import-boundary && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions && bun run phase-a:gate:harness-matrix && bun run phase-a:gate:manifest-smoke-completion && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",
  "phase-c:gate:c1-storage-lock-static": "bun scripts/phase-c/verify-storage-lock-contract.mjs",
  "phase-c:gate:c1-storage-lock-runtime": "bunx vitest run --project coordination packages/coordination/test/storage-lock-cross-instance.test.ts && bunx vitest run --project state packages/state/test/repo-state.concurrent.test.ts && bunx vitest run --project server apps/server/test/storage-lock-route-guard.test.ts",
  "phase-c:c1:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c1-storage-lock-static && bun run phase-c:gate:c1-storage-lock-runtime",
  "phase-c:c1:full": "bun run phase-c:c1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",
  "phase-c:gate:c2-telemetry-contract": "bun scripts/phase-c/verify-telemetry-contract.mjs",
  "phase-c:gate:c2-telemetry-runtime": "bunx vitest run --project coordination-observability packages/coordination-observability/test/storage-lock-telemetry.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts",
  "phase-c:c2:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c2-telemetry-contract && bun run phase-c:gate:c2-telemetry-runtime",
  "phase-c:c2:full": "bun run phase-c:c2:quick && bun run phase-a:gate:observability-contract",
  "phase-c:gate:c3-distribution-contract": "bun scripts/phase-c/verify-distribution-instance-lifecycle.mjs",
  "phase-c:gate:c3-distribution-runtime": "bunx vitest run --project hq packages/hq/test/instance-alias-isolation.test.ts && bunx vitest run --project plugin-plugins plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts",
  "phase-c:c3:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c3-distribution-contract && bun run phase-c:gate:c3-distribution-runtime",
  "phase-c:c3:full": "bun run phase-c:c3:quick && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",
  "phase-c:gate:c4-dedupe-scan": "bun scripts/phase-c/verify-c4-dedupe-trigger.mjs",
  "phase-c:gate:c4-finished-hook-scan": "bun scripts/phase-c/verify-c4-finished-hook-trigger.mjs",
  "phase-c:c4:assess": "bun run phase-c:gate:c4-dedupe-scan && bun run phase-c:gate:c4-finished-hook-scan",
  "phase-c:gate:c4-disposition": "bun scripts/phase-c/verify-c4-disposition.mjs",
  "phase-c:gates:full": "bun run phase-c:c1:full && bun run phase-c:c2:full && bun run phase-c:c3:full && bun run phase-c:gate:c4-disposition",
  "phase-c:gates:exit": "bun run phase-c:gates:full && bun run phase-a:gates:exit"
}
```
