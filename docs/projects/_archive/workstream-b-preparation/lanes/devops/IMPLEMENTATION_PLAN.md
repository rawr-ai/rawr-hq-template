# DevOps Migration Implementation Plan

Status: `active-plan`.
Branch: `agent-devops-workstream-b-devops-migration`.
DRA: `Codex`.
Date: `2026-05-08`.

## Frame

This lane migrates downstream DevOps mechanics from personal `RAWR HQ` into
upstream `RAWR HQ-Template`. The target is shared, template-safe DevOps
capability, not a verbatim copy of personal workflow defaults.

The upstream implementation should expose:

```bash
rawr dev stack doctor [--json] [--no-fail] [--branch <branch>] [--repo <owner/name>]
rawr dev stack drain [--apply] [--json] [--max-cycles <n>] [--sleep-seconds <n>]
rawr dev repo sync-upstream [--apply] [--json] [--upstream-ref <ref>] [--branch-prefix <prefix>] [--converge-after]
rawr dev worktree cleanup [--apply] [--json] [--prefix <text>] [--merged-only|--no-merged-only] [--heal-links]
```

The implementation ports the downstream command surface and useful planning
logic, but changes the architecture and unsafe defaults:

- DevOps semantics live in a service package (`services/dev`, package name
  `@rawr/dev`) modeled on `agent-config-sync`.
- Host resources live outside the service logic (`@rawr/dev-node` or the CLI
  binding if no other host needs them yet).
- `plugins/cli/devops` is a thin oclif projection that binds resources, passes
  flags into the service client, and renders the `RawrCommand` envelope.
- mutating commands are planning-only by default. Real mutation requires
  explicit `--apply`; existing `--yes` is not a substitute for `--apply`;
- `repo sync-upstream` does not run plugin convergence by default.
- `worktree cleanup` does not heal links by default.
- Global plugin sync, install repair, provider-home mutation, and link repair
  only happen when explicitly requested.
- Tests mock command execution; no test mutates a real Graphite stack or removes
  real worktrees.

## Solution Design

### Problem check

The problem is not "copy DevOps from downstream." The real problem is that
shared DevOps workflow mechanics live downstream while upstream is now the
locked authority for reusable tooling. Copying downstream as-is would preserve
the discrepancy and import personal defaults into template governance.

### Stakeholders and incentives

- Template maintainers need reusable, tested Graphite/worktree automation that
  does not damage active stacks or worktrees.
- Downstream personal repo needs its proven commands preserved until upstream
  parity is proven and final sunset is approved.
- Future agents need stable JSON/planning contracts.
- Plugin sync lanes need DevOps not to run repair/sync as incidental proof.

### Reversibility

The code migration is reversible as a branch diff, but the public command
surface and docs authority are high-cost if wrong. That justifies a plan-first
approach, fixture-backed JSON contracts, and review loops before closure.

### Alternatives considered

1. **Verbatim downstream copy.** Fast but imports unsafe defaults, personal
   wording, substring worktree cleanup, and placeholder flags.
2. **Docs-only migration.** Avoids risk but leaves shared functionality missing
   upstream.
3. **Template-safe port with explicit safety deltas.** Chosen. It preserves the
   command surface while changing defaults, adding contracts, and tightening
   destructive behavior.

## Team Design

The DRA owns decisions, synthesis, edits, dispositions, proof claims, and
closure. Agents provide bounded evidence and review findings.

Discovery team used:

- Upstream conventions mapper: package/plugin/Nx/CLI test conventions.
- Downstream behavior mapper: source behavior and port/parameterize/drop
  classification.
- Baseline integration mapper: merged lane implications and stale assumptions.
- Red-team reviewer: safety/proof gaps and repair demands.

Review team to run before implementation:

- Plan reviewer: checks plan completeness against lane docs and current code.
- Red-team reviewer: challenges unsafe defaults, proof gaps, deletion leakage,
  and Graphite/worktree hazards.

Implementation ownership may split after review:

- Service worker: `services/dev/**`, service contracts, modules, entities, and
  service tests.
- Host-adapter worker: `packages/dev-node/**` if a reusable node adapter is
  needed beyond the CLI binding.
- CLI worker: `plugins/cli/devops/**`, service binding, projection commands,
  and CLI/plugin tests.
