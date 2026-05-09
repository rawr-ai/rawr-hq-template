# DevOps Migration Review Findings

Status: `closed`.
DRA: `Codex`.
Date: `2026-05-08`.

This file records material review findings and DRA disposition for the DevOps
migration lane. Findings are not complete until dispositioned.

Closure disposition: all recorded findings were accepted by the DRA and
repaired in the final implementation. No finding is waived, rejected,
invalidated, or deferred in this lane.

## Finding F-DEVOPS-001: Worktree Cleanup Candidate Scope Too Broad

Finding: Downstream worktree cleanup uses substring matching against the
worktree basename or full path, then can run `git worktree remove` and
`git worktree prune`. That is too broad for shared template tooling.

Evidence:

- Downstream `packages/dev/src/worktree/cleanup.ts` filters by
  `baseName.includes(input.prefix) || entry.path.includes(input.prefix)`.
- DevOps lane spec originally required "never remove current worktree" and
  "default merged-only," but did not require strict candidate semantics.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: implementation must use strict basename prefix semantics, current
worktree exclusion, repo identity checks, configurable trunk, pinned/live
exclusions, stale metadata handling, and tests proving substring matches do not
remove unrelated worktrees.

Record section target: `IMPLEMENTATION_PLAN.md` decisions D-05 and Slice 2.

Next Packet consequence: downstream sunset must not remove personal DevOps
cleanup until upstream strict cleanup behavior is proven.

## Finding F-DEVOPS-002: Repo Sync Needs Explicit Graphite-Safety Contract

Finding: Downstream repo sync uses raw `git switch -c` and `git merge --no-ff`
inside a Graphite-owned workflow. The upstream plan must not normalize this
without explicit preflights and exception rationale.

Evidence:

- Downstream `packages/dev/src/repo-sync/upstream.ts` plans and executes
  `git fetch upstream`, `git switch -c`, `git merge --no-ff`, `gt sync
  --no-restack`, and `gt restack --upstack`.
- Lane spec said "prefer Graphite commands" but also said to bring the flow
  upstream.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.88`

Repair demand: implementation must model dirty-state checks, branch-collision
checks, explicit Graphite commands, dry-run planning, and a written distinction
between raw local Git branch/merge operations and Graphite stack mutation.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-04.

Next Packet consequence: future DRA must not treat repo sync as safe until
branch-collision and dirty-state tests pass.

## Finding F-DEVOPS-003: JSON Contract Was Named But Not Specified

Finding: Existing lane docs required JSON fixture contracts but did not define
stable fields, warning/error codes, dry-run shapes, exit status rules, or
fixture names.

Evidence:

- `packages/core/src/cli/rawr-command.ts` defines a generic envelope.
- DevOps `SPEC.md` only required JSON to be "fixture-backed and stable enough."

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: implementation plan must include per-command JSON data fields,
failure codes, exit rules, dry-run/applied shapes, and fixture filenames before
code claims parity.

Record section target: `IMPLEMENTATION_PLAN.md` JSON Contract.

Next Packet consequence: no closure without fixture-backed JSON contract tests.

## Finding F-DEVOPS-004: CLI Surface Could Be Proxied By Package Tests

Finding: Package-level tests can pass without proving that `rawr dev ...` is
available through the actual upstream CLI.

Evidence:

- Upstream had no `@rawr/plugin-devops` project in `vitest.config.ts`.
- `apps/cli/package.json` explicitly registers oclif plugins.
- Downstream DevOps has only narrow package tests plus app-level command
  surface evidence.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: implementation must update `vitest.config.ts`,
`apps/cli/package.json`, and root project lists, and add an app-level CLI
discovery/JSON test using the actual `apps/cli/src/index.ts` entrypoint.

Record section target: `IMPLEMENTATION_PLAN.md` slices 3 and 4.

Next Packet consequence: package tests alone are not enough for lane closure.

## Finding F-DEVOPS-005: Scratch Policy Needs Template Contract Decision

Finding: Downstream scratch policy is a personal workflow guard. Promoting it
upstream without deciding contract shape would make personal convention into
implicit template law.

Evidence:

- Downstream `packages/dev/src/scratch-policy/check.ts` scans
  `docs/projects` for `PLAN_SCRATCH.md` / `WORKING_PAD.md` and personal
  variants.
- Lane docs only said to review path/depth assumptions.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.84`

