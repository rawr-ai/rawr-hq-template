# Phase C Execution Packet

## Start Here (Single Entrypoint)
This is the canonical Phase C execution packet.

Execute in this order:
1. `C0 -> C1 -> C2 -> C3 -> C4 (conditional) -> C5 -> C5A -> C6 -> C7`
2. Do not start a slice until dependency slices are green.
3. Forward-only posture: fix failing slices in place; no rollback track.
4. `C5` independent review/fix closure is mandatory before structural/docs closure.
5. `C5A` structural assessment is mandatory before docs/cleanup.
6. `C6` docs/cleanup is mandatory before realignment.
7. `C7` realignment/readiness is mandatory before Phase D kickoff.

## Objective
Land Phase C runtime and lifecycle hardening around cross-instance state safety, telemetry contract enforcement, and D-016 distribution/lifecycle mechanics while preserving all locked route/ownership/manifest invariants.

## Entry State
1. B6 readiness posture is `ready`: `docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md`.
2. Phase B closures are complete (review, structural, docs, readiness).
3. Phase C opening queue from B6 is retained: `C0 -> C1 -> C2 -> C3 -> C4 (conditional)`.

## Locked Constraints (No Re-open in Phase C)
1. Runtime semantics: `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family semantics unchanged:
   - `/rpc` internal/first-party only
   - `/api/orpc/*` published OpenAPI boundary
   - `/api/workflows/<capability>/*` caller-facing workflow boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` remains composition authority.
4. D-013 hard deletion remains enforced (legacy metadata keys forbidden in active runtime/tooling/scaffold surfaces).
5. D-016 seam-now posture remains enforced: alias/instance seam required now; no singleton-global assumptions.

## Slice Plan (Decision Complete)

### C0 - Planning Packet + Gate Contract
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: B6 readiness
- Implement:
  1. Publish execution packet, implementation spec, acceptance gates, work breakdown map.
  2. Resolve planning-level blocking/high review findings.
  3. Publish planning handoff disposition.
- Primary outputs:
  - `PHASE_C_EXECUTION_PACKET.md`
  - `PHASE_C_IMPLEMENTATION_SPEC.md`
  - `PHASE_C_ACCEPTANCE_GATES.md`
  - `PHASE_C_WORKBREAKDOWN.yaml`
  - `PHASE_C_REVIEW_DISPOSITION.md`
  - `PHASE_C_PLANNING_HANDOFF.md`

### C1 - Cross-Instance Storage-Lock Redesign
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-platform-duty`
- Depends on: `C0`
- Implement:
  1. Make repo state writes collision-safe and deterministic under contention.
  2. Preserve existing caller contracts (`enablePlugin/disablePlugin/getRepoState`) unless additive-only changes are required.
  3. Preserve instance-local default authority and explicit-only global-owner fallback.
- Primary runtime paths:
  - `packages/state/src/repo-state.ts`
  - `packages/state/src/index.ts`
  - `packages/state/src/types.ts`
  - `packages/state/src/orpc/contract.ts` (schema stability assertions only)
  - `packages/hq/src/install/state.ts`
  - `packages/hq/test/install-state.test.ts`
  - `plugins/cli/plugins/test/install-state.test.ts`
- Acceptance:
  1. Concurrent writes do not corrupt `.rawr/state/state.json`.
  2. Default authority remains instance-local.
  3. Global-owner fallback remains explicit-only.

### C2 - Telemetry/Diagnostics Contract Expansion
- Owner: `@rawr-verification-gates`
- Backup: `@rawr-runtime-host`
- Depends on: `C1`
- Implement:
  1. Promote telemetry checks from optional/no-op to required structural contract.
  2. Add additive observability helper typing and event contract checks.
  3. Keep route/caller/manifest semantics unchanged.
- Primary runtime paths:
  - `packages/coordination-observability/src/events.ts`
  - `packages/coordination-observability/test/observability.test.ts`
  - `packages/coordination-inngest/src/adapter.ts` (conditional additive usage)
  - `packages/core/src/orpc/runtime-router.ts` (conditional additive usage)
  - `scripts/phase-c/verify-telemetry-contract.mjs`
  - `scripts/phase-a/verify-gate-scaffold.mjs` (drift-core baseline dependency, not Phase C source-of-truth verifier)
  - `apps/server/test/phase-a-gates.test.ts`
  - `package.json`
- Acceptance:
  1. Telemetry contract is hard-fail in gate chain.
  2. Adversarial observability assertions pass.
  3. Existing phase gate chain stays green.

### C3 - Distribution/Lifecycle Mechanics (D-016 Deferred Mechanics)
- Owner: `@rawr-distribution-lifecycle`
- Backup: `@rawr-platform-duty`
- Depends on: `C2`
- Implement:
  1. Improve operational UX around alias/instance seams.
  2. Keep Channel A (`rawr plugins ...`) and Channel B (`rawr plugins web ...`) as command surfaces only.
  3. Preserve no-singleton assumption and instance isolation.
- Primary runtime/tooling paths:
  - `scripts/dev/install-global-rawr.sh`
  - `scripts/dev/activate-global-rawr.sh`
  - `apps/cli/src/commands/doctor/global.ts`
  - `apps/cli/test/doctor-global.test.ts`
  - `packages/hq/src/install/state.ts` (if required for diagnostics alignment)
- Acceptance:
  1. Alias/instance seam behavior is explicit and testable.
  2. No runtime metadata semantic regression.
  3. No singleton-global behavior introduced.

### C4 - Conditional Decision Tightening (D-009/D-010)
- Owner: `@rawr-architecture-duty`
- Backup: `@rawr-runtime-host`
- Depends on: `C1..C3` evidence
- Trigger criteria:
  1. D-009 trigger: any C1-C3 change introduces new/expanded oRPC middleware chains with depth >= 3 on a route family and missing explicit context-cached dedupe markers, verified by `phase-c:gate:c4-dedupe-scan`.
  2. D-010 trigger: any C2/C3 change introduces or modifies `finished`-hook side effects that are state-mutating or externally side-effectful without explicit idempotency contract, verified by `phase-c:gate:c4-finished-hook-scan`.
  3. Trigger evidence must be captured in `C4_TRIGGER_EVIDENCE.md`.
- Triggered path:
  1. Tighten D-009 and/or D-010 in `DECISIONS.md`.
  2. Land corresponding runtime/test updates.
  3. Publish `C4_DISPOSITION.md` with trigger evidence, policy decision, and resulting scope.
- No-trigger path:
  1. Do not mutate D-009/D-010.
  2. Publish `C4_DISPOSITION.md` with explicit no-trigger evidence and defer rationale.
  3. Record explicit defer disposition in `C7_PHASE_D_READINESS.md`.

### C5 - Independent Review + Fix Closure
- Owner: `@rawr-review-closure`
- Backup: `@rawr-verification-gates`
- Depends on: `C3` and conditional `C4` closure
- Implement:
  1. Full independent review from TypeScript + oRPC perspectives.
  2. Severity-ranked findings with file/line anchors.
  3. Fix all blocking/high findings in run; re-test and re-review.
  4. Verify `C4_DISPOSITION.md` exists before starting review/fix closure.
- Acceptance:
  1. No unresolved blocking/high findings.
  2. Re-review green for touched scope.

### C5A - Structural Assessment + Taste Pass
- Owner: `@rawr-structural-steward`
- Backup: `@rawr-review-closure`
- Depends on: `C5`
- Implement:
  1. Improve naming, file boundaries, duplication, and domain clarity.
  2. Keep architecture fixed (no route/authority/policy topology shifts).
- Acceptance:
  1. Structural findings dispositioned.
  2. Blocking/high structural findings fixed and revalidated.

### C6 - Canonical Docs + Cleanup Closure
- Owner: `@rawr-docs-maintainer`
- Backup: `@rawr-release-duty`
- Depends on: `C5A`
- Implement:
  1. Align canonical docs to as-landed Phase C behavior.
  2. Prune superseded pass artifacts.
  3. Publish cleanup manifest.
- Acceptance:
  1. Canonical docs aligned.
  2. Cleanup manifest complete with rationale per path.

### C7 - Post-Land Realignment / Phase D Readiness
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: `C6`
- Implement:
  1. Publish explicit Phase D kickoff posture (`ready`/`not-ready`) with blockers/owners/order.
  2. Include explicit C4 triggered/deferred disposition.
- Acceptance:
  1. Readiness is explicit and actionable.
  2. Deferred register remains centralized and non-contradictory.

## Deferred (Non-Blocking for Phase C)
1. Full D-016 productization UX/control-plane.
2. Any route-topology expansion beyond locked families.
3. Any compatibility bridge that weakens D-013 hard deletion.
4. D-009/D-010 lock changes when C4 trigger criteria are not met.

## First-Failure Signals (Watchlist)
1. C1: state corruption under concurrent writes; stale-lock takeover misbehavior.
2. C2: telemetry gate false-green or missing critical lifecycle events.
3. C3: alias/instance diagnostics regress into singleton assumptions.
4. C4: policy tightening without concrete trigger evidence.
5. C5/C5A: review or structural pass skipped/compressed.

## Branch/Worktree Contract
1. Parent branch: `codex/phase-c-prep-grounding-runbook`
2. Planning branch: `codex/phase-c-planning-packet`
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet`
4. Implementation root branch: `codex/phase-c-runtime-implementation`
5. Implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`
6. Graphite safety: `gt sync --no-restack` only; submit each slice branch with `gt submit --ai`.

## Entry Gates
See `PHASE_C_ACCEPTANCE_GATES.md` for exact quick/full cadence and exit contract.
