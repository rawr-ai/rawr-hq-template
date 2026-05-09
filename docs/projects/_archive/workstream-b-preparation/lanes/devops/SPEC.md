# DevOps Spec

## Implementation Supersession

This spec records the target contract used by the implemented DevOps migration.
Use `COMPLETION_AUDIT.md`, `WORKSTREAM_RECORD.md`, and `NEXT_PACKET.md` for
current integration and downstream-sunset handoff state.

## Ownership

Future authority:

- `RAWR HQ-Template`

Expected upstream implementation surfaces:

- service package for DevOps mechanics: `services/dev` as `@rawr/dev`.
- Node host adapter for process/fs/path/clock resources:
  `packages/dev-node` as `@rawr/dev-node`.
- CLI plugin for projection: `plugins/cli/devops`.

Downstream `RAWR HQ` provides behavior evidence and current plugin content. It
does not retain architecture authority after migration.

Docs saying DevOps remains personal-owned are stale for this lane. The
continuing split model is going away for DevOps.

## Target State

DevOps becomes a shared template capability for structured Graphite stack,
worktree, repo-sync, and scratch-policy operations.

The target should bring over useful downstream behavior but remove personal
governance assumptions. Local/machine-specific behavior must be parameterized,
defaulted safely, or dropped.

## Public Surface

Expected command surface:

```bash
rawr dev stack doctor [--json]
rawr dev stack drain [--apply] [--json] [--max-cycles <n>] [--sleep-seconds <n>]
rawr dev repo sync-upstream [--apply] [--json] [--upstream-ref <ref>] [--branch-prefix <prefix>] [--converge-after]
rawr dev worktree cleanup [--apply] [--json] [--prefix <text>] [--merged-only|--no-merged-only] [--heal-links]
```

Exact flags should be confirmed from downstream command files during
lane-specific planning, except the template-safe defaults below are already
fixed:

- `repo sync-upstream` must not converge plugins by default; use
  `--converge-after` as an explicit opt-in.
- `worktree cleanup` must not heal links by default; use `--heal-links` as an
  explicit opt-in.

## Safety Invariants

Graphite invariants:

- Prefer Graphite commands for stack mutations.
- Use noninteractive flags for automation paths.
- Do not restack broadly as a hidden side effect.
- In parallel worktree contexts, prefer scoped sync/restack behavior such as
  `gt sync --no-restack` followed by explicit restack where needed.
- Never mutate a real stack in tests; mock Graphite command output and command
  execution.

Worktree invariants:

- Never remove the current worktree.
- Default cleanup to merged branches only.
- Default all removals to planning mode; require `--apply` to remove.
- Require explicit confirmation or opt-in flags for link healing or other repair
  behavior.

Noninteractive invariants:

- All mutating commands must default to planning mode and support `--json`.
- Applied execution failures must be reflected in the service result and CLI
  exit status.
- JSON output must be fixture-backed and stable enough for agent automation.
- Commands must fail closed when repo/worktree/Graphite state is ambiguous.
- No command may run global plugin sync, link repair, or convergence unless the
  operator explicitly asks for that behavior.

## Internal Boundaries

Service-owned:

- Graphite stack analysis.
- Drain command planning/execution.
- Upstream sync command planning/execution.
- Worktree cleanup candidate selection and removal.
- Scratch policy checks.
- JSON report/result DTOs backed by tests and fixtures.

Node-adapter-owned:

- Process, filesystem, path, sleep, and clock resources.
- Test-only spawned-process fixture seam.

CLI-owned:

- oclif command registration.
- flag parsing and defaults.
- workspace root resolution.
- host-resource binding.
- JSON/human output.

Docs-owned:

- Update/remove stale split-model claims when implementation lands.
- Do not write a reconciliation essay. The decision is locked and the docs
  situation is straightforward.

## Bring / Preserve / Remove / Ignore

Bring upstream:

- `stack doctor` analysis and action recommendations.
- `stack drain` non-interactive Graphite drain loop, including planning mode.
- `repo sync-upstream` structured fetch/branch/merge/sync/restack flow.
- `worktree cleanup` candidate detection and merged-only filtering.
- scratch policy checks and bypass controls.
- JSON contracts for reports/results.

Preserve:

- Graphite-first policy.
- `gt sync --no-restack` in parallel worktree contexts.
- Non-interactive command shapes for automation.
- Planning-by-default support for mutating workflows.

Parameterize or review before preserving:

- `repo sync-upstream` post-merge plugin convergence as opt-in
  `--converge-after`.
- `worktree cleanup` link healing as opt-in `--heal-links`.
- branch prefix defaults.
- local scratch-policy depth/path assumptions.

Remove/change:

- Text that frames DevOps as personal-owned.
- Docs that describe a continuing DevOps split model.
- Downstream DevOps package/plugin duplicates only in the final downstream
  sunset phase, not during the upstream migration lane.

Ignore:

- Stale upstream docs as architecture blockers.
- The old governance split as a target-state input.

## Test And Evidence Contract

Future implementation must prove:

- Upstream projects exist in Nx.
- CLI commands are discoverable through oclif.
- Default planning mode does not mutate.
- `--apply` paths fail closed when required command steps fail.
- Repo sync checks Graphite readability before creating/merging a branch.
- Stack doctor parses git/Graphite output and recommends safe actions.
- Stack drain command sequence is non-interactive and Graphite-first.
- Worktree cleanup excludes current worktree and defaults to merged-only.
- Worktree cleanup does not heal links unless explicitly requested.
- Repo sync does not run plugin convergence unless explicitly requested.
- Scratch policy detects missing scratch files and honors env/git config/bypass.
- JSON fixtures cover stack doctor, stack drain, repo sync, worktree cleanup,
  and scratch policy results.
- Graphite, repo, and worktree operations are mocked in unit tests.
- Docs no longer route DevOps future work to personal ownership.

Expected gates:

```bash
bunx nx show project @rawr/dev --json
bunx nx show project @rawr/dev-node --json
bunx nx show project @rawr/plugin-devops --json
bunx nx run @rawr/dev:test
bunx nx run @rawr/dev-node:test
bunx nx run @rawr/plugin-devops:test
bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops
```

If the project names change, update the commands in the future implementation
record.

## Non-Goals

- Do not preserve downstream as a DevOps architecture authority.
- Do not redesign Graphite workflow policy.
- Do not add global sync/link repair as an implicit preparation validation step.
- Do not migrate unrelated operational plugins.
- Do not let stale docs reopen the locked migration decision.
- Do not remove downstream DevOps material during this upstream lane.

## DRA Disposition

Accepted after review repair. DevOps is a full migration lane with
straightforward docs cleanup, concrete Graphite/worktree safety invariants,
template-safe opt-in defaults, and JSON fixture contracts.

## Review Repair Addendum

- The continuing split model is going away for DevOps. Docs are stale inputs,
  not authority.
- Template defaults are `--converge-after` opt-in and `--heal-links` opt-in.
- Required tests must mock Graphite/repo/worktree operations and assert JSON
  fixture contracts.
