# Root Undo Workstream Review Ledger

Status: `complete`.
DRA: `Codex`.

This ledger records review findings for the undo implementation workstream.
Preparation-packet findings remain in
`docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`; this file tracks
plan/implementation review inside the lane execution branch.

## Source Findings Consumed

### F-02-01: Undo Lifecycle Helper Was Not Public API

Disposition: `accepted upstream input`.

Repair demand carried into this workstream: export
`expireUndoCapsuleOnUnrelatedCommand` through `@rawr/agent-config-sync/undo` and
test that public surface.

### F-02-02: Upstream Undo Behavior Tests Were Missing

Disposition: `accepted upstream input`.

Repair demand carried into this workstream: add service-level behavior tests for
success, dry-run preservation, no capsule, unsupported provider, failed
operation, and related/unrelated command expiration where applicable to current
service boundaries.

### F-02-03: Undo JSON And Dry-Run Contract Was Under-Specified

Disposition: `accepted upstream input`.

Repair demand carried into this workstream: add CLI tests for success JSON,
service failure JSON, missing workspace root JSON/exit `2`, service failure exit
`1`, human output, and dry-run preservation.

## Active Findings

### U-PLAN-01: Service `runUndo` Behavior Proof Was Under-Carried

Finding: The initial plan under-carried F-02-02 by emphasizing the public
lifecycle export while leaving service `runUndo` behavior cases less explicit
than the accepted source finding.

Evidence: Poincare and Bacon both compared the plan's service test contract to
F-02-02 in the preparation review ledger.

Severity: `P1`

Disposition: `accepted`

Confidence: `high`

Repair demand: Add explicit service-level acceptance for successful dry-run,
successful apply-and-clear, no capsule, unsupported provider, failed replay
operation, and related/unrelated expiration. Do not allow CLI tests to
substitute for service behavior tests.

Next Packet consequence: Completion audit must map each F-02-02 case to a
specific service test.

### U-PLAN-02: Capsule Proof Could Pass With Hand-Seeded Fiction

Finding: The initial plan allowed temp capsules but did not require a proof that
uses the public capture path that plugin sync uses.

Evidence: Bacon flagged that hand-written manifests could prove JSON rendering
while missing capture/storage/replay boundary behavior.

Severity: `P1`

Disposition: `accepted`

Confidence: `high`

Repair demand: Require at least one temp-workspace proof where a capsule is
created through `beginPluginsSyncUndoCapture` from
`@rawr/agent-config-sync/undo`, then consumed by root `rawr undo`, including
dry-run preserve, non-dry-run clear, and nested-cwd workspace-root resolution.

Next Packet consequence: If implementation cannot prove public capture to root
CLI replay, the lane is not complete.

### U-PLAN-03: Root CLI Dependency Change Was Hidden

Finding: The plan required root CLI imports of `@rawr/agent-config-sync` and
`@rawr/agent-config-sync-node` without naming `apps/cli/package.json` as an
expected touch surface.

Evidence: Poincare and Bacon both found that current `apps/cli/package.json`
does not declare either dependency.

Severity: `P2`

Disposition: `accepted`

Confidence: `high`

Repair demand: Add `apps/cli/package.json` and possible `bun.lock` updates to
the plan, and require `@rawr/cli:sync` plus `@rawr/cli:build` closure gates if
the package manifest changes.

Next Packet consequence: Completion audit must verify dependency declarations,
not rely on typecheck alone.

### U-PLAN-04: Entrypoint Nonblocking Lifecycle Proof Was Too Weak

Finding: The initial plan required nonblocking lifecycle behavior but did not
pin proof at the root entrypoint level where failures must be swallowed before
OCLIF dispatch.

Evidence: Bacon compared the initial plan to downstream entrypoint behavior and
flagged helper-level tests as insufficient.

Severity: `P2`

Disposition: `accepted`

Confidence: `high`

Repair demand: Require an entrypoint-level or extracted-main test that forces
the lifecycle call to fail and proves a harmless command still executes and
exits normally.

Next Packet consequence: A helper-only nonblocking test is not enough for
closure.

### U-RISK-01: External Source Workspace Undo Needs Explicit Boundary

Finding: Current plugin sync writes undo capsules under the selected source
workspace root. Root `rawr undo` resolves the active workspace root. For
external `--source-workspace`, the operator may need to run undo from the source
workspace or set `RAWR_WORKSPACE_ROOT`.

Evidence: Bohr flagged the mismatch risk; current plugin sync sets
`workspaceRoot = sourceWorkspace.sourceWorkspaceRoot` before starting undo
capture, while root workspace lookup uses `@rawr/core`.

Severity: `P2`

Disposition: `accepted`

Confidence: `medium-high`

Repair demand: Keep this lane's public surface to the fixed `rawr undo`
contract, prove same-workspace and nested-cwd cases, and record the external
source-workspace caveat as a plugin-sync hint/docs follow-up unless DRA expands
the command surface.

Next Packet consequence: Plugin-sync lane should revisit external
`--source-workspace` hint wording after root undo lands.