- Integration/docs worker: root/app metadata, Vitest config, docs, managed path
  manifest, app-level CLI discovery tests.

The DRA will keep final integration local if parallel write sets would create
merge overhead greater than the benefit.

## Decisions

### D-01: Upstream service and projection projects

Create:

- `services/dev` as `@rawr/dev`
- `packages/dev-node` as `@rawr/dev-node` if a reusable Node host adapter is
  needed; otherwise keep the initial Node adapter private to
  `plugins/cli/devops/src/lib/dev-binding.ts`
- `plugins/cli/devops` as `@rawr/plugin-devops`

Follow current upstream workspace conventions:

- package/plugin `package.json` with `nx.tags`
- `tsconfig.json` and `tsconfig.build.json`
- service shell matching `agent-config-sync`: `base.ts`, `contract.ts`,
  `impl.ts`, `router.ts`, `client.ts`, `types.ts`, and module directories
- injected resource ports for process/fs/path/time; no `node:child_process`,
  `node:fs`, or singleton command runner inside service logic
- `build`, `typecheck`, `test`, `sync`, and only a `structural` script if the
  structural suite supports the project
- root `vitest.config.ts` projects named `dev`, optional `dev-node`, and
  `plugin-devops`

### D-02: CLI registration and binding

Register `@rawr/plugin-devops` in `apps/cli/package.json` so the actual
template CLI exposes `rawr dev ...` during tests and normal use.

The plugin must bind a `@rawr/dev` service client using the same pattern as
`plugins/cli/plugins/src/lib/agent-config-sync-binding.ts`: CLI gathers
workspace root and host resources, then calls service procedures. CLI code must
not own Graphite/worktree/repo-sync semantics.

### D-03: Scratch policy

Keep scratch policy upstream, but make it a documented template workflow guard,
not a personal-only convention. Reuse the existing HQ Ops lifecycle policy
shape where practical: projections collect concrete scratch paths; service
logic interprets mode, bypass, missing requirements, and warning/block
semantics.

- default mode remains `warn`;
- mode can come from `RAWR_SCRATCH_POLICY_MODE` or
  `git config rawr.scratchPolicyMode`;
- `RAWR_SKIP_SCRATCH_POLICY=1` bypasses;
- roots/filenames are configurable through package options even if CLI defaults
  target `docs/projects`;
- both generic and personal scratch filenames are accepted for compatibility,
  but docs should describe the generic contract first.

### D-04: Repo sync sequence

Do not normalize raw Git branch/merge mutation as an unexamined Graphite
workflow. The package should model explicit steps and safety preflights:

- check dirty state before mutation;
- check detached HEAD and abort unless the operator explicitly chooses a
  supported detached-head recovery path in a future extension;
- check the upstream remote/ref exists before planning a merge;
- check target branch collision before `git switch -c`;
- check whether the target branch is already checked out in any worktree;
- check `git worktree list --porcelain` so branch/worktree occupancy is part of
  the safety decision;
- check `gt ls` before any branch creation or merge so raw Git mutation does
  not happen when Graphite stack state is unreadable;
- treat untracked or ignored files that would be overwritten by checkout/merge
  as fail-closed preflight findings;
- use `gt sync --no-restack` and `gt restack --upstack` explicitly;
- record raw Git branch/merge as intentional local-repo operations, not stack
  restacks;
- keep all steps planning-mode plannable and resource-port injectable.

### D-05: Worktree cleanup scope

Do not port downstream substring matching. Shared template cleanup requires:

- current worktree exclusion;
- repo identity check from `git worktree list --porcelain`;
- strict prefix semantics against the worktree directory basename;
- default `mergedOnly: true`;
- default trunk `main`, configurable;
- optional pinned path/branch exclusions;
- no `git worktree prune` in this lane, even during applied cleanup. Stale
  metadata cleanup needs a separate explicit future flag/command and scoped
  evidence that unrelated worktree metadata is untouched;
- no link healing unless `--heal-links`;
- tests proving unrelated substring matches are not candidates.

### D-06: Drop reserved no-op flags

Do not migrate `--allow-salvage` or `--allow-direct-merge` until behavior and
JSON contracts exist. They are downstream placeholders, not shared authority.

### D-07: Mutating command gate

For shared template DevOps commands, planning is the default for destructive or
externally visible operations.

