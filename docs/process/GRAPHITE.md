# Graphite Workflow (Habitat)

The Habitat repository uses **Graphite** (`gt`) for stacked-PR workflows. The
legacy remote name does not change repository authority.

## Core invariants

- **Graphite-first:** use `gt` for branch/stack operations and restacks.
- **Parallel safety:** when multiple worktrees/agents are active, default to:
  - `gt sync --no-restack`
  - `gt restack --upstack` (only your stack)
- **Git is OK for inspection:** `git status`, `git diff`, `git log`, etc.
- Avoid ad-hoc history rewriting (`git rebase`, `git push --force`) on Graphite-tracked branches.

## Stack and slice model

Work in Habitat is shaped as Graphite stacks of slices.

- **Stack:** one complete feature set, the unit that is finished and merged
  together. It is a chain of branches, each parented on the one below, starting
  from `main`.
- **Slice:** one branch and one PR. It is an independently reviewable,
  independently meaningful step: a reviewer can understand and accept it from
  its own diff plus the slices below it. It stands on its parent with its own
  passing check and never depends on a later slice for correctness.
- **Single-slice stacks are fine.** A small change, or a feature that is one
  coherent step, is one slice. Once work has more than one coherent step, stack
  it; stacking is the default.
- **Tests travel with behavior.** The tests that prove a behavior normally land
  in the same slice as the behavior.

### Drawing slice boundaries

A good boundary is where a reviewer could stop reading and still know what
changed and why. Each slice has one purpose, depends only on the slices below
it, and leaves the repository passing its checks. Split along contracts and
steps, not along files or time. Name a slice for the observable change it
delivers, not for its place in the sequence ("part 2", "follow-up").

A bad boundary is one that needs the next slice to make sense (a type with no
consumer, a rename half applied), one that is a checkpoint rather than a step
(`wip`, `address review`), or one that mixes unrelated purposes so no single
title fits.

Example: to add a new lifecycle command, one slice might introduce the service
contract and its tests, the next the command that calls it, the last the
documentation and operator guidance. Each can be read and accepted alone, and
each title says what that step does. "Add files for the new command" and "fix
the first slice" are not slices.

Independent work does not belong in the same stack: start it from `main` in its
own stack. Stack branches only when the upper one really builds on the lower.

### Commits are working material

Commits inside a slice are working material. All of them are squashed when the
slice merges, so use as many as the work needs and do not tidy them for
history. Commits do not map one-to-one to PRs. The slice's PR title and
description become the durable history entry, and the slices, not the commits,
are the trail.

- **Title:** `type(scope): summary`, written to read well alone in `git log`
  on `main`. Say the observable change the slice delivers, not how the work
  went.
- **Description:** the outcome and its proof: why the step exists, what it
  changes and what it leaves for the next slice, the validation that was run, and any decision or constraint a
  later reader would otherwise have to rediscover. Do not retell commits,
  review rounds or session notes. Graphite's `--ai` drafts are starting
  material: check the title and description before the slice merges, because
  they are all that remains of it afterward.
- **Evidence:** when a commit is cited as evidence elsewhere (a measurement, a
  review, a qualification), keep that original commit reachable and cite it.
  Never relabel the squash-merge commit as the one that was measured.

## Quick commands

```bash
gt ls
gt sync --no-restack
gt create -am "type(scope): summary" agent-A-rawr-slice
gt restack --upstack
```

Recommended preflight before stack mutation:
```bash
git status --short
git branch --show-current
gt ls
gt log --all
```

## Local loop

Build on the commands above:

- **Create a slice** in your own worktree under the shared worktrees root: make
  the change, stage it, and run `gt create` with the slice's
  `type(scope): summary` message. The first slice starts from `main`; the next
  starts on top of the current slice.
- **Add to a slice** with `gt modify --commit -m "..."` for a new working
  commit, or `gt modify` to amend the latest one. Both restack the slices above.
- **Insert or reorder** with `gt create --insert`, `gt move --onto <parent>` and
  `gt reorder`. `gt absorb` moves staged fixes into the slice they belong to.
- **Fix the earliest slice that owns the problem**, not the tip, when
  something must change after later slices exist. Check worktree occupancy,
  `gt checkout` that slice and `gt modify` it (which restacks descendants),
  inspect `gt ls`, use `gt restack --upstack` only where it is still needed,
  then re-verify every affected slice.
- **Restack only your stack** with `gt restack --upstack` from the slice you
  changed. Do not run a restack or `gt sync` that could move branches checked
  out in other worktrees.
- **Sync** with `gt sync --no-restack`, then restack your own stack. Run `gt ls`
  first and leave other owners' branches and worktrees alone.
- **Conflicts:** stage the resolution and run `gt continue`, or `gt abort`.

## Submit and merge

Submission and merge go through Graphite and
`docs/process/runbooks/STACK_DRAIN_LOOP.md`. Run `bun run check` first, submit
the whole stack so every PR diff matches the local stack, and merge from the
bottom slice up: bottom-up is the dependency and merge order, not a separate
submit-and-merge cycle per branch. The native stack merge does this, and each
slice lands as one squashed commit on `main`.

### When Graphite's hosted service is unavailable

If Graphite refuses server-backed commands (`gt submit`, `gt merge`, `gt sync`),
for example because a team plan has expired, keep stacking locally. `gt create`,
`gt modify`, `gt restack`, `gt ls` and the other local commands still work.

- Keep the work as slices. Do not flatten or rewrite the stack to get around the
  outage.
- Hold submission and merge. Use another route only if the directors agree a
  fallback for that specific case.
- Resume the normal submit and merge once the service is available.

For canonical merge/prune and repository/interface workflows, use:
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`

## Project memory snapshots

Project memory's current state, including updates and removals, is one file:
the primary checkout's `.fluree-memory/repo.ttl`, with its
`.fluree-memory/.gitignore`. The primary checkout is authoritative and `.fluree/`
is derived from the file. Memories record files (`--refs`), not branches, so a
snapshot travels whole.

- **With the PR.** A PR carries a byte-for-byte copy of the primary checkout's
  file, taken when the PR is committed. Copy it; do not regenerate it, and never
  run `fluree init` in the worktree.
- **Nothing in flight.** Memory changes with no PR to carry them go in a small
  memory-sync PR from `main`, created through Graphite like any other branch.
- **Never overwrite the primary checkout's file from a branch.** After a snapshot
  merges, move the primary file aside before pulling, then confirm the pulled
  file matches or carries forward memories added since the copy.
- Coordinate writers before staging, merging, or switching in the primary
  checkout; Fluree's lock serializes only its own CLI writes, not Git or manual
  edits.

## Related workflow docs

- Repository separation and artifact interfaces: `docs/process/CROSS_REPO_WORKFLOWS.md`
