# Phase D Implementation Spec

## 0) Document Contract
Deep implementation reference for Phase D.

- Sequence entrypoint: `PHASE_D_EXECUTION_PACKET.md`
- Gate contract: `PHASE_D_ACCEPTANCE_GATES.md`
- Work breakdown map: `PHASE_D_WORKBREAKDOWN.yaml`

## 1) Purpose and Non-Goals

### 1.1 Purpose
Implement Phase D middleware and ingress hardening around dedupe safety, finished-hook guardrails, and structural anti-drift verification so Phase E starts from stricter runtime boundary guarantees.

### 1.2 Non-Goals
1. No rollback matrix/program.
2. No route-family semantics changes.
3. No reopening locked D-005..D-016 constraints except conditional D-009/D-010 tightening when D4 trigger criteria are met.
4. No broad refactor bucket outside explicit slices.

### 1.3 Current Runtime Baseline
1. D-009 and D-010 are still open watchpoints in `DECISIONS.md`.
2. Boundary route invariants and manifest-owned composition are already locked and must be preserved.
3. Existing gate chains cover core drift but do not yet encode Phase D-specific dedupe/finished-hook/ingress structural contracts.

## 2) Phase D Interface Deltas

### 2.1 D1: Middleware Dedupe Delta (Additive-first)
Planned additions:
1. Add explicit middleware marker surface in boundary request context.
2. Add context-cached dedupe marker key(s) for heavy middleware checks.
3. Add structural verifier that fails on missing marker policy in heavy chains.

Constraints:
1. Preserve route-family semantics and mount order.
2. Do not add new route families.
3. Do not merge boundary middleware assumptions into durable runtime controls.

### 2.2 D2: Finished-Hook Guardrail Delta
Planned additions:
1. Add backward-compatible run-finalization semantics fields (at-least-once/non-exactly-once and idempotent/non-critical expectations).
2. Add TypeBox schema parity for new optional fields.
3. Add runtime guardrails so finished-hook failures do not invalidate primary run outcome.

Constraints:
1. Keep queue failure contract shape stable (`RUN_QUEUE_FAILED`).
2. Preserve published boundary shape via additive-only schema evolution.
3. Keep durable lifecycle semantics explicit and verifier-covered.

### 2.3 D3: Structural Gate Delta
Planned additions:
1. Add static and runtime structural assertions for ingress ownership and middleware dedupe posture.
2. Extend route-boundary and ingress observability tests with explicit negative assertions.
3. Add reusable Phase D verifier helpers.

Constraints:
1. No transport/route contract expansion.
2. Keep package/import ownership direction unchanged.
3. Keep `package.json` gate wiring authoritative and deterministic.

### 2.4 D4: Conditional Decision Delta
Default path:
1. No D-009/D-010 mutation.
2. Publish defer disposition with explicit watchpoints.

Triggered path only:
1. Publish trigger evidence and disposition artifacts.
2. Tighten D-009 and/or D-010 language in `DECISIONS.md` with measurable evidence.
3. Add/adjust only the minimum enforcement needed by tightened decision language.

## 3) Slice Implementation Detail

### 3.1 D1 Implementation Units
1. Boundary context and dedupe markers:
   - `apps/server/src/workflows/context.ts`
   - `apps/server/src/orpc.ts`
2. D1 static verifier:
   - `scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs`
3. D1 runtime test:
   - `apps/server/test/middleware-dedupe.test.ts`

Parallel lanes (non-overlap):
1. context/type lane (`workflows/context.ts`)
2. runtime/middleware lane (`orpc.ts` + D1 tests)

### 3.2 D2 Implementation Units
1. Coordination contract/type updates:
   - `packages/coordination/src/types.ts`
   - `packages/coordination/src/orpc/schemas.ts`
   - `packages/coordination/src/orpc/contract.ts`
2. Runtime adapter and router behavior:
   - `packages/coordination-inngest/src/adapter.ts`
   - `packages/core/src/orpc/runtime-router.ts`
