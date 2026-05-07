# DevOps Discovery

## Frame

This lane prepares implementation planning for moving DevOps upstream.

The decision is locked: upstream becomes authoritative for DevOps architecture.
Docs saying DevOps remains personal-owned are stale for this target and should
not confuse the lane. The docs situation is straightforward: record the stale
claims as docs-to-update; do not reconcile them as competing authority.

Downstream currently owns plugin content and proven behavior, but not future
architecture authority.

## Current Upstream State

Upstream does not currently have DevOps implementation paths:

- `plugins/cli/devops` is missing.
- `packages/dev` is missing.

Current upstream docs still describe the old split model:

- `AGENTS_SPLIT.md:35` says operator-specific dev workflow mechanics
  `packages/dev/**` and `plugins/cli/devops/**` belong in personal `RAWR HQ`.
- `AGENTS_SPLIT.md:86` says `packages/dev/**` stays personal-owned.
- `docs/process/CROSS_REPO_WORKFLOWS.md:13` says personal mechanical dev
  workflows are personal-owned in `packages/dev/**` and `plugins/cli/devops/**`.
- `docs/process/CROSS_REPO_WORKFLOWS.md:66` says template-managed shared
  packages intentionally exclude `packages/dev/**`.
- `scripts/githooks/template-managed-paths.txt` may also need review when
  DevOps becomes template-owned, because managed-path hooks can preserve stale
  repo ownership assumptions.

For this lane, those docs are stale because the user locked DevOps migration
upstream.

## Current Downstream State

Downstream has DevOps implementation paths:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev`

Downstream command surface:

- `rawr dev stack doctor`
- `rawr dev stack drain`
- `rawr dev repo sync-upstream`
- `rawr dev worktree cleanup`

Evidence:

- `plugins/cli/devops/AGENTS.md:13-16` lists the canonical commands.
- `plugins/cli/devops/README.md:5-9` lists the same commands.
- `plugins/cli/devops/package.json:2` names `@rawr/plugin-devops`.
- `plugins/cli/devops/package.json:20-24` depends on `@oclif/core`,
  `@rawr/core`, and `@rawr/dev`.
- `plugins/cli/devops/package.json:42-45` marks `rawr.kind = toolkit` and
  `rawr.capability = devops`.
- `packages/dev/package.json:2` names `@rawr/dev`.
- `packages/dev/package.json:8-28` exports `graphite`, `worktree`,
  `repo-sync`, and `scratch-policy` modules.

Behavior evidence:

- `packages/dev/src/graphite/doctor.ts:26-67` checks git status, `gt ls`,
  dirty working tree, restack need, and stack shape, then recommends actions.
- `packages/dev/src/graphite/drain.ts:37-42` plans the stack drain command
  sequence: `gt ss --publish --stack --ai --no-interactive`,
  `gt merge --no-interactive`, `gt sync --no-restack --force --no-interactive`,
  and `gt ls`.
- `packages/dev/src/repo-sync/upstream.ts:33-45` plans upstream fetch, branch
  creation, merge, Graphite sync/restack, and optional plugin convergence.
- `packages/dev/src/worktree/cleanup.ts:35-102` finds worktrees by prefix,
  filters merged branches by default, removes worktrees, prunes, and optionally
  heals links.
- `packages/dev/src/scratch-policy/check.ts:74-105` implements scratch policy
  checks using `RAWR_SCRATCH_POLICY_MODE`, `git config rawr.scratchPolicyMode`,
  and `RAWR_SKIP_SCRATCH_POLICY`.

## Evidence

Commands used:

```bash
test -d plugins/cli/devops
test -d packages/dev
find /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev -maxdepth 5 -type f | sort
rg -n "stack doctor|stack drain|sync-upstream|worktree cleanup|scratch|Graphite|gt |cleanup" /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev -g '!**/dist/**'
rg -n "plugins/cli/devops|packages/dev|DevOps|devops|personal-owned|personal owned|template-owned|split" AGENTS_SPLIT.md docs/process/CROSS_REPO_WORKFLOWS.md docs/process -g '!**/quarantine/**'
```

## Mismatches

1. User decision says DevOps moves upstream; active upstream docs say DevOps
   stays personal-owned.
2. Upstream lacks the package/plugin implementation.
3. Downstream describes DevOps as "personal" in README/AGENTS text, but the
   behavior itself is broadly useful Graphite/worktree workflow tooling.
4. Some downstream commands embed local convergence behavior such as plugin
   sync/status runs. Future upstream migration must parameterize these so the
   shared template does not force personal machine workflows.

## Risks

- Future agents may over-trust `AGENTS_SPLIT.md` and stop the migration.
- Copying downstream docs verbatim would preserve the old split model.
- `repo sync-upstream` and `worktree cleanup --heal-links` can trigger plugin
  status/sync/repair behavior; upstream migration must make those behaviors
  explicit and safe.
- Mutating Graphite operations need non-interactive behavior and careful
  Graphite/worktree safety invariants.

## Unknowns

- Exact upstream project names should be decided during implementation
  planning. The obvious names are still `@rawr/dev` and `@rawr/plugin-devops`,
  but future implementation must check current Nx/package naming constraints.
- Exact local path/config assumptions must be inventoried while porting; shared
  template defaults must be safe for noninteractive agents and multiple
  worktrees.

## DRA Disposition

Accepted after review repair. The DevOps lane is prepared for lane-specific
planning with the locked authority decision: migrate useful downstream behavior
upstream and update stale split docs when implementation lands.

## Review Repair Addendum

- `F-03-01` accepted: the lane must carry concrete Graphite, worktree, and
  noninteractive safety invariants rather than only naming the commands.
- `F-03-02` accepted: upstream defaults are fixed as template-safe opt-ins:
  `--converge-after` is opt-in and link healing is opt-in.
- `F-03-03` accepted: personal convergence/link-healing defaults must not be
  imported as shared template defaults.
- `F-03-04` accepted: upstream spelling is intentionally
  `--converge-after`; this diverges from downstream `--no-converge` because the
  upstream default is no convergence.
- Future implementation should inspect `apps/cli/package.json`,
  root `package.json`, `scripts/githooks/template-managed-paths.txt`,
  `AGENTS_SPLIT.md`, and `docs/process/CROSS_REPO_WORKFLOWS.md` when wiring
  DevOps into the template.
