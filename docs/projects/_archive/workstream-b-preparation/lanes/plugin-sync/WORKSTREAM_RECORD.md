# Plugin Sync / Tooling Substrate Parity Workstream

Status: `closure-ready`.
Branch: `agent-plugin-sync-workstream-b-sync-substrate-parity`.
PR: `none`.
Commit: branch HEAD; exact hash is reported by `git rev-parse --short HEAD`.
DRA: `Codex`.
Dates: `2026-05-08 -> active`.

This record preserves state and handoff context for the plugin-sync Workstream B
lane. It is not architecture authority, program sequencing authority, or a live
task board.

## Workstream State

Workstream record path:
`docs/projects/workstream-b-preparation/lanes/plugin-sync/WORKSTREAM_RECORD.md`

Status: committed; clean status pending final handoff check.

DRA: Codex parent agent in this lane worktree.

Branch/stack: `agent-plugin-sync-workstream-b-sync-substrate-parity`, based on
`main` at `4eb85769` after upstream-fallout, the session-tools PR `#322`
squash-merge content, and undo merged. The stale local
`agent-session-tools-workstream-b-session-parity` branch ref is not an ancestor
of this branch because that lane landed through a squash merge.
Local preparation branch `codex/workstream-b-preparation` is no longer present
because its content is on `main`.

Current phase: implementation verified and committed; pending final handoff
check.

Selected skills:

- `solution-design`
- `team-design`
- `workstream-runner`
- `workstream-review-loops`

Selected agents:

- Upstream substrate mapper: reads current upstream service/node/plugin
  capabilities and tests.
- Downstream inventory mapper: classifies downstream duplicate behavior and
  docs.
- Validation/harness mapper: classifies safe non-mutating proof versus
  repair/mutating commands.
- Red-team reviewer: challenges authority, proof, deletion, and Graphite risks.

Selected hooks: none.

## Frame

Objective: prove upstream `RAWR HQ-Template` plugin sync/tooling substrate
parity and produce a precise downstream duplicate-authority sunset plan without
deleting downstream content or running incidental global repair.

Containment boundary:

- Upstream authority surfaces: `services/agent-config-sync/**`,
  `packages/agent-config-sync-node/**`, `plugins/cli/plugins/**`, targeted
  upstream sync docs/tests.
- Downstream `RAWR HQ` surfaces are read-only evidence during this workstream.

Primitive boundary: one implementation workstream for the plugin-sync lane. It
may run discovery, design, planning, review, implementation, repair, and
closure phases, but it does not own final downstream sunset or other Workstream
B lane sequencing.

Non-goals:

- Do not delete downstream `packages/agent-sync`, downstream plugin CLI paths,
  docs, skills, or content in this workstream.
- Do not run global plugin sync or link repair as incidental validation.
- Do not treat `--source-workspace` as implementation authority.
- Do not hide provider-native gaps with direct projection fallback.
- Do not use `plugins converge` unless deliberately scoped by the DRA; it can
  cross from proof into repair behavior.

Done means:

- Upstream parity gaps discovered in this lane are either implemented and
  tested, explicitly rejected, or deferred with owner/trigger.
- Bounded non-mutating `--source-workspace` proof against downstream-shaped
  content is recorded.
- Downstream duplicate behavior inventory is classified as bring upstream,
  preserve as content/source input, remove later as duplicate authority, or
  stale-doc cleanup.
- Required targeted gates pass or have honest skipped-check rationale.
- Review findings are dispositioned and accepted P1/P2 findings are repaired,
  waived, or deferred.
- Repo and Graphite state are clean at handoff.

## Opening Packet

Opening input: user requested a long-running DRA-owned workstream from the
already accepted plugin-sync frame, with discovery, design, planning, review,
red-team, development, review, iteration, and completion.

Authority inputs:

- Current user instruction for this workstream.
- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/*`
- Current upstream code on `main` at `4eb85769`, with this lane committed on
  top as branch HEAD.
- Current downstream `RAWR HQ` code as evidence only.

Authority order:

1. Current user instruction in this workstream.
2. Workstream B authority map and lane packet.
3. Current upstream code on `main`.
4. Current downstream code as evidence.
5. Accepted review findings, especially `F-04-01` and `F-04-02`.
6. Old docs only as stale/evidence inputs.

Coordination inputs:

- Program DRA CLI/test warning: before CLI tests, check for concurrent
  CLI/Vitest runners if possible; avoid concurrent `@rawr/cli:test`; prefer
  targeted plugin-sync tests first; use single-worker mode if a broad CLI gate
  is needed.
- Sandbox note: `ps -axo ...` was blocked by the current environment
  (`operation not permitted`), so this DRA serializes CLI tests and does not ask
  peer agents to run broad CLI/Vitest gates in this checkout.

Evidence inputs:

- `services/agent-config-sync/test/TESTING_PLAN.md`
- `services/agent-config-sync/test/*`
- `packages/agent-config-sync-node/test/*`
- `plugins/cli/plugins/test/*`
- `apps/cli/test/plugins-*.test.ts`
- downstream `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/**`
- downstream `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins/**`

Excluded or stale inputs:

- Downstream duplicate implementation as future authority.
- Stale docs that present downstream sync as continuing owner.
- Global provider-home state as proof unless an explicit operator-approved
  smoke is opened.

Control inputs:

- Graphite required; trunk is `main`.
- Use `gt sync --no-restack` and scoped restack only.
- Keep worktree clean at handoff.
- Mutating file edits use absolute paths rooted in this worktree.

Stop/escalation conditions:

- A downstream-only behavior remains valuable with no upstream equivalent or
  test home.
- Parity proof requires mutating global provider homes.
- `--source-workspace` cannot inspect downstream content in bounded
  dry-run/status/drift mode.
- Managed cleanup cannot prove ownership before deletion.
- Work would delete downstream material before final downstream sunset.
- Work collides with a live devops or other lane branch on the same files.

## Output Contract

Required outputs:

- DRA workstream record.
- Implementation plan artifact.
- Review/red-team findings and DRA dispositions.
- Code/docs/tests for accepted implementation scope.
- Downstream behavior inventory or an integrated inventory section.
- Completion audit mapping prompt requirements to evidence.
- Next Packet if residual work remains.

Optional outputs:

- Deferred inventory for downstream sunset risks.
- Lane-local lesson capture if implementation removes or sunsets material with
  hard-won lessons.

Claim strength / evidence class:

- Code/test claims require current file inspection and command output.
- Parity claims require upstream tests plus bounded non-mutating
  `--source-workspace` proof.
- Downstream sunset claims are planning-only in this workstream.

Surfaces touched:

- `apps/cli/test/plugins-source-workspace.test.ts`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/DOWNSTREAM_INVENTORY.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/WORKSTREAM_RECORD.md`

Expected gates: see `Outcome Record`.

## Workflow

Preflight:

- `git status --short --branch`: clean on
  `agent-plugin-sync-workstream-b-sync-substrate-parity`.
- `gt ls`: branch is stacked on current `main`.
- `bunx nx show projects`: target projects resolve after `bun install
  --frozen-lockfile`.
- Baseline freshness: branch is based on `main` at `4eb85769`, which includes
  upstream-fallout, the session-tools PR `#322` squash-merge content, and undo
  merges. Do not use stale sibling branch ancestry as the session-tools
  integration signal.

Investigation lanes:

- Upstream substrate mapper.
- Downstream inventory mapper.
- Validation/harness mapper.
- Red-team reviewer.

Phase teams:

- Phase 1: read-only discovery and solution design.
- Phase 2: plan artifact and review/red-team disposition.
- Phase 3: implementation on this branch after DRA design lock.
- Phase 4: targeted verification and review repair.
- Phase 5: completion audit, closure record, and Next Packet if needed.

Design lock: achieved after plan review and red-team disposition.

Agent packets: see selected agents above; full prompt packets live in parent
thread tool calls.

Wave packets: discovery, plan review, implementation, and verification waves
completed.

Scratch policy: durable artifacts live in this lane directory.

## Findings

### Discovery Findings

- Upstream substrate already contains the core service/node/plugin layers, but
  parity proof was missing at the command boundary for external
  `--source-workspace` use.
- Existing service tests cover source-workspace planning and cleanup-behind
  behavior, but the lane needed a CLI E2E proving the template CLI entrypoint
  reads downstream-shaped source content instead of invocation-workspace
  content.
- Downstream duplicate authority is broader than `packages/agent-sync/**`.
  It also includes root undo imports, package dependencies, plugin sync/status
  commands, install-state legacy overlap logic, and docs/skills that teach the
  old owner.
- Real downstream content can be inspected non-mutatingly from this upstream
  worktree: status/drift/sync-all dry-run saw 12 downstream agent plugins from
  `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq`.

### Review Findings And Dispositions

- Accepted: gate contract was too soft. Repaired by making
  `IMPLEMENTATION_PLAN.md` list exact closure gates and by running them.
- Accepted: single-plugin sync was unproven. Repaired by adding
  `apps/cli/test/plugins-source-workspace.test.ts` coverage for
  `plugins sync personal-agent --source-workspace <external> --dry-run --json`.
- Accepted: dry-run safety needed real before/after oracles. Repaired by
  snapshotting isolated home/provider roots plus invocation/source workspaces
  around dry-run commands, excluding only expected command journal material.
- Accepted: cleanup-behind proof needed retention/skipped evidence. Repaired by
  adding shared-skill managed residue and asserting retained/skipped cleanup
  output.
- Accepted: downstream smoke needed real downstream content. Repaired by
  running bounded non-mutating smoke against the downstream repo with isolated
  `HOME`, `XDG_*`, `CODEX_HOME`, and `CLAUDE_PLUGINS_LOCAL`.
- Accepted: downstream inventory was too broad. Repaired by replacing it with a
  scan-backed disposition matrix in `DOWNSTREAM_INVENTORY.md`.
- Deferred: downstream deletion, mutating provider-home runtime visibility, and
  full CLI/install parity remain downstream-sunset or separate proof work.

### Integration Review Addendum

- Accepted: the initial baseline wording could be misread as claiming the
  stale local `agent-session-tools-workstream-b-session-parity` branch ref is
  in this branch's ancestry. Repaired by specifying that session-tools is
  present through the `#322` squash merge on `main`; DevOps should use current
  `main` content and Graphite parentage, not the stale branch ref, as the
  integration signal.

## Outcome Record

Objective outcome: `achieved for bounded lane scope`.

Implemented scope:

- Added CLI E2E proof for template CLI `--source-workspace` behavior:
  - command identity/help surface;
  - single-plugin external source sync;
  - status/drift external source assessment;
  - sync-all dry-run external source planning;
  - cleanup-behind planned deletion plus shared-residue retention;
  - no provider-home/source-workspace writes in dry-run.
- Added a lane implementation plan with exact gate contract and review
  dispositions.
- Added scan-backed downstream inventory for the downstream sunset lane.
- Ran real downstream non-mutating smoke against the personal repo and recorded
  the result.

Decisions:

- Claim only plugin sync substrate parity for status, drift, single-plugin
  sync, sync-all dry-run, source-workspace routing, and cleanup-behind planning.
- Do not claim downstream deletion readiness without the downstream sunset
  lane.
- Do not claim full CLI/install parity; mixed oclif/dependency drift remains a
  separate risk.
- Treat mutating `--source-workspace` examples in old downstream skill docs as
  evidence only, not validation instructions.

Evidence:

- `apps/cli/test/plugins-source-workspace.test.ts`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/DOWNSTREAM_INVENTORY.md`
- `services/agent-config-sync/test/TESTING_PLAN.md`

Verification:

- `ps -axo pid,ppid,stat,etime,command | rg "(vitest|nx run @rawr/cli:test|apps/cli/src/index.ts|wt-agent-plugin-sync)"`: blocked by sandbox with `operation not permitted`; tests were serialized locally.
- `bunx vitest run --project cli apps/cli/test/plugins-source-workspace.test.ts`: passed, 3 tests.
- `bunx vitest run --project agent-config-sync`: passed, 5 files / 52 tests.
- `bunx vitest run --project plugin-plugins`: passed, 2 files / 17 tests.
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli,@rawr/hq-ops`: passed.
- `bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli`: passed.
- Downstream status smoke with isolated homes:
  - workspace root: `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq`;
  - `checks=sync`, `install=SKIPPED`;
  - 12 downstream agent plugins discovered;
  - `sync=DRIFT_DETECTED`, expected with empty isolated provider homes;
  - conflicts: 0.
- Downstream drift smoke with isolated homes:
  - `includeOclif=false` for external source workspace;
  - 12 downstream agent plugins discovered;
  - material changes: 31; metadata changes: 7; conflicts: 0.
- Downstream sync-all dry-run smoke with isolated homes:
  - 12 downstream agent plugins planned;
  - Codex package/install actions were `planned`;
  - cleanup-behind action count: 12;
  - undo unavailable, as expected for dry-run;
  - isolated provider home remained empty after dry-run.
- Downstream repo after smoke: `git status --short --branch` remained clean on
  `main...origin/main`.

## Deferred Inventory

- Undo two-provider snapshot/failure-injection gaps from
  `services/agent-config-sync/test/TESTING_PLAN.md` remain deferred unless a
  later lane explicitly expands proof.
- Downstream `packages/agent-sync/**` deletion is deferred to downstream
  sunset after integration.
- Downstream docs/skills that teach `@rawr/agent-sync` or local split-root
  commands require stale-doc cleanup during downstream sunset.
- Hook/MCP plugin-packaged projection remains unclaimed where downstream
  Hyperresearch docs say it is unclaimed.

## Review Result

Leaf loops:

- Upstream substrate mapper: completed; accepted command-boundary proof gap.
- Downstream inventory mapper: completed; accepted inventory broadness gap.
- Validation/harness mapper: completed; accepted non-mutating command set.
- Plan reviewer: completed; accepted gate and inventory tightening.
- Red-team reviewer: completed; accepted single-plugin, real downstream smoke,
  default dry-run safety, and cleanup-retention proof demands.

Composed loops:

- DRA integrated discovery, plan review, red-team findings, implementation,
  verification, and closure record.

Waivers:

- `ps` collision check could not run because sandbox blocks `ps`; serialized
  tests were used instead.
- Mutating provider runtime visibility proof is waived for this lane because
  the user requested upstream parity and downstream migration prep, not global
  provider-home mutation.

Invalidations:

- Initial plan language saying typecheck/build gates were needed "where
  feasible" was invalidated and replaced with exact commands.
- Initial inventory broad buckets were invalidated and replaced by scan-backed
  path dispositions.

Repair demands:

- None remaining for this bounded lane after the verification above.

Closure steward result:

- Bounded lane can close as upstream plugin sync substrate parity proof and
  downstream sunset handoff input. It cannot close downstream sunset itself.

## Final Output

Artifacts:

- `apps/cli/test/plugins-source-workspace.test.ts`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/DOWNSTREAM_INVENTORY.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/WORKSTREAM_RECORD.md`

Verification run: see `Outcome Record`.

Repo/Graphite state: committed through `gt modify`. Graphite restacked
`agent-devops-workstream-b-devops-migration` onto this lane because Graphite
tracks it as the child branch. Final handoff should verify both worktrees are
clean.

## Next Packet

Downstream sunset lane should start from `DOWNSTREAM_INVENTORY.md` and verify:

1. upstream branch is integrated into downstream;
2. downstream package imports no longer require `@rawr/agent-sync`;
3. each `packages/agent-sync/test/*.ts` scenario is covered upstream, rejected
   as stale, or deferred with owner/trigger;
4. downstream docs/skills no longer present downstream `@rawr/agent-sync` as
   shared authority;
5. no mutating provider-home repair is run without explicit operator approval.
