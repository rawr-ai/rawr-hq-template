# DevOps Readiness

## Readiness Verdict

Prepared for lane-specific planning after review repair. The lane has a locked
migration decision, clear downstream behavior evidence, concrete safety
invariants, and stale upstream docs classified as docs-to-change rather than
authority.

## Pair Packet

Mapper: DevOps Downstream Capability Mapper.

Verifier: DevOps Locked-Decision/Stale-Docs Verifier.

Objective: migrate useful downstream DevOps behavior upstream as shared template
capability and remove old split-model claims when implementation lands.

Allowed edit surfaces:

- `packages/dev/**`
- `plugins/cli/devops/**`
- package/Nx metadata required to register the projects.
- `apps/cli/package.json`
- root `package.json`
- `scripts/githooks/template-managed-paths.txt`
- `AGENTS_SPLIT.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- targeted DevOps/runbook docs.

Forbidden scope:

- preserving downstream DevOps architecture authority,
- copying stale personal-owned language,
- running global plugin sync/link repair as incidental validation,
- broad Graphite workflow redesign,
- unrelated operational plugin migration.

Evidence paths:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops/AGENTS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops/package.json`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/package.json`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/src/graphite/doctor.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/src/graphite/drain.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/src/repo-sync/upstream.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/src/worktree/cleanup.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev/src/scratch-policy/check.ts`
- `AGENTS_SPLIT.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`

Required output: lane-specific implementation plan or code changes, depending
on future user instruction.

Required gates:

- `bunx nx run @rawr/dev:test`
- `bunx nx run @rawr/plugin-devops:test`
- `bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/plugin-devops`
- fixture-backed JSON contract tests for stack doctor, stack drain, repo sync,
  worktree cleanup, and scratch policy.
- mocked Graphite/repo/worktree command tests.
- stale-doc `rg` check after docs updates.

Lane done condition: upstream owns DevOps package/plugin behavior; docs no
longer claim a continuing DevOps split model; downstream duplicate authority is
ready for a later sunset lane.

DRA decision point: no default decision remains. `--converge-after` and
`--heal-links` are opt-in template defaults; DRA should only approve deviations
from those defaults.

## First Reads

- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/lanes/devops/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/devops/SPEC.md`
- downstream DevOps files listed above.
- stale upstream docs listed above.

## First Commands

```bash
git status --short --branch
gt ls
bunx nx show projects
test -d plugins/cli/devops || true
test -d packages/dev || true
find /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev -maxdepth 5 -type f | sort
rg -n "packages/dev|plugins/cli/devops|rawr dev stack|rawr dev repo|rawr dev worktree|scratchPolicy|gt sync|gt restack" /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/devops /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/dev AGENTS_SPLIT.md docs/process/CROSS_REPO_WORKFLOWS.md
```

## Ready-To-Plan Checklist

- [x] Locked upstream migration decision captured.
- [x] Current upstream absence captured.
- [x] Stale upstream split docs captured.
- [x] Downstream package/plugin surfaces captured.
- [x] DevOps command surface captured.
- [x] Shared-safety defaults fixed as opt-in for template migration.
- [x] Template-safe opt-in defaults captured.
- [x] Graphite/worktree/noninteractive invariants captured.
- [x] JSON fixture and mocked command test requirements captured.
- [x] Docs cleanup is classified as straightforward, not reconciliation.

## Deferred Risks

- Future implementation must preserve opt-in convergence/link healing defaults.
- Future implementation must test Graphite command planning without damaging an
  active stack.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-03-01`, `F-03-02`, `F-03-03`, `F-03-04`.
- The docs situation remains straightforward: stale split-model claims should
  be changed when implementation lands, not reconciled as competing authority.
