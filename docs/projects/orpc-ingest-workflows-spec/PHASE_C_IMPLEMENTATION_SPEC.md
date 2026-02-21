# Phase C Implementation Spec

## 0) Document Contract
Deep implementation reference for Phase C.

- Sequence entrypoint: `PHASE_C_EXECUTION_PACKET.md`
- Gate contract: `PHASE_C_ACCEPTANCE_GATES.md`
- Work breakdown map: `PHASE_C_WORKBREAKDOWN.yaml`

## 1) Purpose and Non-Goals

### 1.1 Purpose
Implement Phase C runtime hardening around state concurrency, telemetry contract rigor, and distribution/lifecycle mechanics so Phase D starts from tighter operational seams with lower drift risk.

### 1.2 Non-Goals
1. No rollback matrix/program.
2. No route-family semantics changes.
3. No reopening locked D-013/D-014/D-015/D-016 constraints.
4. No broad refactor bucket outside explicit slices.

### 1.3 Current Runtime Baseline
1. Repo-state writes currently use read-modify-write without lock contract (`packages/state/src/repo-state.ts`).
2. Telemetry gate currently has optional/no-op scaffold path (`scripts/phase-a/verify-gate-scaffold.mjs`, `package.json`).
3. D-016 seam-now constraints are locked; mechanics remain partially deferred to phase execution.
4. Phase C verifier source of truth is new `scripts/phase-c/*.mjs`; Phase A gate scripts remain reused as drift-core baseline checks only.

## 2) Phase C Interface Deltas

### 2.1 C1: State/Lock Interface Delta (Additive-first)
Planned additions:
1. Introduce internal atomic mutation seam:
   - `mutateRepoStateAtomically(repoRoot, mutator, options?)`
   - `RepoStateMutationOptions`
   - `RepoStateMutationResult`
2. Keep public caller entrypoints stable where possible:
   - `getRepoState(repoRoot)`
   - `enablePlugin(repoRoot, pluginId)`
   - `disablePlugin(repoRoot, pluginId)`

Constraints:
1. Preserve persisted `RepoState` schema unless a clearly justified additive evolution is required.
2. Preserve default instance-local authority semantics.
3. Keep global-owner fallback explicit-only.

### 2.2 C2: Telemetry Contract Delta
Planned additions:
1. Make telemetry conformance required in gate chain (remove optional/no-op semantics for Phase C objectives).
2. Export additive typed inputs/options from observability helper surface:
   - `CreateDeskEventInput`
   - `TraceLinkOptions`

Constraints:
1. No caller-route publication changes.
2. No ingress/auth policy changes.

### 2.3 C3: Distribution/Lifecycle Tooling Delta
Planned additions:
1. Additive diagnostics in `doctor global` JSON/human output for alias/instance seam state.
2. Script improvements in install/activate workflow to make instance ownership resolution explicit.

Constraints:
1. Channel A/B remain command surfaces only.
2. No runtime metadata semantic coupling.
3. No singleton-global fallback behavior introduced.

### 2.4 C4: Conditional Decision Delta
Default path:
1. No D-009/D-010 mutation.

Triggered path only:
1. Tighten D-009 and/or D-010 language in `DECISIONS.md`.
2. Add corresponding runtime/test enforcement where strictly required by triggered condition.

## 3) Slice Implementation Detail

### 3.1 C1 Implementation Units
1. Core lock and atomic mutation:
   - `packages/state/src/repo-state.ts`
   - `packages/state/src/types.ts`
   - `packages/state/src/index.ts`
   - `scripts/phase-c/verify-storage-lock-contract.mjs` (new)
2. Contract stability checks:
   - `packages/state/src/orpc/contract.ts`
3. Authority behavior regression guards:
   - `packages/hq/src/install/state.ts`
   - `packages/hq/test/install-state.test.ts`
   - `plugins/cli/plugins/test/install-state.test.ts`
4. New contention tests:
   - `packages/state/test/repo-state.concurrent.test.ts` (new)
   - `packages/coordination/test/storage-lock-cross-instance.test.ts` (new)
   - `apps/server/test/storage-lock-route-guard.test.ts` (new)