Implementation rule:

- `stack drain`, `repo sync-upstream`, and `worktree cleanup` return
  `action: "planned"` unless `--apply` is present.
- `--apply` is required before any `gt ss`, `gt merge`, `gt sync`,
  `git switch -c`, `git merge`, `git worktree remove`, plugin convergence, or
  link healing command is executed.
- `--yes` remains available for promptless automation, but it is not sufficient
  to mutate without `--apply`.
- tests must prove command execution does not happen without `--apply`.
- applied command failures must populate `execution.ok: false` and cause CLI
  nonzero exit.

### D-08: Upstream ref resolution

Do not default to downstream-only `upstream/main`.

Ref resolution order:

1. explicit `--upstream-ref`;
2. `git config rawr.upstreamRef`;
3. documented template-safe default `origin/main`.

The command must check that the resolved ref exists before mutation. Missing
refs are represented as `UPSTREAM_REF_MISSING` in both planned and applied
paths.

### D-09: Public exports

`@rawr/dev` must expose service-style public surfaces:

- `.`
- `./client`
- `./types`
- `./service/contract`
- `./router`

If `@rawr/dev-node` is introduced, it must expose only host adapters/resources,
not duplicate service semantics.

Typecheck gates must prove plugin imports use these public exports, not
relative service internals.

## JSON Contract

All commands use the `RawrCommand` envelope:

```ts
{ ok: true, data, warnings?, meta? }
{ ok: false, error: { message, code?, details? }, meta? }
```

### `dev stack doctor`

Success data:

- `workspaceRoot: string`
- `repo: string | null`
- `report.status: "HEALTHY" | "NEEDS_ATTENTION"`
- `report.branch: string`
- `report.checks.dirtyWorkingTree: boolean`
- `report.checks.needsRestack: boolean`
- `report.checks.graphShowsStack: boolean`
- `report.actions: Array<{ command: string; reason: string }>`
- `report.raw.branch: string`
- `report.raw.gitStatus: string`
- `report.raw.gtLs: string`

Exit rules:

- exit `0` if healthy or `--no-fail`;
- exit `1` if attention needed without `--no-fail`;
- exit `2` for workspace-root failure.

Fixture names:

- `stack-doctor-healthy.json`
- `stack-doctor-needs-attention.json`

Failure codes:

- `WORKSPACE_ROOT_MISSING`
- `STACK_DOCTOR_FAILED`

### `dev stack drain`

Success data:

- `workspaceRoot: string`
- `run.action: "planned" | "applied"`
- `run.converged: boolean`
- `run.cycles: Array<{ cycle: number; publish: CommandStepResult; merge:
  CommandStepResult; sync: CommandStepResult; gtLs: string }>`
- `run.plannedCommands?: string[]`
- `scratchPolicy: ScratchPolicySummary`

Shared nested DTOs:

- `CommandStepResult = { command?: string; exitCode: number; ok: boolean;
  stdout?: string; stderr?: string }`
- `ScratchPolicySummary = { mode: "off" | "warn" | "block"; missing:
  string[]; bypassed: boolean }`

Exit rules:

- dry-run exits `0`;
- applied converged exits `0`;
- applied not converged exits `1`;
- scratch policy blocked or workspace-root failure exits `2`.

Fixture names:

- `stack-drain-dry-run.json`
- `stack-drain-applied-converged.json`
- `stack-drain-scratch-blocked.json`

Failure codes:

- `WORKSPACE_ROOT_MISSING`
- `SCRATCH_POLICY_BLOCKED`
- `STACK_DRAIN_NOT_CONVERGED`
- `STACK_DRAIN_COMMAND_FAILED`

### `dev repo sync-upstream`

Success data:

- `workspaceRoot: string`
- `run.action: "planned" | "applied"`
- `run.branchName: string`
- `run.steps: RepoSyncStep[]`
- `scratchPolicy: ScratchPolicySummary`

Nested DTOs:

- `RepoSyncStep = { command: string; phase: "preflight" | "fetch" |
  "branch" | "merge" | "graphite" | "converge"; exitCode?: number; ok?:
  boolean; skipped?: boolean; reason?: string }`

Contract deltas from downstream:

- CLI flag is `--converge-after`, default `false`;
- planned convergence steps appear only when `--converge-after` is present;
- branch collision is a preflight failure before mutation.

