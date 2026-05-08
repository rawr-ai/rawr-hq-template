# Root Undo Implementation Workstream

Status: `complete`.
Branch: `agent-undo-workstream-b-undo-lane`.
PR: `none`.
Baseline commit: `3623f6eb` at opening.
DRA: `Codex`.
Dates: `2026-05-08 -> complete`.

This record preserves state and handoff context for the bounded `undo` lane
implementation workstream. It is not a new cross-lane sequence authority.

## Workstream State

Workstream record path:
`docs/projects/workstream-b-preparation/lanes/undo/WORKSTREAM_RECORD.md`

Status: implementation complete; lane-owned changes are committed.

DRA: Codex.

Branch/stack at opening:

```text
agent-undo-workstream-b-undo-lane @ 3623f6eb
main @ 3623f6eb
```

Current phase: closure.

Selected skills:

- `parallel-development-workflow`
- `framing-design`
- `solution-design`
- `team-design`
- `workstream-runner`
- `workstream-review-loops`

Selected agents:

| Agent | Lane | Status |
| --- | --- | --- |
| Meitner | implementation mapper | complete |
| Locke | test mapper | complete |
| Bohr | boundary/risk red-team | complete |
| Poincare | plan review | complete |
| Bacon | adversarial plan review | complete |
| Harvey | service implementation worker | complete |
| Raman | CLI implementation worker | complete |
| Lovelace | post-implementation code review | complete |
| Pascal | closure evidence review | complete |

Selected hooks: none.

## Frame

Objective: implement upstream root `rawr undo` as a root CLI projection over
service-owned `services/agent-config-sync` undo behavior, with best-effort undo
capsule expiration before unrelated commands.

Containment boundary:

- Work only in the `undo` lane branch/worktree.
- Implement upstream template behavior.
- Use downstream `RAWR HQ` files only as behavior evidence.
- Keep downstream files read-only.

Primitive boundary: this is one lane workstream inside Workstream B. Other
Workstream B lanes and final downstream sunset are outside this workstream.

Non-goals:

- Do not revive or import upstream `@rawr/agent-sync`.
- Do not remove downstream undo files.
- Do not broaden undo beyond plugin-sync capsules.
- Do not run real/global plugin sync or link repair as validation.
- Do not redesign `agent-config-sync` service architecture.

Done means:

- `rawr undo` exists in `apps/cli`.
- The command binds to `services/agent-config-sync` via Node resources.
- `apps/cli` declares any direct service/resource dependencies it imports.
- `expireUndoCapsuleOnUnrelatedCommand` is exported from
  `@rawr/agent-config-sync/undo`.
- Root CLI lifecycle expiration runs before command execution and is
  best-effort/nonblocking.
- Related commands preserve capsules: `undo`, `plugins sync`, and `sync`.
- JSON/human success and failure behavior is tested.
- Missing workspace root exits `2` with `WORKSPACE_ROOT_MISSING`.
- Service failure exits `1` with service error code/details.
- Dry-run preserves capsule/provider state and reports `undo.dryRun`.
- Required Nx tests/typechecks pass or any skipped gate has explicit rationale.
- `@rawr/cli` package sync/build gates pass if the package manifest changes.
- Repo and Graphite state are clean at closure.

## Opening Packet

Opening input:

- User instruction to run the lane workstream end-to-end as DRA.
- Workstream B `NEXT_PACKET.md`.
- Undo lane `READINESS.md`, `DISCOVERY.md`, `SPEC.md`, and `ROUGH_PLAN.md`.
- Prior frame for the undo lane.

Authority inputs:

- Current user decision in this workstream.
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`.
- Current upstream code on `main`/this branch.
- Current downstream code after Workstream A as behavior evidence only.
- Accepted F-02 findings in `REVIEW_LEDGER.md`.

Authority order:

1. Current user decision in this workstream.
2. `AUTHORITY_MAP.md`.
3. Current upstream code.
4. Current downstream code after Workstream A.
5. Accepted F-02 findings.
6. Undo lane packet evidence.
7. Old docs only as stale/evidence inputs.

Coordination inputs:

- This branch is scoped to the undo lane.
- Sibling Workstream B lane branches exist; do not change their parents or
  implementation state.
- `plugin-sync` should consume the settled undo public surface later.

Evidence inputs:

- `git status --short --branch`
- `gt ls`
- `bunx nx show project @rawr/cli --json`
- `bunx nx show project @rawr/agent-config-sync --json`
- `bunx nx show project @rawr/agent-config-sync-node --json`
- Current service, CLI, test, and downstream evidence file reads.

Excluded or stale inputs:

- Downstream `@rawr/agent-sync` implementation details are not upstream
  authority.
- Stale docs that imply ongoing downstream shared-tooling authority are not
  target-state authority.

Control inputs:

- Graphite-first branch/stack workflow.
- No global `gt sync` without `--no-restack`.
- Keep repo clean.
- Use temp fixtures for capsule/CLI tests.

Stop/escalation conditions:

- Current `agent-config-sync` no longer exposes the expected `runUndo` contract.
- Lifecycle expiration cannot remain best-effort.
- Workspace-root resolution cannot match capsule storage.
- Implementation pressure would require upstream `@rawr/agent-sync`.
- Another active lane edits the same undo public API in a conflicting way.

## Output Contract

Required outputs:

- `docs/projects/workstream-b-preparation/lanes/undo/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/undo/REVIEW_LEDGER.md`
- Root CLI/service implementation changes.
- Tests covering F-02 accepted findings.
- Updated workstream record at phase changes and closure.

Optional outputs:

- Targeted docs update if command references need adjustment.
- `NEXT_PACKET.md` only if handoff remains after closure.

Claim strength / evidence class: source-backed implementation plus test-backed
behavior claims.

Surfaces touched:

- `apps/cli/**`
- `services/agent-config-sync/**`
- `packages/agent-config-sync-node/**` only if resource exports prove
  insufficient.
- `apps/cli/package.json` and `bun.lock` if the CLI imports new workspace
  packages.
- Lane-local workstream artifacts.

Expected gates:

- `bunx nx run @rawr/agent-config-sync:test`
- `bunx nx run @rawr/agent-config-sync-node:test`
- `bunx nx run @rawr/cli:sync`
- `bunx nx run @rawr/cli:test`
- `bunx nx run @rawr/cli:build`
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli`

## Workflow

Preflight:

- Confirm current branch, stack, and clean status.
- Confirm latest baseline includes already-merged prerequisite work.
- Re-read workstream and undo lane packets.

Investigation lanes:

- Implementation mapper: service/CLI binding and current-code drift.
- Test mapper: service/CLI fixture and assertion strategy.
- Boundary/red-team: authority, lifecycle, workspace-root, and provider-mutation
  risks.

Phase teams:

- DRA synthesizes plan.
- Red-team reviews plan before code.
- Worker agents may implement disjoint code/test slices after plan repair.
- Review agents inspect implementation before closure.

Design lock:

- Use `services/agent-config-sync` as undo authority.
- Use `apps/cli` as root projection.
- Export lifecycle helper through `@rawr/agent-config-sync/undo`.
- Keep lifecycle expiration best-effort.
- Keep downstream read-only.

Agent packets: stored in chat; material findings recorded in this ledger.

Wave packets: ad hoc per phase if additional worker wave is needed.

Scratch policy: no durable scratch outside lane-local artifacts; temp fixtures
only for tests.

## Findings

See `REVIEW_LEDGER.md`.

## Implementation Summary

Implemented surfaces:

- `apps/cli/src/commands/undo.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/lib/agent-config-sync-client.ts`
- `apps/cli/src/lib/undo-lifecycle.ts`
- `apps/cli/test/undo.test.ts`
- `apps/cli/package.json`
- `bun.lock`
- `services/agent-config-sync/src/undo.ts`
- `services/agent-config-sync/test/undo-behavior.test.ts`

Behavior delivered:

- Root `rawr undo` is registered under `apps/cli`.
- The command resolves the active workspace root through `@rawr/core`.
- The command calls `agent-config-sync.undo.runUndo` through an in-process
  service client and Node resource adapter.
- Missing workspace root exits `2` and emits `WORKSPACE_ROOT_MISSING` in JSON
  and human modes.
- Service failure exits `1` and emits service error code/details.
- Successful dry-run reports service-shaped undo data and preserves files and
  capsule state.
- Successful non-dry-run undo applies service replay semantics and clears the
  active capsule.
- Root CLI startup expires plugin-sync undo capsules before unrelated commands.
- Lifecycle expiration is best-effort and nonblocking at the entrypoint.
- `undo` preserves active capsules before service provider validation.
- `plugins sync` and `sync` preserve plugin-sync capsules.
- Human failures include error, code, and details when details are present.
- Root CLI imports only the public `@rawr/agent-config-sync/undo` surface for
  lifecycle behavior; it does not import service internals or revive
  `@rawr/agent-sync`.

Implementation notes:

- A worker-created Graphite commit (`6f0eb878 feat(cli): add root undo
  projection`) unintentionally moved two sibling Workstream B branch refs onto
  the CLI commit during `gt commit create`. The DRA did not perform broad
  restacks afterward. Final cleanup must report this sibling-branch state
  explicitly and avoid mutating sibling lanes.
- The external `plugins sync --source-workspace <path>` undo-location caveat
  remains a plugin-sync lane follow-up, not an expanded public surface in this
  undo lane.

## Verification Record

Passed checks:

- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
  - 5 files, 52 tests.
- `bunx nx run @rawr/agent-config-sync-node:test --skip-nx-cache`
  - 3 files, 19 tests.
- `bunx vitest run --project cli apps/cli/test/undo.test.ts`
  - 1 file, 12 tests.
- `bunx nx run @rawr/cli:sync --skip-nx-cache`
- `bunx nx run @rawr/cli:build --skip-nx-cache`
- `bunx nx run @rawr/cli:test --skip-nx-cache`
  - 24 files, 73 tests.
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli --skip-nx-cache`
- `git diff --check`
- `rg -n "@rawr/agent-sync" apps/cli services/agent-config-sync packages/agent-config-sync-node -g '!**/dist/**'`
  - no matches.
- `rg -n "service/modules/undo/helpers" apps/cli packages/agent-config-sync-node -g '!**/dist/**'`
  - no matches.

## Outcome Record

Objective outcome: `implemented`.

Residual objective gaps:

- Graphite sibling branch refs are still aliased to the first undo-lane CLI
  commit in active sibling worktrees; final reporting must call this out.

Implementation summary: see above.

Decisions:

- Keep root `rawr undo` a CLI projection over `services/agent-config-sync`.
- Keep lifecycle API narrow through `@rawr/agent-config-sync/undo`.
- Treat downstream `@rawr/agent-sync` only as behavior evidence.
- Keep external `--source-workspace` undo hint refinement in the plugin-sync
  lane unless the public surface is deliberately expanded later.

Evidence: source changes and verification record above.

Verification: complete.

## Deferred Inventory

None yet.

## Review Result

Leaf loops: complete.

Composed loops: complete.

Waivers: none.

Invalidations: none.

Repair demands: accepted findings fixed or explicitly reported.

Closure steward result: complete with sibling-branch Graphite caveat.

## Final Output

Artifacts:

- `WORKSTREAM_RECORD.md`
- `IMPLEMENTATION_PLAN.md`
- `REVIEW_LEDGER.md`

Verification run: complete; see Verification Record.

Repo/Graphite state: lane-owned work committed; sibling branch refs remain
aliased to the first undo CLI commit in active sibling worktrees and were not
force-moved from this lane.

## Next Packet

No follow-up packet is required for the undo lane. The only cross-lane note is
for Workstream B coordination: inspect and repair sibling branch refs before
submitting or draining `agent-devops-workstream-b-devops-migration` and
`agent-plugin-sync-workstream-b-sync-substrate-parity`.
