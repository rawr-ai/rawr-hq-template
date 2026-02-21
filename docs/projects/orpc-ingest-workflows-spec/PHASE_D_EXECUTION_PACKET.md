# Phase D Execution Packet

## Start Here (Single Entrypoint)
This is the canonical Phase D execution packet.

Execute in this order:
1. `D0 -> D1 -> D2 -> D3 -> D4 (conditional) -> D5 -> D5A -> D6 -> D7`
2. Do not start a slice until dependency slices are green.
3. Forward-only posture: fix failing slices in place; no rollback track.
4. `D4` is conditional but disposition artifacts are mandatory.
5. `D5` independent review/fix closure is mandatory before structural/docs closure.
6. `D5A` structural assessment is mandatory before docs/cleanup.
7. `D6` docs/cleanup is mandatory before readiness.
8. `D7` readiness is mandatory before Phase E kickoff.

## Objective
Land Phase D middleware and ingress hardening around dedupe safety, finished-hook guardrails, and structural anti-drift gates while preserving locked route boundaries, manifest authority, and runtime semantics.

## Entry State
1. C7 readiness posture is `ready`: `docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md`.
2. Phase C closures are complete (review, structural, docs, readiness).
3. Phase D planning packet and steward disposition are complete before runtime kickoff.

## Locked Constraints (No Re-open in Phase D)
1. Runtime semantics: `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family semantics unchanged:
   - `/rpc` internal/first-party only
   - `/api/orpc/*` published OpenAPI boundary
   - `/api/workflows/<capability>/*` caller-facing workflow boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` remains composition authority.
4. D-013 hard deletion remains enforced (legacy metadata keys forbidden in active runtime/tooling/scaffold surfaces).
5. D-014/D-015/D-016 locks remain in force (package seams, verification posture, no singleton-global assumptions).

## Slice Plan (Decision Complete)

### D0 - Planning Closure + G1.5 Steward Drift Check
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: C7 readiness
- Implement:
  1. Finalize Phase D packet docs and machine map.
  2. Run independent steward review and close blocking/high planning findings.
  3. Run explicit steward drift-check readout before opening runtime implementation branch.
- Primary outputs:
  - `PHASE_D_EXECUTION_PACKET.md`
  - `PHASE_D_IMPLEMENTATION_SPEC.md`
  - `PHASE_D_ACCEPTANCE_GATES.md`
  - `PHASE_D_WORKBREAKDOWN.yaml`
  - `PHASE_D_REVIEW_DISPOSITION.md`
  - `PHASE_D_PLANNING_HANDOFF.md`

### D1 - Middleware Dedupe Hardening
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-verification-gates`
- Depends on: `D0`
- Implement:
  1. Add explicit context-cached dedupe markers for heavy middleware chains.
  2. Add structural assertions to prevent silent dedupe drift.
  3. Preserve route-family and mount-order semantics.
- Primary runtime paths:
  - `apps/server/src/workflows/context.ts`
  - `apps/server/src/orpc.ts`
  - `apps/server/test/middleware-dedupe.test.ts`
  - `scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs`

### D2 - Inngest Finished-Hook Guardrails
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-verification-gates`
- Depends on: `D1`
- Implement:
  1. Enforce idempotent/non-critical finished-hook side-effect contract.
  2. Keep run lifecycle behavior explicitly non-exactly-once and verifier-covered.
  3. Preserve queue/runtime contract compatibility via additive fields only.
- Primary runtime paths:
  - `packages/coordination/src/types.ts`
  - `packages/coordination/src/orpc/schemas.ts`
  - `packages/coordination/src/orpc/contract.ts`
  - `packages/coordination-inngest/src/adapter.ts`
  - `packages/core/src/orpc/runtime-router.ts`
  - `packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
  - `packages/core/test/runtime-router.test.ts`
  - `packages/core/test/orpc-contract-drift.test.ts`
  - `packages/core/test/workflow-trigger-contract-drift.test.ts`
  - `scripts/phase-d/verify-d2-finished-hook-contract.mjs`

### D3 - Ingress + Middleware Structural Gates
- Owner: `@rawr-verification-gates`
- Backup: `@rawr-runtime-host`
- Depends on: `D2`
- Implement:
  1. Add anti-spoof and ownership assertions for ingress/middleware behavior.
  2. Extend structural tests so boundary drift fails outside happy-path tests.
  3. Wire Phase D gate command chain in `package.json`.
- Primary runtime paths:
  - `scripts/phase-d/_verify-utils.mjs`
  - `scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs`
  - `apps/server/test/route-boundary-matrix.test.ts`
  - `apps/server/test/ingress-signature-observability.test.ts`
  - `apps/server/test/phase-a-gates.test.ts`
  - `package.json`

### D4 - Conditional Decision Tightening (D-009/D-010)
- Owner: `@rawr-architecture-duty`
- Backup: `@rawr-runtime-host`
- Depends on: `D1..D3` evidence
- Trigger criteria:
  1. D1 evidence shows heavy middleware chain depth `>= 3` without explicit context-cached dedupe markers.
  2. D2 evidence shows state-mutating or external finished-hook side effects without explicit idempotent/non-critical guarantees.
  3. D3 evidence shows two consecutive failures of `phase-d:gate:d3-ingress-middleware-structural-contract` after one completed remediation cycle (a remediation commit touching D3-owned paths plus one rerun of the same gate).
- Triggered path:
  1. Publish `D4_TRIGGER_EVIDENCE.md` and `D4_DISPOSITION.md`.
  2. Tighten D-009 and/or D-010 lock language in `DECISIONS.md` only with evidence.
  3. Rerun touched-slice full gates before proceeding.
- No-trigger path:
  1. Publish `D4_DISPOSITION.md` with explicit defer rationale and carry-forward watchpoints.
  2. Do not mutate `DECISIONS.md`.

### D5 - Independent Review + Fix Closure
- Owner: `@rawr-review-closure`
- Backup: `@rawr-verification-gates`
- Depends on: `D3` and conditional `D4` closure
- Implement:
  1. Full independent review from TypeScript + oRPC perspectives.
  2. Severity-ranked findings with file/line anchors.
  3. Fix all blocking/high findings in-run; rerun impacted gates and re-review.
  4. Verify `D4_DISPOSITION.md` exists before review starts.

### D5A - Structural Assessment + Taste Pass
- Owner: `@rawr-structural-steward`
- Backup: `@rawr-review-closure`
- Depends on: `D5`
- Implement:
  1. Improve naming, file boundaries, duplication, and domain clarity.
  2. Keep architecture fixed (no route/authority/runtime-topology shifts).

### D6 - Canonical Docs + Cleanup Closure
- Owner: `@rawr-docs-maintainer`
- Backup: `@rawr-release-duty`
- Depends on: `D5A`
- Implement:
  1. Align canonical docs to as-landed Phase D behavior.
  2. Prune superseded runtime-pass artifacts.
  3. Publish cleanup manifest.

### D7 - Post-Land Realignment / Phase E Readiness
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: `D6`
- Implement:
  1. Publish explicit Phase E kickoff posture (`ready`/`not-ready`) with blockers/owners/order.
  2. Include explicit D4 triggered/deferred disposition and watchpoint posture.

## Deferred (Non-Blocking for Phase D)
1. Broad D-016 UX/control-plane productization beyond seam-safe hardening.
2. Any route-topology expansion beyond locked families.
3. Any rollback playbook track.
4. D-009/D-010 lock changes when D4 trigger criteria are not met.

## First-Failure Signals (Watchlist)
1. D1: heavy middleware chain lacks explicit dedupe marker or route semantics drift appears.
2. D2: finished hook introduces critical/non-idempotent side effects.
3. D3: ingress anti-spoof checks regress or package/import ownership guardrails drift.
4. D4: lock-tightening attempted without measurable trigger evidence.
5. D5/D5A: review or structural pass skipped/compressed.
6. D6: canonical docs diverge from landed runtime behavior.
7. D7: readiness posture missing explicit blockers/owners/order.

## Branch/Worktree Contract
1. Parent branch: `codex/phase-d-prep-grounding-runbook`
2. Planning branch: `codex/phase-d-planning-packet`
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet`
4. Implementation root branch: `codex/phase-d-runtime-implementation`
5. Implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation`
6. Graphite safety: `gt sync --no-restack` only; submit each closed slice branch with `gt submit --ai --no-edit`.

## Entry Gates
See `PHASE_D_ACCEPTANCE_GATES.md` for exact quick/full cadence and exit contract.
