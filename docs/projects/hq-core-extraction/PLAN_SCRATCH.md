# PLAN_SCRATCH

## Checklist
- [ ] Validate scope split (template-owned vs personal-owned) against `AGENTS_SPLIT.md`
- [ ] Confirm package boundaries and extraction sequence for `@rawr/hq`
- [ ] Define command contract tests before implementation
- [ ] Confirm scratch-policy enforcement defaults and overrides
- [ ] Track implementation slices and status in this doc

## Implementation Decisions
- _No implementation decisions recorded yet._

# Plan: HQ/Core Extraction + DevOps Command Family (Template-Owned Core, Personal-Owned Dev Surface)

## Summary
This plan implements everything we discussed with clear repo ownership:

1. Keep **small focused packages**:
- `@rawr/hq` for HQ/plugin-management domain logic.
- `@rawr/dev` for mechanical dev workflows (Graphite/worktree/repo orchestration).
2. Move `plugins/cli/plugins` core domain logic into `@rawr/hq`; keep `@rawr/plugin-plugins` as command wrappers.
3. Add a separate **CLI mechanical family** as a plugin surface:
- `rawr dev ...` under a new CLI plugin (`plugins/cli/devops`, package `@rawr/plugin-devops`), not in `apps/cli` core.
4. Bake in **scratch-first policy** with `warn` default and `block` opt-in.
5. Place work in the appropriate repo:
- Template repo for shared HQ/core abstractions and plugin-management contracts.
- Personal repo for operator-specific dev mechanics and policy defaults.

## Decision Locks
- Package model: `hq + dev` (small focused packages).
- Dev command host: **new CLI family/plugin**, not `apps/cli` core.
- Scratch enforcement: `warn` default, `block` opt-in (env/git config + CI).
- Canonical graphite/worktree packages: **defer**; keep as internal modules in `@rawr/dev` until multiple stable consumers exist.

---

## Repo Placement Matrix

### RAWR HQ-Template (`rawr-hq-template`)
Owns shared baseline and cross-user defaults:

- New package: `packages/hq/**`
- Refactor: `plugins/cli/plugins/**` to consume `@rawr/hq`
- New plugin-management commands:
  - `rawr plugins converge`
  - `rawr plugins doctor links`
- Shared docs/contracts:
  - `docs/system/PLUGINS.md`
  - `docs/process/RUNBOOKS.md`
  - `docs/process/PLUGIN_E2E_WORKFLOW.md`
  - `docs/process/CROSS_REPO_WORKFLOWS.md`
  - `AGENTS_SPLIT.md`
- Shared scratch-policy contract docs and flags reference.

### RAWR HQ Personal (`rawr-hq`)
Owns operator-specific dev mechanics and local workflow tuning:

- New package: `packages/dev/**`
- New plugin: `plugins/cli/devops/**` (`@rawr/plugin-devops`)
- New command family:
  - `rawr dev stack doctor`
  - `rawr dev stack drain`
  - `rawr dev repo sync-upstream`
  - `rawr dev worktree cleanup`
- Personal defaults/config:
  - owner-mode `block` examples
  - remote topology preset guidance
  - personal runbooks and operational notes.

---

## Target Architecture

## 1) `@rawr/hq` (Template)
Move domain logic out of plugin command package:

- `packages/hq/src/workspace/*`
  - `findWorkspaceRoot`, `listWorkspacePlugins`, plugin metadata filtering.
- `packages/hq/src/install/*`
  - install-state drift model + reconcile engine.
- `packages/hq/src/lifecycle/*`
  - lifecycle completeness checks, policy assessment, judge orchestration.
- `packages/hq/src/scaffold/*`
  - plugin scaffold/factory logic currently in plugin libs.
- `packages/hq/src/journal/*` and `packages/hq/src/security/*` wrappers only where plugin/app duplicated logic exists.

`@rawr/plugin-plugins` remains:
- command parsing
- output formatting
- thin orchestration calls into `@rawr/hq` + existing `@rawr/agent-sync`.

## 2) `@rawr/dev` (Personal)
Mechanical ops domain:

- `packages/dev/src/graphite/*`
  - stack introspection, PR state evaluation, merge-drain state machine.
- `packages/dev/src/worktree/*`
  - safe discovery/removal/cleanup routines and ownership filters.
- `packages/dev/src/repo-sync/*`
  - upstream sync preflight + merge-first orchestration.
- `packages/dev/src/scratch-policy/*`
  - scratch file detection/bootstrap checks and policy resolution.

## 3) `@rawr/plugin-devops` (Personal)
Command wrappers for `rawr dev ...`:
- uses `@rawr/dev`
- no deep business logic beyond command I/O.

---

## Public Interfaces / Command Contracts

## A) New shared plugin-management commands (Template)
### `rawr plugins converge`
Purpose: one-command deterministic convergence loop.

Default behavior:
1. install/link reconcile (`status --checks install --repair --no-fail`)
2. full sync (`sync all`)
3. final health status (`status --checks all`)

Flags:
- `--json`
- `--dry-run`
- `--no-install-repair`
- `--no-sync`
- `--no-fail`

Exit:
- `0` when healthy or `--no-fail`
- non-zero when convergence attempted but final status is unhealthy.

### `rawr plugins doctor links`
Purpose: focused install/link drift + stale link diagnosis.

Flags:
- `--json`
- `--repair`
- `--no-fail`

