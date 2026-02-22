# Phase D Acceptance Gates

## Purpose
Define deterministic verification for Phase D progression and exit.

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
4. Phase D verifier source-of-truth is `scripts/phase-d/*.mjs`; Phase A/C scripts reused only as inherited drift-core checks.

## Drift-Core Baseline (Always-on)
- `bun run phase-c:gate:drift-core`

## Slice Gate Matrix

### D1 (Middleware Dedupe Hardening)
Quick:
- `bun run phase-d:gate:drift-core`
- `bun run phase-d:gate:d1-middleware-dedupe-contract`
- `bun run phase-d:gate:d1-middleware-dedupe-runtime`

Full:
- `bun run phase-d:d1:quick`
- `bunx vitest run --project server apps/server/test/rawr.test.ts`

Required outcomes:
1. Heavy middleware chains use explicit context-cached dedupe markers.
2. No mount-order/route-family drift.

### D2 (Finished-Hook Guardrails)
Quick:
- `bun run phase-d:gate:drift-core`
- `bun run phase-d:gate:d2-finished-hook-contract`
- `bun run phase-d:gate:d2-finished-hook-runtime`

Full:
- `bun run phase-d:d2:quick`
- `bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts`
- `bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts`

Required outcomes:
1. Finished-hook behavior remains idempotent/non-critical.
2. Non-exactly-once lifecycle behavior is verifier-covered.

### D3 (Ingress + Middleware Structural Gates)
Quick:
- `bun run phase-d:gate:drift-core`
- `bun run phase-d:gate:d3-ingress-middleware-structural-contract`
- `bun run phase-d:gate:d3-ingress-middleware-structural-runtime`

Full:
- `bun run phase-d:d3:quick`
- `bun run phase-a:gate:host-composition-guard`
- `bun run phase-a:gate:route-negative-assertions`

Required outcomes:
1. Anti-spoof assertions remain hard-fail.
2. Caller/runtime route-family negative assertions remain explicit and executable.

### D4 (Conditional Decision Tightening)
Assess:
- `bun run phase-d:d4:assess`

Mandatory before D5 (regardless of trigger outcome):
- `bun run phase-d:gate:d4-disposition`

If triggered:
- rerun touched-slice full commands
- rerun tightened-decision assertions impacted by D-009/D-010 updates

Required outcomes:
1. `D4_TRIGGER_EVIDENCE.md` exists when triggered.
2. `D4_DISPOSITION.md` always exists and records one explicit state: `triggered` or `deferred`.
3. `D5` cannot start without successful `phase-d:gate:d4-disposition`.
4. If triggered by D3 drift recurrence, evidence includes two failed `phase-d:gate:d3-ingress-middleware-structural-contract` runs with one remediation attempt between them.
5. A remediation attempt means one commit that touches D3-owned paths and one rerun of `phase-d:gate:d3-ingress-middleware-structural-contract`.

## Mandatory Review/Fix Gate (D5)
1. Independent TypeScript + oRPC review after D1-D3 first full-green and D4 disposition closure.
2. Blocking/high findings must be fixed before progression.
3. After each fix set:
   - rerun impacted quick suites,
   - rerun impacted full suites,
   - rerun independent review for touched scope.

## Mandatory Structural Gate (D5A)
1. Run structural/taste assessment after D5 closure.
2. Blocking/high structural findings must be fixed in-run.
3. Re-run impacted quick/full suites after structural fixes.

## Docs/Cleanup Gate (D6)
1. Canonical docs aligned to as-landed behavior.
2. Cleanup manifest complete with rationale per path.
3. No stale normative references left in packet entrypoints.

## Phase Exit Gate
Required before declaring Phase D complete:
1. `D1..D3` accepted in order.
2. `D4` disposition complete (triggered-and-closed or explicit defer).
3. `D5` and `D5A` closures complete.
4. `D6` docs/cleanup closure complete.
5. `D7` readiness output complete.
6. `bun run phase-d:gates:exit` green on final landed branch state.

## Planned Command Contract Additions (to `package.json` during runtime phase)
```json
{
  "phase-d:gate:drift-core": "bun run phase-c:gate:drift-core",

  "phase-d:gate:d1-middleware-dedupe-contract": "bun scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs",
  "phase-d:gate:d1-middleware-dedupe-runtime": "bunx vitest run --project server apps/server/test/middleware-dedupe.test.ts",
  "phase-d:d1:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d1-middleware-dedupe-contract && bun run phase-d:gate:d1-middleware-dedupe-runtime",
  "phase-d:d1:full": "bun run phase-d:d1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",

  "phase-d:gate:d2-finished-hook-contract": "bun scripts/phase-d/verify-d2-finished-hook-contract.mjs",
  "phase-d:gate:d2-finished-hook-runtime": "bunx vitest run --project coordination-inngest packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts && bunx vitest run --project core packages/core/test/runtime-router.test.ts",
  "phase-d:d2:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d2-finished-hook-contract && bun run phase-d:gate:d2-finished-hook-runtime",
  "phase-d:d2:full": "bun run phase-d:d2:quick && bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts && bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts",

  "phase-d:gate:d3-ingress-middleware-structural-contract": "bun scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs",
  "phase-d:gate:d3-ingress-middleware-structural-runtime": "bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts && bunx vitest run --project server apps/server/test/phase-a-gates.test.ts",
  "phase-d:d3:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d3-ingress-middleware-structural-contract && bun run phase-d:gate:d3-ingress-middleware-structural-runtime",
  "phase-d:d3:full": "bun run phase-d:d3:quick && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions",

  "phase-d:gate:d4-dedupe-scan": "bun scripts/phase-d/verify-d4-dedupe-trigger.mjs",
  "phase-d:gate:d4-finished-hook-scan": "bun scripts/phase-d/verify-d4-finished-hook-trigger.mjs",
  "phase-d:d4:assess": "bun run phase-d:gate:d4-dedupe-scan && bun run phase-d:gate:d4-finished-hook-scan",
  "phase-d:gate:d4-disposition": "bun scripts/phase-d/verify-d4-disposition.mjs",

  "phase-d:gates:full": "bun run phase-d:d1:full && bun run phase-d:d2:full && bun run phase-d:d3:full && bun run phase-d:gate:d4-disposition",
  "phase-d:gates:exit": "bun run phase-d:gates:full && bun run phase-a:gates:exit"
}
```
