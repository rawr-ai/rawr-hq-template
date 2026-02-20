# Phase A Execution Plan (Forward-Only)

## Purpose
Deliver a decision-complete, implementation-ready Phase A migration plan that converges runtime behavior toward locked D-013/D-015/D-016 policy while keeping Phase A narrow, additive, and forward-moving.

## Fixed Decisions for Phase A (No Implementer Ambiguity)
1. `/api/workflows/<capability>/*` **is in Phase A scope** and will be introduced additively.
2. `/api/inngest` remains runtime-ingress-only and never caller-facing.
3. Ingress signature verification is implemented as a host-level guard in server composition (`apps/server/src/rawr.ts`) with test assertions.
4. Metadata contract enforcement across duplicated discovery paths is owned by a single `Plugin Lifecycle Owner`; implementation must use a shared contract/parser module to avoid drift.
5. Harness suite/gate contract failures are hard-fail by the end of Slice A1 (one baseline-only pass in A0 is allowed for measurement, not for shipping).
6. Compatibility bridge shims are time-boxed and removed within Phase A.

## Scope In
1. Runtime identity hardening to `rawr.kind` + `rawr.capability` + manifest registration.
2. Additive route-family convergence including `/api/workflows/<capability>/*`.
3. Request-scoped boundary context seam and explicit host mount/control ordering.
4. Plugin discovery/runtime lifecycle coverage for `plugins/api/*` and `plugins/workflows/*`.
5. D-015 gate enforcement with mandatory route-family negative assertions.
6. D-016 seam-now enforcement: alias/instance assertions and no-singleton-global assertions.