Exit rules:

- dry-run exits `0`;
- applied all steps ok exits `0`;
- applied failed step exits `1`;
- scratch policy, branch collision, dirty state, or workspace-root failure exits
  `2`.

Fixture names:

- `repo-sync-dry-run-no-converge.json`
- `repo-sync-dry-run-converge-after.json`
- `repo-sync-branch-collision.json`

Failure codes:

- `WORKSPACE_ROOT_MISSING`
- `SCRATCH_POLICY_BLOCKED`
- `DIRTY_WORKING_TREE`
- `DETACHED_HEAD_UNSUPPORTED`
- `UPSTREAM_REF_MISSING`
- `BRANCH_ALREADY_EXISTS`
- `BRANCH_CHECKED_OUT_ELSEWHERE`
- `CHECKOUT_OR_MERGE_WOULD_OVERWRITE`
- `REPO_SYNC_COMMAND_FAILED`

### `dev worktree cleanup`

Success data:

- `workspaceRoot: string`
- `run.action: "planned" | "applied"`
- `run.candidates: WorktreeEntry[]`
- `run.removed: Array<{ path: string; ok: boolean; exitCode: number }>`
- `run.healedLinks: boolean`
- `scratchPolicy: ScratchPolicySummary`

Nested DTOs:

- `WorktreeEntry = { path: string; branch: string | null; basename: string;
  reason: "strict-prefix-match"; merged?: boolean; pinned?: boolean;
  current?: boolean }`

Contract deltas from downstream:

- strict prefix matching on basename, not arbitrary substring matching;
- no link healing unless `--heal-links`;
- dry-run never removes, prunes, or heals.

Exit rules:

- dry-run exits `0`;
- applied all removals ok exits `0`;
- applied removal failure exits `1`;
- scratch policy, unsafe current-worktree match, ambiguous candidate, or
  workspace-root failure exits `2`.

Fixture names:

- `worktree-cleanup-dry-run.json`
- `worktree-cleanup-no-substring-match.json`
- `worktree-cleanup-heal-links.json`

Failure codes:

- `WORKSPACE_ROOT_MISSING`
- `SCRATCH_POLICY_BLOCKED`
- `UNSAFE_CURRENT_WORKTREE_MATCH`
- `AMBIGUOUS_WORKTREE_CANDIDATE`
- `WORKTREE_REMOVE_FAILED`
- `LINK_HEAL_FAILED`

## Implementation Slices

### Slice 1: plan/review artifacts

Create durable lane artifacts:

- `WORKSTREAM_RECORD.md`
- `IMPLEMENTATION_PLAN.md`
- `REVIEW_FINDINGS.md`

Run plan review and red-team before code migration.

### Slice 2: service scaffold and logic

Add `services/dev` with:

- service shell: `src/{client,index,router,types}.ts`
- service boundary: `src/service/{base,contract,impl,router}.ts`
- resource ports: `src/service/common/resources.ts`
- schema-backed DTOs: `src/service/common/entities.ts`
- modules under `src/service/modules/{stack,repo,worktree,scratch-policy}`
- service tests with fake resources.

Service design:

- Graphite/repo/worktree/scratch semantics live behind the service contract.
- Process, filesystem, path, sleep, and clock access are injected resource
  ports.
- No service logic imports `node:child_process` or `node:fs`.
- No real Graphite/worktree mutation in service tests.
- Worktree cleanup uses strict basename prefix candidate selection.
- Repo sync models preflights and execution steps separately.
- Scratch policy supports configurable roots/filenames.

Add `packages/dev-node` with:

- `createNodeDevResources()`;
- Node process/fs/path/clock adapters only;
- spawned CLI fixture seam via `RAWR_DEV_COMMAND_FIXTURE` gated by
  `NODE_ENV === "test"`.

### Slice 3: CLI plugin

Add `plugins/cli/devops` with:

- command files under `src/commands/dev/...`
- `src/lib/dev-binding.ts`
- rendering helpers only
- CLI tests that prove projection metadata and flags.

Command deltas:

- no placeholder reserved flags;
- `--converge-after` instead of downstream `--no-converge`;
- `--heal-links` default false.

### Slice 4: actual CLI integration

Update:

- `apps/cli/package.json` dependencies and oclif plugins
- root `package.json` build/typecheck/pretest project lists
- `vitest.config.ts`

Add app-level CLI tests proving:

- `rawr dev stack doctor --json --no-fail` is discoverable through
  `apps/cli/src/index.ts`;
- `rawr dev stack drain --json` returns the expected planning envelope through
  the actual CLI path;
- `rawr dev repo sync-upstream --json` omits convergence by default;
- `rawr dev worktree cleanup --json` omits link healing by default.
- the normal app oclif plugin registration path loads `@rawr/plugin-devops`
  after build/registration, not only direct command-class invocation.

The required spawned-process test seam is:

- node resource execution reads `RAWR_DEV_COMMAND_FIXTURE` only when
  `NODE_ENV === "test"`;
- the fixture maps command names/args to deterministic exit/stdout/stderr;
- tests set `PATH` or the fixture so any attempted real `git`, `gt`,
  `bun run rawr -- plugins ...`, `git worktree remove`, or provider-home
  operation fails loudly;
- app-level tests assert the fake runner saw the expected planned commands and
  no forbidden command.

### Slice 5: docs and ownership cleanup

Update:

- `AGENTS_SPLIT.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- `scripts/githooks/template-managed-paths.txt`

Required doc state:

- DevOps mechanics are template-owned.
- Downstream may keep local customization, but not future shared DevOps
  architecture authority.
- Command surface remains separate from plugin command surfaces.

### Slice 6: verification and closure

Run targeted gates, repair failures, then create:

- `COMPLETION_AUDIT.md`
- `NEXT_PACKET.md`

## Tests And Gates

Required implementation tests:

- service unit tests for scratch policy, stack doctor, stack drain planning,
  repo sync planning/collision/converge flag, and worktree cleanup strict
  candidate selection.
- node adapter tests for the spawned-process fixture seam.
- CLI plugin tests for flags, JSON data fields, workspace-root failures, and
  scratch policy blocked behavior.
- app-level CLI discovery tests through the real template CLI entrypoint.
- `--apply` gating tests: default command invocation is planned and never
  executes mutating commands; applied mode is the only execution path.
- upstream ref resolution tests for flag, git config, default `origin/main`,
  and missing ref.
- spawned-process fake command-runner seam tests.

Required commands:

```bash
TMPDIR=/private/tmp bunx nx show project @rawr/dev --json
TMPDIR=/private/tmp bunx nx show project @rawr/dev-node --json
TMPDIR=/private/tmp bunx nx show project @rawr/plugin-devops --json
TMPDIR=/private/tmp bunx nx run @rawr/dev:test
TMPDIR=/private/tmp bunx nx run @rawr/dev-node:test
TMPDIR=/private/tmp bunx nx run @rawr/plugin-devops:test
TMPDIR=/private/tmp bunx nx run @rawr/cli:test
TMPDIR=/private/tmp bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops,@rawr/cli
rg -n "packages/dev/|personal mechanical dev workflows|stays personal-owned" AGENTS_SPLIT.md docs/process scripts/githooks/template-managed-paths.txt
git status --short --branch
```

Graphite gates:

- `gt ls` and submission must be run in a session where the repository `.git`
  metadata is writable.

## Review Plan

Plan review lanes:

- Plan completeness: checks artifact against lane packet and current merged
  baseline.
- Safety red team: checks destructive operations, JSON contracts, test
  coverage, and stale authority claims.

Implementation review lanes:

- Service behavior review.
- Node adapter/resource-boundary review.
- CLI projection review.
- CLI projection review.
- Integration/docs review.
- Proof ledger review before closure.

No accepted P1/P2 review finding may remain unrepaired or unwaived at closure.

## Pause Conditions

Pause and ask the DRA/user if:

- strict worktree candidate scoping cannot be implemented without losing the
  command's utility;
- repo sync cannot be made Graphite-safe enough for template use;
- actual CLI registration conflicts with current plugin architecture;
- tests require real destructive operations to prove behavior;
- a required behavior would hard-code machine-specific paths.

## Downstream Sunset Handoff

This lane does not delete downstream files. It should hand off:

- upstream parity proof;
- list of downstream DevOps paths that are duplicate authority after template
  integration;
- any lessons from removed/changed downstream assumptions that should be
  preserved before final deletion.
