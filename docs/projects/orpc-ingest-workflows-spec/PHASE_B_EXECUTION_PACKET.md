# Phase B Execution Packet

## Start Here (Single Entrypoint)
This is the canonical Phase B execution packet.

Execute in this order:
1. `B0` -> `B1` -> `B2` -> `B3` -> `B4` -> `B4A` -> `B5` -> `B6`
2. Do not start a slice until dependency slices are green.
3. Forward-only posture: fix failing slices in-place; no rollback track.
4. `B4` review closure is mandatory before docs/cleanup.
5. `B4A` structural assessment is mandatory before docs/cleanup.
6. `B5` docs/cleanup is mandatory before readjustment.
7. `B6` realignment is mandatory before Phase C/D kickoff.

## Objective
Harden Phase A seams into implementation-safe interfaces with explicit ownership and structural verification so downstream phases execute with lower ambiguity and lower drift risk.

## As-Landed Snapshot (through B4A on 2026-02-21)
1. Runtime implementation slices `B0..B4A` are landed in the Phase B runtime execution branch/worktree.
2. `B0` auth-source hardening is landed and the blocking review finding (`HIGH-01`) is closed in fix closure.
3. `B1`/`B2` seam hardening is landed: host composition consumes package-owned runtime seams while `rawr.hq.ts` remains manifest authority.
4. `B3` anti-drift verification is structurally enforced through the canonical gate chain:
   - `bun run phase-a:gates:exit`
   - `scripts/phase-a/verify-gate-scaffold.mjs` (`metadata-contract`, `import-boundary`, `host-composition-guard`, `route-negative-assertions`)
   - `scripts/phase-a/verify-harness-matrix.mjs` + `apps/server/test/route-boundary-matrix.test.ts`
   Dedicated `adapter-shim-ownership.test.ts` files are not present in landed state and are not required by the canonical B3 contract.
5. `B4` re-review disposition is `ready` (no unresolved blocking/high findings); remaining medium docs drift is handled in `B5`.
6. `B4A` structural assessment improvements are landed (shared AST utilities + structural test/scaffold clarity) without architecture shifts.

## Locked Constraints (No Re-open in Phase B)
1. Runtime semantics stay on `rawr.kind` + `rawr.capability` + manifest registration.
2. Route-family boundaries remain:
   - `/rpc` internal/first-party only
   - `/api/orpc/*` published OpenAPI boundary
   - `/api/workflows/<capability>/*` caller-facing workflow boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` remains composition authority.
4. Package-owned shared seams + host-owned concrete wiring (D-014).
5. Legacy metadata keys remain forbidden in non-archival runtime/tooling/scaffold paths.

## Slice Plan (Decision-Complete)

### B0 - `/rpc` Auth-Source Hardening
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-platform-duty`
- Depends on: Phase B kickoff
- Implement:
  1. Replace header-only caller trust with host/session/service-auth-derived classification.
  2. Introduce host-owned classifier seam and keep route policy outcome unchanged.
  3. Preserve default deny for unlabeled/external/runtime-ingress callers.
- Primary paths:
  - `apps/server/src/orpc.ts`
  - `apps/server/src/rawr.ts`
  - `apps/server/src/auth/rpc-auth.ts` (new)
  - `apps/server/test/orpc-handlers.test.ts`
  - `apps/server/test/rawr.test.ts`
  - `apps/server/test/route-boundary-matrix.test.ts`
  - `apps/server/test/rpc-auth-source.test.ts` (new)
- Acceptance:
  1. External/unlabeled `/rpc` requests are denied.
  2. First-party/internal trusted `/rpc` flows remain valid.
  3. `/api/inngest` behavior is unchanged.

### B1 - Workflow Trigger Router Isolation
- Owner: `@rawr-plugin-lifecycle`
- Backup: `@rawr-architecture-duty`
- Depends on: `B0`
- Implement:
  1. Isolate `workflows.triggerRouter` from broad root ORPC composition.
  2. Keep trigger/status scope explicit and plugin-owned.
  3. Preserve `/api/workflows/<capability>/*` behavior.
- Primary paths:
  - `packages/core/src/orpc/hq-router.ts`
  - `packages/core/src/orpc/index.ts`
  - `apps/server/src/orpc.ts`
  - `rawr.hq.ts`
  - `apps/server/test/rawr.test.ts`
  - `apps/server/test/route-boundary-matrix.test.ts`
  - `packages/core/test/workflow-trigger-contract-drift.test.ts` (new)
  - `packages/core/test/__snapshots__/workflow-trigger-contract-drift.test.ts.snap` (new)
- Acceptance:
  1. Workflow routes remain capability-scoped.
  2. No `/rpc/workflows` route is introduced.
  3. Non-workflow procedure surfaces do not leak through trigger router.

### B2 - Manifest/Host Seam Hardening
- Owner: `@rawr-plugin-lifecycle`
- Backup: `@rawr-architecture-duty`
- Depends on: `B1`
- Implement:
  1. Reduce host-internal coupling in manifest composition.
  2. Introduce package-owned runtime router seam.
  3. Preserve manifest-first authority and import direction.
