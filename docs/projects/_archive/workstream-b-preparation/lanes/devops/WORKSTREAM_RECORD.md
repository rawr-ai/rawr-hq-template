# DevOps Migration Workstream

Status: `implemented; integration-reviewed; submit pending`.
Branch: `agent-devops-workstream-b-devops-migration`.
PR: `none`.
Commit: `b322aa80` at opening; same local commit as `main` / `origin/main`.
DRA: `Codex`.
Dates: `2026-05-08 -> 2026-05-08`.

This record preserves state and handoff context for the bounded Workstream B
DevOps migration lane. It is not architecture authority, program sequencing
authority, or a live task board.

## Workstream State

Workstream record path:
`docs/projects/workstream-b-preparation/lanes/devops/WORKSTREAM_RECORD.md`

Status: implementation complete in the lane worktree; Integration DRA repairs
and full CLI verification completed; Graphite submit remains pending at this
artifact write.

DRA: parent Codex agent in the devops lane worktree.

Branch/stack:

- Branch: `agent-devops-workstream-b-devops-migration`.
- Parent originally tracked under `codex/workstream-b-preparation`.
- Opening base was `b322aa80`, same as `main` / `origin/main`, after upstream
  fallout, session-tools, undo, and plugin-sync Workstream B lane content
  landed.
- Current local `HEAD` is the lane commit
  `feat(devops): migrate devops tooling upstream`.
- `gt ls` passed after the final commit; this branch sits at the top of the
  Workstream B stack above plugin-sync, session-tools, undo, and
  upstream-fallout.
- `gt log --all` passed after the Integration DRA final amend.

Current phase: closeout / submit handoff.

Selected skills:

- `solution-design`
- `team-design`
- `workstream-runner`
- `workstream-review-loops`
- `parallel-development-workflow`
- `framing-design`

Selected agents:

- Upstream conventions mapper: mapped Nx/package/plugin/CLI conventions.
- Downstream behavior mapper: mapped downstream DevOps commands, flags, JSON,
  dry-run behavior, and unsafe defaults.
- Baseline integration mapper: checked merged Workstream B lane implications
  for DevOps.
- Early red-team reviewer: challenged safety, JSON, CLI proof, and stale
  assumptions.

Selected hooks: none.

## Frame

Objective: migrate useful downstream `RAWR HQ` DevOps behavior into upstream
`RAWR HQ-Template` as shared template capability, with template-safe defaults,
tests, docs cleanup, and a downstream-sunset handoff.

Containment boundary:

- In scope: `services/dev/**`, optional `packages/dev-node/**`,
  `plugins/cli/devops/**`, root and app package metadata needed to expose/test
  the projects, `vitest.config.ts`,
  `scripts/githooks/template-managed-paths.txt`, `AGENTS_SPLIT.md`,
  `docs/process/CROSS_REPO_WORKFLOWS.md`, and lane-local artifacts.
- Downstream `RAWR HQ` DevOps code is read-only behavior evidence and source
  material.
- Downstream deletion is out of scope until the final downstream sunset phase.

Primitive boundary: one implementation workstream for the DevOps lane. It may
run discovery, design, planning, review, development, repair, verification, and
handoff phases, but it does not own all Workstream B lane sequencing or final
downstream sunset.

Non-goals:

- Do not preserve downstream DevOps as future architecture authority.
- Do not delete downstream `packages/dev/**` or `plugins/cli/devops/**`.
- Do not run global plugin sync, link repair, provider-home mutation, or
  Graphite stack mutation as incidental validation.
- Do not migrate unrelated operational plugins.
- Do not redesign Graphite workflow policy broadly.
- Do not keep personal-owned DevOps split language as current guidance.

Done means:

- Upstream has service-owned `@rawr/dev` and projection-owned
  `@rawr/plugin-devops` projects discovered by Nx, plus `@rawr/dev-node` if a
  reusable Node adapter is introduced.
- `rawr dev stack doctor`, `rawr dev stack drain`,
  `rawr dev repo sync-upstream`, and `rawr dev worktree cleanup` are available
  through the actual template CLI path.
- Service logic is testable with fake resources without mutating real Git,
  Graphite, worktrees, or provider homes.
- JSON fixtures/contracts cover all DevOps commands.
- Template defaults are safe: no plugin convergence unless `--converge-after`,
  no link healing unless `--heal-links`.