Repair demand: DRA decision required. This workstream accepts scratch policy as
a template workflow guard only if roots and filenames are configurable and docs
state the generic contract first.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-03.

Next Packet consequence: downstream personal scratch naming remains
compatibility input, not the canonical upstream concept.

## Finding F-DEVOPS-006: Reserved No-Op Flags Should Not Migrate

Finding: Downstream `stack drain` exposes `--allow-salvage` and
`--allow-direct-merge`, but only emits warnings that they are reserved for
future behavior.

Evidence:

- Downstream `plugins/cli/devops/src/commands/dev/stack/drain.ts` defines those
  flags and emits warnings instead of behavior.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: do not migrate those flags until behavior and JSON contracts
exist.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-06.

Next Packet consequence: future expansion of salvage/direct-merge requires a
new contract, not hidden compatibility.

## Finding F-DEVOPS-007: Applied Cleanup Still Allowed Global Worktree Prune

Finding: the first implementation plan repair forbade prune during dry-run but
still left room for applied `git worktree prune`, which can affect stale
metadata outside the selected cleanup candidates.

Evidence:

- Plan review noted `IMPLEMENTATION_PLAN.md` only said "no pruning during
  dry-run."
- Downstream cleanup runs `git worktree prune` after removing candidates.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: this lane must not run `git worktree prune` by default in dry-run
or applied cleanup. Stale metadata cleanup requires a future explicit
flag/command and scoped tests proving unrelated metadata is untouched.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-05.

Next Packet consequence: any future stale-metadata cleanup must be a distinct
safety-reviewed behavior.

## Finding F-DEVOPS-008: Plan Review Requires Stronger Implementation Start Gate

Finding: the devops branch is equal to current `main`, but Graphite metadata
cannot be inspected or normalized in this sandbox because the main checkout's
`.git` metadata is not writable. The workstream must not overclaim Graphite
cleanliness.

Evidence:

- `git rev-parse --short HEAD` showed `b322aa80`, same as `main` /
  `origin/main`.
- `gt ls` fails in this sandbox with a `.git/.graphite_pr_info` permission
  error.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: code implementation may proceed from the current clean Git tree,
but final submit/closure must run Graphite checks in a session where repo
metadata is writable and record the result. Do not claim Graphite stack health
from this sandbox.

Record section target: `WORKSTREAM_RECORD.md` and final completion audit.

Next Packet consequence: if handoff occurs before submit, first action is to
run `gt ls` / `gt status` from a writable Graphite session.

## Finding F-DEVOPS-009: Mutating Commands Need Explicit Apply Gate

Finding: the plan still allowed `stack drain`, `repo sync-upstream`, and
`worktree cleanup` to mutate by default unless `--dry-run` was supplied.

Evidence:

- Downstream `stackDrain` runs Graphite publish/merge/sync in applied mode.
- Downstream `cleanupWorktrees` removes worktrees in applied mode.
- Shared template tooling should not require users or agents to remember
  `--dry-run` to avoid destructive behavior.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.92`

Repair demand: mutating commands must default to planning and require explicit
`--apply` before branch creation, merge, Graphite mutation, worktree removal,
plugin convergence, or link healing.

Record section target: `IMPLEMENTATION_PLAN.md` decisions D-07 and test plan.

Next Packet consequence: no implementation may close without tests proving
default invocations do not mutate.

## Finding F-DEVOPS-010: Repo Sync Default Ref Was Downstream-Specific

Finding: downstream `repo sync-upstream` defaults to `upstream/main`, but this
template repo commonly has `origin/main` and `personal/main` refs, not an
`upstream` remote.

Evidence:

- Local branch output showed `origin/main` and `personal/main`.
- Downstream implementation uses `input?.upstreamRef ?? "upstream/main"`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: define portable ref resolution through explicit flag, git config
`rawr.upstreamRef`, then default `origin/main`; test missing refs.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-08.

Next Packet consequence: downstream sync semantics must not be copied as
template defaults.

## Finding F-DEVOPS-011: Spawned CLI Tests Need A Real Test Seam

Finding: app-level spawned CLI tests cannot use normal in-process mocks. Without
a formal test seam they may accidentally call real `git`, `gt`, worktree, sync,
or link repair commands.

Evidence:

- Existing app-level tests spawn `bun apps/cli/src/index.ts`.
- Plan only said "environment variables or injected fixtures."

Severity: `P2`

Disposition: `accepted`

Confidence: `0.88`

Repair demand: implement a test-only command-runner fixture seam visible across
spawned processes and assert forbidden real commands are not invoked.

Record section target: `IMPLEMENTATION_PLAN.md` Slice 4 and test plan.

Next Packet consequence: app-level CLI proof must demonstrate both visibility
and non-mutation.

## Finding F-DEVOPS-012: Service Public Exports Need Pinning

Finding: downstream command code imports public `@rawr/dev` subpaths, but the
plan originally listed source files without pinning the service export surface.

Evidence:

- Downstream `@rawr/plugin-devops` imports `@rawr/dev/repo-sync`,
  `@rawr/dev/worktree`, and `@rawr/dev/graphite`.
- Upstream package conventions use explicit `exports` entries.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.86`

Repair demand: define `@rawr/dev` service-style public subpath exports
(`.`, `./client`, `./types`, `./service/contract`, `./router`) and rely on
typecheck to prove plugin imports use public boundaries. If `@rawr/dev-node`
exists, it must export host adapters only.

Record section target: `IMPLEMENTATION_PLAN.md` decision D-09.

Next Packet consequence: future downstream sunset can compare imports against
the upstream public package surface.

## Finding F-DEVOPS-013: Plain Package Port Violates Service Boundary Pattern

Finding: the initial implementation direction treated `@rawr/dev` as a plain
package that owned process execution, filesystem scanning, and domain semantics.
That repeats downstream structure instead of matching the upstream golden
service pattern.

Evidence:

- `services/agent-config-sync` owns semantics behind `base.ts`, `contract.ts`,
  `impl.ts`, `router.ts`, and `client.ts`.
- `packages/agent-config-sync-node` supplies host resources separately.
- Judgment review flagged direct `node:child_process` / `node:fs` use in the
  provisional package as a no-go.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: implement DevOps as `services/dev` (`@rawr/dev`) with typed
service contracts, injected resource ports, module routers, and a client.
Host resources must live in `@rawr/dev-node` or the CLI binding, not inside
service logic.

Record section target: `IMPLEMENTATION_PLAN.md` decisions D-01, D-02, D-09.

Next Packet consequence: downstream sunset must reference service parity, not
plain-package parity.

## Finding F-DEVOPS-014: CLI Projection Must Not Own DevOps Semantics

Finding: the initial command projection design put scratch policy, apply
gating, and result interpretation in `plugins/cli/devops`. Existing upstream
practice keeps CLI projections thin and binds service clients for semantics.

Evidence:

- `plugins/cli/plugins/src/lib/agent-config-sync-binding.ts` binds the
  `agent-config-sync` service with host resources.
- `plugins/cli/plugins` commands pass projection inputs and render results
  rather than owning destination sync semantics.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: `plugins/cli/devops` may own flags, workspace-root resolution,
host-resource binding, and `RawrCommand` rendering only. Graphite, repo-sync,
worktree cleanup, scratch-policy interpretation, and JSON DTOs belong to
`services/dev`.

Record section target: `IMPLEMENTATION_PLAN.md` D-02 and implementation slices.

Next Packet consequence: app-level CLI tests prove command availability and
binding, while service tests prove safety semantics.