Output:
- expected/actual link manifest
- stale/legacy/path mismatch issues
- actionable remediation list.

## B) New dev mechanics family (Personal)
### `rawr dev stack doctor`
Non-mutating stack health report:
- merge readiness, dirty/unstable PRs, orphaned/closed-child risks, actionable next steps.
Flags: `--json`, `--no-fail`, `--branch <branch>`, `--repo <owner/name>`.

### `rawr dev stack drain`
Mutating merge-drain loop:
- publish/update stack, merge, poll, safe sync (`--no-restack`), prune, and optional orphan salvage.
Flags:
- `--json`
- `--dry-run`
- `--max-cycles <n>` (default 20)
- `--sleep-seconds <n>` (default 8)
- `--allow-salvage` (default true)
- `--allow-direct-merge` (default false)

### `rawr dev repo sync-upstream`
Merge-first upstream sync flow for personal repo.
Flags:
- `--json`
- `--dry-run`
- `--upstream-ref` (default `upstream/main`)
- `--branch-prefix` (default `chore/upstream-sync`)
- `--no-converge` (skip post-sync converge check)

### `rawr dev worktree cleanup`
Safe cleanup of disposable worktrees owned by caller pattern.
Flags:
- `--json`
- `--dry-run`
- `--prefix <pattern>` (required)
- `--merged-only` (default true)
- `--heal-links` (default true; runs link doctor/repair after cleanup)

---

## Scratch-First Policy (Both Repos, Different Surfaces)

## Policy contract
- Multi-phase mutating commands must check scratch docs:
  - `PLAN_SCRATCH.md`
  - `WORKING_PAD.md`
- Policy mode:
  - `off | warn | block`
- Defaults:
  - repo default `warn`
  - owner/CI can set `block`.

## Controls
- env: `RAWR_SCRATCH_POLICY_MODE`
- git config fallback: `rawr.scratchPolicyMode`
- one-off bypass: `RAWR_SKIP_SCRATCH_POLICY=1`
- optional bootstrap flag: `--bootstrap-scratch` creates missing files from template skeleton.

## Commands gated
- Template: `rawr plugins improve`, `rawr plugins sweep`, `rawr plugins converge` (if mutating mode).
- Personal: all new `rawr dev ...` mutating paths (`stack drain`, `repo sync-upstream`, cleanup with mutation).

---

## Slicing Strategy (Graphite)

## Template Stack
1. `feat(hq): add @rawr/hq package skeleton and exports`
2. `refactor(hq): move workspace/install/lifecycle logic from plugin-plugins and apps/cli duplicates`
3. `refactor(plugin-plugins): switch commands to @rawr/hq wrappers`
4. `feat(plugins): add plugins converge and plugins doctor links`
5. `docs(process): update ownership, runbooks, and scratch policy contract`
6. `test(hq): add unit + command tests for hq extraction and new commands`

## Personal Stack (after template merge + sync-down)
1. `feat(dev): add @rawr/dev package and adapters`
2. `feat(devops): add @rawr/plugin-devops command surface`
3. `feat(devops): implement stack doctor + stack drain`
4. `feat(devops): implement repo sync-upstream + worktree cleanup`
5. `chore(policy): add scratch-policy enforcement defaults + docs`
6. `test(devops): add scenario tests and safety gates`

---

## Test Cases and Scenarios

## Template tests
- `@rawr/hq` unit tests:
  - install drift classification/reconcile
  - lifecycle completeness + policy consensus
  - workspace plugin discovery parity vs previous behavior.
- `@rawr/plugin-plugins` command tests:
  - `plugins converge` healthy/unhealthy/no-fail/dry-run
  - `plugins doctor links --repair` stale-link healing
  - no behavior regression for `plugins sync/status/improve/sweep`.
- Drift gate:
  - no duplicate lib copies in `apps/cli/src/lib` and `plugins/cli/plugins/src/lib` for extracted modules.

## Personal tests
- `@rawr/dev` unit tests:
  - merge-drain state transitions
  - orphan detection/salvage decision logic
  - safe worktree ownership filters.
- `@rawr/plugin-devops` command integration:
  - `stack doctor` non-mutating diagnostics
  - `stack drain` dry-run and controlled mutation loop
  - `repo sync-upstream` conflict/report path
  - `worktree cleanup` safe-only behavior + link heal hook.
- End-to-end operator check:
  - run `plugins converge` and ensure final `HEALTHY`.

---

## Rollout / Integration Order

1. Land template stack first.
2. Run personal upstream sync branch merge (`upstream/main` -> personal).
3. Restack personal branches only after sync baseline is clean.
4. Land personal dev stack.
5. Validate final runtime:
- `rawr plugins status --checks all --json`
- `rawr plugins converge --json` (or dry-run + apply path)
- `rawr plugins status --checks all --json` => `HEALTHY`.

---

## Assumptions and Defaults
- `@rawr/hq` is template-owned baseline and consumed by plugin wrappers.
- `@rawr/dev` + `@rawr/plugin-devops` are personal-owned initially because dev mechanics are operator-specific.
- `rawr dev ...` stays out of `apps/cli` core.
- No immediate split into `@rawr/dev-graphite` / `@rawr/dev-worktree`; those are deferred until at least two stable external consumers exist.
- Scratch-first enforcement is policy-level and enabled by default in warn mode, with block available for owner/CI.