- Worktree cleanup uses strict candidate scoping and cannot remove unrelated
  worktrees through substring accidents.
- Stale split docs and template-managed path guard are updated.
- Required gates pass or are recorded with concrete blockers.

## Opening Packet

Opening input:

- User asked the DRA to build and run a long-running multi-agent workstream
  end-to-end for the assigned `devops migration` lane.
- Program DRA note said plugin-sync ancestry ambiguity was fixed and current
  DevOps handoff was captured in `.scratch/workstream-b-integration`, but that
  scratch path is not present in the current tree.

Authority inputs:

- Current user decision and lane assignment.
- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/devops/{READINESS,DISCOVERY,SPEC,ROUGH_PLAN}.md`
- Current upstream code at `b322aa80`.
- Downstream `RAWR HQ` DevOps code at observed `main` commit `4ab6c1f2`.

Authority order:

1. Current user decision and DRA direction.
2. Workstream B authority map and accepted review findings.
3. Current upstream `RAWR HQ-Template` code.
4. Current downstream `RAWR HQ` code as behavior evidence.
5. Lane packet evidence and prior Workstream B lane artifacts.
6. Old split docs only as stale inputs or docs-to-change.

Coordination inputs:

- Workstream B recommended sequence: upstream-fallout, undo, plugin-sync,
  session-tools, devops, downstream sunset.
- Local branch has current merged baseline content through plugin-sync PR `#324`.

Evidence inputs:

- Downstream `packages/dev/**`
- Downstream `plugins/cli/devops/**`
- Current upstream package/plugin examples, root scripts, `vitest.config.ts`,
  `apps/cli/package.json`, `scripts/githooks/template-managed-paths.txt`, and
  docs/process split guidance.

Excluded or stale inputs:

- Stale DevOps split model that keeps `packages/dev/**` and
  `plugins/cli/devops/**` personal-owned.
- Downstream personal wording and defaults as template authority.
- Scratch integration files absent from current tree.

Control inputs:

- Graphite-first repo workflow.
- Worktree must remain scoped to
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-devops-workstream-b-devops-migration`.

Stop/escalation conditions:

- A command would mutate real Graphite stacks, remove worktrees, run plugin
  sync/link repair, or write provider homes outside explicit operator intent.
- Upstream implementation would need machine-specific paths as template
  defaults.
- CLI registration cannot expose `rawr dev ...` through current oclif
  conventions.
- Tests cannot prove safety without real destructive operations.

## Output Contract

Required outputs:

- `IMPLEMENTATION_PLAN.md`
- `REVIEW_FINDINGS.md`
- Upstream package/plugin code and tests.
- Updated stale split docs and template-managed path manifest.
- Final completion audit and Next Packet.

Optional outputs:

- Additional lane-local deferred inventory if residual sunset/deletion work is
  discovered.

Claim strength / evidence class:

- Code claims require tests or direct file inspection.
- Safety claims require mocked/dry-run fixture proof, not successful real
  mutation.
- Graphite stack position was inspected with `gt ls`; submit was not run in
  this workstream closeout.

Surfaces touched:

- Lane docs and planned implementation surfaces only.

Expected gates:

- `TMPDIR=/private/tmp bunx nx show project @rawr/dev --json`
- `TMPDIR=/private/tmp bunx nx show project @rawr/dev-node --json` if
  `@rawr/dev-node` is introduced
- `TMPDIR=/private/tmp bunx nx show project @rawr/plugin-devops --json`
- `TMPDIR=/private/tmp bunx nx run @rawr/dev:test`
- `TMPDIR=/private/tmp bunx nx run @rawr/dev-node:test` if introduced
- `TMPDIR=/private/tmp bunx nx run @rawr/plugin-devops:test`
- `TMPDIR=/private/tmp bunx nx run @rawr/cli:test`
- `TMPDIR=/private/tmp bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops,@rawr/cli`
- stale-doc `rg` checks for old DevOps split ownership.
- `git status --short --branch`

## Workflow

Preflight:

- Checked branch and clean worktree with `git status --short --branch`.
- Confirmed local `HEAD` equals `main` / `origin/main` at `b322aa80`.
- Installed dependencies with `TMPDIR=/private/tmp bun install --frozen-lockfile`
  with no changes.
- Confirmed Nx project discovery works with `TMPDIR=/private/tmp bunx nx show projects`.

Investigation lanes:

- Upstream conventions mapper.
- Downstream behavior mapper.
- Baseline integration mapper.
- Red-team safety/proof reviewer.

Phase teams:

- Discovery wave completed read-only.
- Plan review rejected the first plain-package shape and forced service-first
  alignment with the `agent-config-sync` pattern.
- Implementation completed in a single owner lane after the ownership boundary
  changed to `services/dev` + `packages/dev-node` + thin
  `plugins/cli/devops`.

Design lock:

- Upstream owns DevOps architecture.
- Downstream behavior is source evidence only.
- `--converge-after` and `--heal-links` are opt-in upstream.
- Worktree cleanup must be stricter than downstream substring matching.
- JSON contracts are specified before claiming parity.

Agent packets:

- Opening discovery agents were sent bounded read-only packets.

Wave packets:

- Review findings captured in `REVIEW_FINDINGS.md`.
- Closure packet captured in `NEXT_PACKET.md`.

Scratch policy:

- The workstream uses lane-local artifacts instead of relying on global scratch
  state. The implementation will decide scratch policy as a template contract
  rather than copying downstream personal defaults blindly.

## Findings

See `docs/projects/workstream-b-preparation/lanes/devops/REVIEW_FINDINGS.md`.

## Outcome Record

Objective outcome: `achieved in worktree; integration-reviewed; submit pending`.

Residual objective gaps:

- Graphite submit/review remains pending at this artifact write.

Implementation summary:

- Added `services/dev` as service-owned DevOps logic with fakeable resource
  ports and no direct `node:fs` / `node:child_process` coupling in service
  modules.
- Added `packages/dev-node` for Node resource binding and scratch policy input.
- Added `plugins/cli/devops` as the thin oclif projection registered through
  `apps/cli`.
- Hardened DevOps process execution so missing commands and timeouts return
  structured failed command steps instead of escaping the service result model.
- Hardened HQ status external probes so a slow or wedged `lsof` probe cannot
  hang the full CLI suite.
- Updated root/Nx/Vitest/package metadata so the projects are discoverable and
  included in normal build/typecheck/test surfaces.
- Updated split/process docs and template-managed path guards so DevOps is now
  treated as template-owned shared capability.

Decisions: see `IMPLEMENTATION_PLAN.md`.

Evidence: discovery wave outputs and files listed above.

Verification:

- `TMPDIR=/private/tmp bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops,@rawr/cli --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/dev:build --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/dev-node:build --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/plugin-devops:build --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/dev:test --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/dev-node:test --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx nx run @rawr/plugin-devops:test --skip-nx-cache` passed.
- `TMPDIR=/private/tmp bunx vitest run --project cli apps/cli/test/devops-command-surface.test.ts` passed.
- `TMPDIR=/private/tmp bunx vitest run --project cli apps/cli/test/hq.test.ts` passed after HQ probe timeout repair.
- `TMPDIR=/private/tmp bunx nx run @rawr/cli:test --skip-nx-cache` passed
  after integration repairs (`26` test files, `79` tests).
- `gt ls` passed after the final commit.
- `gt log --all` passed after the Integration DRA final amend.

## Deferred Inventory

- Downstream deletion/sunset of `packages/dev/**` and `plugins/cli/devops/**`
  remains for the downstream sunset lane after template changes land and sync.
- Graphite submit/review remains pending at this artifact write.

## Review Result

Leaf loops:

- Early red-team discovery produced accepted P1/P2/P3 findings before plan
  artifact finalization.

Composed loops:

- Service boundary review complete.
- Safety repair review complete.
- Focused verification complete.

Waivers: none.

Invalidations: none.

Repair demands:

- Accepted repair demands are encoded into `IMPLEMENTATION_PLAN.md`.

Closure steward result: lane closeout packet written.

## Final Output

Artifacts:

- `WORKSTREAM_RECORD.md`
- `IMPLEMENTATION_PLAN.md`
- `REVIEW_FINDINGS.md`
- `COMPLETION_AUDIT.md`
- `NEXT_PACKET.md`

Verification run: focused gates and full CLI suite passed after integration
repairs.

Repo/Graphite state:

- `git status --short --branch`: clean after local lane commit.
- `gt ls`: passed; branch is at the top of the Workstream B stack.
- `gt log --all`: passed after the Integration DRA final amend. Submit not run
  at artifact write.

## Next Packet

See `docs/projects/workstream-b-preparation/lanes/devops/NEXT_PACKET.md`.