- Primary paths:
  - `packages/core/src/orpc/runtime-router.ts` (new)
  - `packages/core/src/orpc/index.ts`
  - `apps/server/src/orpc.ts`
  - `apps/server/src/workflows/context.ts`
  - `rawr.hq.ts`
  - `apps/server/test/orpc-openapi.test.ts`
  - `packages/core/test/runtime-router.test.ts` (new)
- Acceptance:
  1. `rawr.hq.ts` remains canonical authority.
  2. Host consumes package-owned seams instead of app-internal composition.
  3. No circular import/coupling regression.

### B3 - Verification Structural Hardening
- Owner: `@rawr-verification-gates`
- Backup: `@rawr-release-duty`
- Depends on: `B2`
- Implement:
  1. Upgrade string-shape checks into structural ownership assertions.
  2. Re-baseline workspace/install seam anti-regression to structural gate checks (`metadata-contract` + `import-boundary`) in the canonical exit chain.
  3. Preserve D-015 route-negative and harness matrix obligations.
- Primary paths:
  - `scripts/phase-a/manifest-smoke.mjs`
  - `scripts/phase-a/verify-gate-scaffold.mjs`
  - `scripts/phase-a/verify-harness-matrix.mjs`
  - `apps/server/test/route-boundary-matrix.test.ts`
  - `apps/server/test/phase-a-gates.test.ts`
  - `packages/hq/test/phase-a-gates.test.ts`
  - `plugins/cli/plugins/test/phase-a-gates.test.ts`
- Acceptance:
  1. Structural anti-drift gates are green.
  2. Harness matrix and route-negative assertions remain intact.
  3. Workspace/install seam ownership anti-regression is enforced by structural gate checks in `phase-a:gates:exit`.

### B4 - Independent Review + Fix Closure
- Owner: `@rawr-review-closure`
- Backup: `@rawr-verification-gates`
- Depends on: `B3`
- Implement:
  1. Full TypeScript + ORPC review of landed `B0..B3` changes.
  2. Severity-ranked findings with file/line anchors.
  3. Fix all blocking/high findings in-run, re-test, and re-review.
- Acceptance:
  1. No unresolved blocking/high findings.
  2. Re-review for fixed scope is green.

### B4A - Structural Assessment + Taste Pass
- Owner: `@rawr-structural-steward`
- Backup: `@rawr-review-closure`
- Depends on: `B4`
- Implement:
  1. Run an explicit structural/taste review from TypeScript + solution-design perspectives.
  2. Improve naming, file boundaries, and domain mapping where it reduces confusion and future drift.
  3. Keep changes architecture-conservative: no fundamental route/authority/policy shifts.
  4. Fix findings in-run and re-run impacted quick/full gates.
- Primary paths:
  - Phase B changed runtime and tests (`apps/server/src/*`, `packages/core/src/*`, `apps/server/test/*`, `packages/core/test/*`)
  - `docs/projects/orpc-ingest-workflows-spec/PHASE_B_REVIEW_DISPOSITION.md`
- Acceptance:
  1. Structural assessment findings are documented and dispositioned.
  2. Any accepted improvements are merged and revalidated.
  3. No fundamental architecture shifts are introduced.

### B5 - Canonical Docs + Cleanup Closure
- Owner: `@rawr-docs-maintainer`
- Backup: `@rawr-release-duty`
- Depends on: `B4A`
- Implement:
  1. Update canonical packet docs/runbooks to as-landed Phase B behavior.
  2. Cleanup superseded pass artifacts with explicit manifest.
- Acceptance:
  1. Canonical docs align with landed behavior.
  2. Cleanup manifest is published with per-path action/rationale.

### B6 - Post-Land Readjustment / Realignment
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: `B5`
- Implement:
  1. Reconcile remaining packet assumptions for Phase C/D kickoff.
  2. Publish explicit readiness posture and owner-assigned blockers/order.
- Acceptance:
  1. Next-phase kickoff posture is explicit (`ready`/`not-ready`).
  2. Deferred register remains centralized and non-contradictory.

## Deferred (Non-Blocking for Phase B)
1. D-016 UX/productization mechanics.
2. Cross-instance storage-lock redesign.
3. Expanded telemetry beyond pragmatic gate diagnostics.
4. D-009 stricter middleware dedupe lock.
5. D-010 stricter Inngest `finished`-hook policy.
6. Global-owner fallback UX exposure polish.

## First-Failure Signals (Watchlist)
1. `B0`: first-party RPC false-deny or spoofed-header bypass.
2. `B1`: `/api/workflows/coordination/*` returning `404/500` or exposing non-workflow procedures.
3. `B2`: import-cycle/coupling regression between app and manifest/package seams.
4. `B3`: gates pass while structural ownership drift still exists.
5. `B4A`: broad refactor pressure starts reopening locked architecture decisions.

## Branch/Worktree Contract
1. Parent branch: `codex/phase-b-cleanup-phase-a-agent-artifacts`
2. Planning branch: `codex/phase-b-planning-packet`
3. Planning worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-planning-packet`
4. Implementation branch (next pass): `codex/phase-b-runtime-implementation`
5. Graphite safety: `gt sync --no-restack` only; submit each slice branch with `gt submit --ai`.

## Entry Gates
See `PHASE_B_ACCEPTANCE_GATES.md` for exact quick/full cadence and exit contract.