Parallel lanes (non-overlap):
1. state internals lane (`packages/state/src/*`)
2. authority semantics lane (`packages/hq/src/install/state.ts` + tests)

### 3.2 C2 Implementation Units
1. Observability helper hardening:
   - `packages/coordination-observability/src/events.ts`
   - `packages/coordination-observability/test/observability.test.ts`
2. Runtime callsite alignment (if additive fields used):
   - `packages/coordination-inngest/src/adapter.ts`
   - `packages/core/src/orpc/runtime-router.ts`
3. Gate hardening:
   - `scripts/phase-c/verify-telemetry-contract.mjs` (new)
   - `apps/server/test/phase-a-gates.test.ts`
   - `package.json`
4. New telemetry contract tests:
   - `packages/coordination-observability/test/storage-lock-telemetry.test.ts` (new)
   - `apps/server/test/ingress-signature-observability.test.ts` (new)

### 3.3 C3 Implementation Units
1. Script mechanics:
   - `scripts/dev/install-global-rawr.sh`
   - `scripts/dev/activate-global-rawr.sh`
2. Doctor diagnostics:
   - `apps/cli/src/commands/doctor/global.ts`
   - `apps/cli/test/doctor-global.test.ts`
3. Optional alignment of install-state reporting:
   - `packages/hq/src/install/state.ts`
4. Distribution verifier:
   - `scripts/phase-c/verify-distribution-instance-lifecycle.mjs` (new)
5. New lifecycle/distribution tests:
   - `packages/hq/test/instance-alias-isolation.test.ts` (new)
   - `plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts` (new)

### 3.4 C4 Implementation Units (Triggered-only)
1. Decision updates:
   - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
2. Runtime enforcement (only if needed by tightened policy):
   - `packages/core/src/orpc/runtime-router.ts`
   - `packages/coordination-inngest/src/adapter.ts`
3. Trigger/disposition artifacts:
   - `docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C4_TRIGGER_EVIDENCE.md`
   - `docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C4_DISPOSITION.md`
4. Matching tests in touched suites.

## 4) Review, Structural, Docs, and Readiness Slices

### 4.1 C5 Review + Fix Closure
1. Mandatory independent review lenses:
   - TypeScript design
   - oRPC boundary/contract behavior
2. Blocking/high findings must be fixed before progression.
3. Re-run impacted quick/full gates after each fix.
4. C5 start precondition: `C4_DISPOSITION.md` exists and is valid (triggered or explicit no-trigger defer).

### 4.2 C5A Structural Assessment + Taste Pass
1. Mandatory structural review after C5 closure.
2. Focus:
   - naming clarity,
   - module boundaries,
   - duplication reduction,
   - domain mapping clarity.
3. Scope guardrail:
   - allowed: local structural polish;
   - disallowed: fundamental architecture shifts.

### 4.3 C6 Docs + Cleanup
1. Update canonical docs and packet status to as-landed Phase C behavior.
2. Remove/archivize superseded pass artifacts.
3. Publish path-by-path cleanup manifest.

### 4.4 C7 Realignment
1. Reconcile packet assumptions for Phase D kickoff.
2. Publish readiness with explicit blockers/owners/order.
3. Include C4 triggered/deferred disposition and evidence.

## 5) Failure Modes and Immediate Responses
1. C1 contention corruption:
   - isolate mutation primitive and rerun concurrent state + install-state regressions.
2. C2 telemetry false-green:
   - harden verifier and add missing assertions before continuing.
3. C3 seam regression:
   - verify doctor/script diagnostics and alias isolation tests before merge.
4. C4 unnecessary tightening:
   - revert conditional slice and record no-trigger defer in C7.

## 6) Phase Exit Conditions
1. `C1..C3` complete and green in order.
2. `C4` executed only when triggered, otherwise explicitly deferred with rationale.
3. `C5` review closure has no unresolved blocking/high findings.
4. `C5A` structural assessment closure complete.
5. `C6` docs + cleanup outputs published.
6. `C7` Phase D readiness explicit and actionable.
7. Full Phase C exit gates green on landed branch state.