### U-IMPL-01: Missing-Workspace Human Output Omitted Error Code

Finding: The first full `@rawr/cli:test` run failed because the human
missing-workspace path printed the message but not
`code: WORKSPACE_ROOT_MISSING`.

Evidence: `apps/cli/test/undo.test.ts` human missing-workspace assertion failed
before the DRA repair. The path used `RawrCommand.outputResult` without the
undo command's custom human renderer.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `apps/cli/src/commands/undo.ts` now routes the missing-workspace
failure through the same `renderHuman` function as service failures.

Verification:

- `bunx vitest run --project cli apps/cli/test/undo.test.ts`
- `bunx nx run @rawr/cli:test --skip-nx-cache`

Next Packet consequence: none; fixed in this lane.

## Implementation Review Status

Post-implementation review agents completed:

- Lovelace: code/behavior review.
- Pascal: closure evidence review.

Their findings are dispositioned below.

### U-IMPL-02: Required Service And Artifact Changes Were Uncommitted

Finding: Post-implementation reviewers found that branch `HEAD` only contained
the worker-created CLI commit while required service export/tests and lane
artifacts were still untracked or modified.

Severity: `P1`

Disposition: `accepted-fixed-at-closure`

Confidence: `high`

Repair demand: stage and commit every lane-owned implementation and artifact
file before closure. Do not submit or claim branch closure from the partial
CLI-only commit.

Next Packet consequence: none if final commit includes the remaining lane
files.

### U-IMPL-03: Sibling Graphite Branch Refs Were Aliased Onto Undo CLI Commit

Finding: `agent-devops-workstream-b-devops-migration`,
`agent-plugin-sync-workstream-b-sync-substrate-parity`, and
`agent-undo-workstream-b-undo-lane` all pointed at `6f0eb878` after the worker
used `gt commit create`.

Severity: `P1`

Disposition: `accepted-reported`

Confidence: `high`

Repair demand: do not run broad Graphite restacks or forced branch moves from
this lane while sibling branches are checked out in active worktrees. Report the
alias explicitly so sibling lane owners or the DRA can repair branch refs before
submit/drain if needed.

Next Packet consequence: Workstream B coordination must inspect sibling branch
refs before submitting or draining `devops` and `plugin-sync`.

### U-IMPL-04: Service Expiration Missing `workspaceRoot: null` Proof

Finding: The plan required proof that command expiration is non-clearing when
no workspace root is available. Initial service tests did not cover the
`workspaceRoot: null` branch.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `services/agent-config-sync/test/undo-behavior.test.ts` now
asserts `workspaceRoot: null` returns `{ cleared: false, reason:
"workspace-root-missing" }`.

Verification: `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`.

### U-IMPL-05: Related-Command Preservation Evidence Missed `sync`

Finding: The implementation accepted `sync` as a related token but initial
tests only proved `plugins sync` and `undo` behavior.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `services/agent-config-sync/test/undo-behavior.test.ts` now
asserts `argv: ["sync"]` preserves plugin-sync capsules.

Verification: `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`.

### U-IMPL-06: CLI Boundary Lacked Related `plugins sync` Preservation Proof

Finding: READINESS asked for CLI related/unrelated lifecycle behavior. Initial
CLI tests proved unrelated `doctor` expiration and `undo` indirectly, but did
not prove `plugins sync` at the root entrypoint.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `apps/cli/test/undo.test.ts` now verifies `plugins sync --help`
preserves a public-captured capsule before dispatch.

Verification: `bunx vitest run --project cli apps/cli/test/undo.test.ts`.

### U-IMPL-07: Human Service-Failure Details Were Not Rendered

Finding: Human failure output printed error and code but not details, while the
spec required service error code/details in human and JSON modes.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `apps/cli/src/commands/undo.ts` now renders details when
present, and `apps/cli/test/undo.test.ts` verifies unsupported-provider details
in human mode.

Verification: `bunx vitest run --project cli apps/cli/test/undo.test.ts`.

### U-IMPL-08: Lifecycle Cleared Unsupported-Provider Capsule Before `rawr undo`

Finding: The unsupported-provider CLI test revealed that lifecycle expiration
cleared non-plugin capsules before `rawr undo`, causing the command to report
`UNDO_NOT_AVAILABLE` instead of letting the service return
`UNDO_PROVIDER_UNSUPPORTED`.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied:
`services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts`
now preserves `undo` invocations before provider-specific related-command
handling.

Verification:

- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
- `bunx vitest run --project cli apps/cli/test/undo.test.ts`

### U-IMPL-09: Implementation Plan Retained Stale Opening-State Language

Finding: The implementation plan was marked as implemented but still used
"current state" language for surfaces that were already implemented in this
branch.

Severity: `P2`

Disposition: `accepted-fixed`

Confidence: `high`

Repair applied: `IMPLEMENTATION_PLAN.md` now names that section `Opening
State` and describes the listed gaps as workstream-opening facts.

Next Packet consequence: none.