3. D2 verifier and tests:
   - `scripts/phase-d/verify-d2-finished-hook-contract.mjs`
   - `packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
   - `packages/core/test/runtime-router.test.ts`
   - `packages/core/test/orpc-contract-drift.test.ts`
   - `packages/core/test/workflow-trigger-contract-drift.test.ts`

### 3.3 D3 Implementation Units
1. Shared verifier helpers and D3 static verifier:
   - `scripts/phase-d/_verify-utils.mjs`
   - `scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs`
2. Structural/negative-route tests:
   - `apps/server/test/route-boundary-matrix.test.ts`
   - `apps/server/test/ingress-signature-observability.test.ts`
   - `apps/server/test/phase-a-gates.test.ts`
3. Gate wiring:
   - `package.json`

### 3.4 D4 Implementation Units (Triggered-only)
1. Decision updates:
   - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
2. Trigger and disposition verifiers:
   - `scripts/phase-d/verify-d4-dedupe-trigger.mjs`
   - `scripts/phase-d/verify-d4-finished-hook-trigger.mjs`
   - `scripts/phase-d/verify-d4-disposition.mjs`
3. Trigger/disposition artifacts:
   - `docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D4_TRIGGER_EVIDENCE.md`
   - `docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D4_DISPOSITION.md`

## 4) D4 Trigger Matrix (Operational)
1. Trigger D4 when any operational criterion is met:
   - `phase-d:gate:d4-dedupe-scan` detects heavy middleware chain depth `>= 3` without explicit context-cached dedupe marker.
   - `phase-d:gate:d4-finished-hook-scan` detects state-mutating or external finished-hook side effects without explicit idempotent/non-critical contract.
   - `phase-d:gate:d3-ingress-middleware-structural-contract` fails in two consecutive post-remediation executions, where remediation means one commit touching D3-owned paths and one rerun of that gate.
2. Always run `phase-d:d4:assess` before starting D5.
3. Always publish `D4_DISPOSITION.md` before starting D5.
4. If triggered, also publish `D4_TRIGGER_EVIDENCE.md` and rerun touched-slice full gates.

## 5) Review, Structural, Docs, and Readiness Slices

### 5.1 D5 Review + Fix Closure
1. Mandatory independent review lenses:
   - TypeScript design and safety
   - oRPC boundary/contract behavior
2. Blocking/high findings must be fixed before progression.
3. Re-run impacted quick/full gates after each fix.
4. D5 start precondition: `D4_DISPOSITION.md` exists and passes disposition verification.

### 5.2 D5A Structural Assessment + Taste Pass
1. Mandatory structural review after D5 closure.
2. Focus:
   - naming clarity,
   - module boundaries,
   - duplication reduction,
   - domain mapping clarity.
3. Scope guardrail:
   - allowed: local structural polish;
   - disallowed: fundamental architecture shifts.

### 5.3 D6 Docs + Cleanup
1. Update canonical docs and packet status to as-landed Phase D behavior.
2. Remove/archivize superseded runtime-pass artifacts.
3. Publish path-by-path cleanup manifest.

### 5.4 D7 Realignment
1. Reconcile packet assumptions for Phase E kickoff.
2. Publish readiness with explicit blockers/owners/order.
3. Include D4 triggered/deferred disposition and carry-forward watchpoints.

## 6) Failure Modes and Immediate Responses
1. D1 marker drift:
   - isolate middleware chain and fix explicit context-cached marker coverage; rerun D1 quick/full.
2. D2 contract regression:
   - restore additive compatibility in types/schemas and rerun D2 quick/full plus drift suites.
3. D3 anti-spoof regression:
   - fix structural verifier/test assertions and rerun D3 quick/full.
4. D4 overreach:
   - if trigger is not evidenced, revert decision mutation and record explicit defer disposition.
5. D5 false convergence:
   - rerun independent review after each blocking/high fix set until approve.

## 7) Phase Exit Conditions
1. `D1..D3` complete and green in order.
2. `D4` disposition complete (triggered-and-closed or explicit deferred state).
3. `D5` review closure has no unresolved blocking/high findings.
4. `D5A` structural assessment closure complete.
5. `D6` docs + cleanup outputs published.
6. `D7` Phase E readiness explicit and actionable.
7. Full Phase D exit gates green on landed branch state.