## Scope Out
1. Rollback playbooks, rollback matrices, release-branch choreography.
2. Full D-016 UX/packaging productization.
3. Downstream docs/runbook execution beyond this planning package.
4. Broad refactors unrelated to Phase A convergence obligations.
5. Deferred work is tracked only in the canonical `Deferred Register` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/_phase-a-implementation-planning-pass-01-2026-02-20/PHASE_SEQUENCE_RECONCILIATION.md`.

## Owner Model
1. `Runtime/Host Composition Owner`: host mount ordering, route registration, ingress guard, context factories.
2. `Plugin Lifecycle Owner`: metadata contract, discovery roots, shared parser/contract extraction.
3. `Verification & Gates Owner`: CI gates, negative-route matrix, harness completeness.
4. `Distribution/Lifecycle Contract Owner`: D-016 seam assertions and shim retirement enforcement.

## Owner Resolution Bindings (Decision-Complete)
Implementers must use these bindings; owner reassignment is out of scope for Phase A.

| Role | Primary handle/alias | Backup approver | Decision SLA |
| --- | --- | --- | --- |
| Runtime/Host Composition Owner | `@rawr-runtime-host` | `@rawr-platform-duty` | 1 business day (4 business hours for gate-breaking issues) |
| Plugin Lifecycle Owner | `@rawr-plugin-lifecycle` | `@rawr-architecture-duty` | 1 business day |
| Verification & Gates Owner | `@rawr-verification-gates` | `@rawr-release-duty` | 4 business hours for CI/gate blockers, 1 business day otherwise |
| Distribution/Lifecycle Contract Owner | `@rawr-distribution-lifecycle` | `@rawr-runtime-host` | 1 business day |

Escalation rule: if SLA is missed, backup approver becomes acting decision owner for that decision.

## Slice Plan and Dependencies

### Slice A0 — Baseline and Gate Scaffolding
- Owner: Verification & Gates.
- Depends on: none.
- Deliverables:
  1. Establish `manifest-smoke-baseline`, `manifest-smoke-completion`, `metadata-contract`, `import-boundary`, `host-composition-guard`, `route-negative-assertions`, `harness-matrix` checks.
  2. Capture baseline metrics for legacy metadata runtime reads and forbidden-route coverage.
- Exit criteria:
  1. All checks run in CI.
  2. Baseline report published.

### Slice A1 — Metadata Contract Shift (D-013)
- Owner: Plugin Lifecycle.
- Depends on: A0.
- Deliverables:
  1. Runtime decisions keyed only by `rawr.kind` + `rawr.capability` + manifest surface.
  2. Legacy fields preserved as compatibility-read telemetry only.
  3. Shared metadata parser/contract module extracted and consumed by both `packages/hq` and `plugins/cli/plugins` paths.
- Exit criteria:
  1. `metadata-contract` hard-fails on legacy runtime branching.
  2. Shared parser is the only runtime metadata interpretation path.

### Slice A2 — Discovery Surface Expansion
- Owner: Plugin Lifecycle.
- Depends on: A1.
- Deliverables:
  1. Discovery roots include `plugins/api/*` and `plugins/workflows/*`.
  2. Lifecycle/listing behavior remains stable for existing roots.
- Exit criteria:
  1. Discovery tests cover API/workflow fixtures.
  2. No behavior regressions for existing plugin categories.

### Slice A3 — Host Context and Ingress Hardening
- Owner: Runtime/Host Composition.
- Depends on: A0.
- Deliverables:
  1. Request-scoped boundary/workflow context factories replace static route context.
  2. Explicit mount order: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
  3. Signed ingress guard for `/api/inngest`.
- Exit criteria:
  1. No static process-level route context object.
  2. Host composition guard passes.
  3. Ingress signature positive/negative tests pass.

### Slice A4 — Additive Workflow Boundary Route Family
- Owner: Runtime/Host Composition.
- Depends on: A2, A3.
- Deliverables:
  1. Add `/api/workflows/<capability>/*` from manifest-owned composition.
  2. Preserve caller/runtime split and no `/rpc/workflows` default.
- Exit criteria:
  1. Workflow trigger/status caller paths pass on new family.
  2. Caller-path access to `/api/inngest` remains forbidden.

### Slice A5 — Harness Matrix and Negative Assertions (D-015)
- Owner: Verification & Gates.
- Depends on: A3, A4.
- Deliverables:
  1. Persona-wise forbidden-route assertions are mandatory.
  2. Route-family coverage suites for `/rpc`, `/api/orpc/*`, `/api/workflows/*`, `/api/inngest` are complete.
- Exit criteria:
  1. CI fails if any required negative assertion is missing.
  2. Harness matrix gate is green.

### Slice A6 — D-016 Seam Enforcement and Shim Removal
- Owner: Distribution/Lifecycle Contract.
- Depends on: A1, A5.
- Deliverables:
  1. Alias/instance seam assertions integrated into verification.
  2. No-singleton-global assertions integrated.
  3. Remove compatibility-read runtime shims.
- Exit criteria:
  1. Legacy metadata runtime read count remains zero for 7 consecutive days, validated by the measurement contract below.
  2. Alias/instance + no-singleton assertions are green.

## Seven-Day Zero-Read Measurement Contract
1. Metric/event name: `phase_a.legacy_metadata_runtime_read`.
2. Data source: CI-produced JSONL artifact `artifacts/phase-a/legacy-metadata-events.ndjson`.
3. Query/check expression:
```sh
jq -s --arg start "$WINDOW_START_UTC" --arg end "$WINDOW_END_UTC" '
  map(select(.event == "phase_a.legacy_metadata_runtime_read" and .ts >= $start and .ts < $end))
  | length == 0
' artifacts/phase-a/legacy-metadata-events.ndjson
```
4. Window semantics: rolling 7 full UTC calendar days; evaluate once per UTC day boundary with `WINDOW_START_UTC = WINDOW_END_UTC - 7 days`.
5. Owning verifier: `Verification & Gates Owner` (`@rawr-verification-gates`).

## Time-Boxed Compatibility Bridge
1. Start: 2026-02-20.
2. Midpoint checkpoint: 2026-02-27.
3. Final checkpoint: 2026-03-03.
4. Hard bridge expiry and shim removal: 2026-03-06.

## Forward-Only Control Rules
1. No rollback planning artifacts.
2. No branch-level defensive dual-track rollout model.
3. Drift response is fail-fast gate remediation.
4. Deferred items remain deferred unless they block Phase A exit criteria, and defer state must be updated only in the canonical `Deferred Register` in `PHASE_SEQUENCE_RECONCILIATION.md`.

## Required Inputs to Implementation Teams
1. `PHASE_A_INTERFACE_DELTAS.md`
2. `PHASE_A_WORKBREAKDOWN.yaml`
3. `PHASE_A_ACCEPTANCE_GATES.md`
4. `PHASE_SEQUENCE_RECONCILIATION.md` (canonical `Deferred Register`)