## Finding F-DEVOPS-015: Applied Failures Must Fail Closed

Finding: second implementation review found that applied repo sync, stack
drain, and worktree cleanup could record failed command steps while the CLI
still exited successfully.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: service results must include execution status/issues and CLI
exit behavior must fail nonzero when execution fails.

## Finding F-DEVOPS-016: Repo Sync Needs Graphite Preflight Before Mutation

Finding: `repo sync-upstream --apply` could create/merge a branch before
proving Graphite stack state was readable.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: `repo sync-upstream` must check `gt ls` before `git fetch`,
`git switch -c`, or `git merge` can run.

## Finding F-DEVOPS-017: Stack Drain Must Not Force Sync Or Continue After Failure

Finding: `stack drain --apply` planned/executed `gt sync --force` and could
continue to sync after failed publish/merge.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: remove `--force` from DevOps stack drain and stop sequencing at
the first required command failure.

## Finding F-DEVOPS-018: Scratch Policy Must Be Runtime Configurable

Finding: service scratch policy was configurable only through direct service
inputs; the CLI/runtime path did not collect env/git config mode.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.86`

Repair demand: node/CLI projection must collect `RAWR_SKIP_SCRATCH_POLICY`,
`RAWR_SCRATCH_POLICY_MODE`, and `git config rawr.scratchPolicyMode` into the
service request while keeping interpretation service-owned.

## Finding F-DEVOPS-019: Ownership Docs Need Explicit DevOps Exception

Finding: `plugins/cli/devops/**` was listed as template-owned but the broad
personal-owned `plugins/cli/**` rule still captured it.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: add `plugins/cli/devops/**` as an explicit exception to the
personal operational plugin rule.

## Closure Evidence

The final implementation repairs the accepted findings as follows:

- `services/dev` owns DevOps semantics, DTOs, preflight, planning, and
  execution status.
- `packages/dev-node` owns Node command/filesystem resources and runtime
  scratch-policy input collection.
- `plugins/cli/devops` owns only command projection, service binding, and
  rendering.
- `apps/cli/test/devops-command-surface.test.ts` proves actual CLI discovery,
  default planning mode, non-mutation, nonzero applied failure, and sequencing
  stop behavior.
- `services/dev/test/dev-service.test.ts` proves service boundary shape,
  planning defaults, Graphite preflight, applied failure reporting, strict
  worktree prefix selection, and no default prune behavior.
- `AGENTS_SPLIT.md`, `docs/process/CROSS_REPO_WORKFLOWS.md`, and
  `scripts/githooks/template-managed-paths.txt` now mark DevOps as
  template-owned shared capability.

## Integration DRA Findings

## Finding F-DEVOPS-020: Process Adapter Failures Must Stay Structured

Finding: Integration review found that command spawn failures and timeouts
could reject from `packages/dev-node` instead of returning a failed
`DevCommandStep` through the service result model.

Severity: `P1`

Disposition: `accepted`

Repair: `packages/dev-node/src/resources.ts` now returns structured failed
`DevExecResult` values for missing commands and timeouts, and
`services/dev/src/service/common/helpers.ts` converts unexpected adapter throws
into failed command steps.

Evidence:

- `services/dev/test/dev-service.test.ts`
- `packages/dev-node/test/resources.test.ts`

## Finding F-DEVOPS-021: Full CLI Suite Must Not Hang On HQ Status Probes

Finding: the broad CLI suite exposed a hang in `rawr hq status --json`; the
remaining child process was blocked around external status probes, and direct
`lsof` probing also hung on this host.

Severity: `P1`

Disposition: `accepted`

Repair: `apps/cli/src/lib/hq-status.ts` now bounds external probe commands with
timeouts and disables a probe command after the first timeout within a status
run, falling back to other available probes.

Evidence:

- `TMPDIR=/private/tmp bunx vitest run --project cli apps/cli/test/hq.test.ts`
- `TMPDIR=/private/tmp bunx nx run @rawr/cli:test --skip-nx-cache`
