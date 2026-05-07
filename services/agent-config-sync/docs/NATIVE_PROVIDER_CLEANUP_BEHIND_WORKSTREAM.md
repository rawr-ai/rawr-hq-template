# Native Provider Cleanup-Behind Workstream

Status: `closed`.
Branch: `codex/native-provider-cleanup-implementation`.
PR: `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/317`.
Commit: current branch commit.
DRA: `Codex`.
Dates: `2026-05-05 -> 2026-05-05`.

This record preserves state and handoff context for one bounded workstream. It
is not architecture authority, product authority, a program definition,
sequence authority, or a live task board.

## Workstream State

Workstream record path:
`services/agent-config-sync/docs/NATIVE_PROVIDER_CLEANUP_BEHIND_WORKSTREAM.md`

Status: closed.

DRA: Codex.

Branch/stack: Graphite branch
`codex/native-provider-cleanup-implementation`, child of
`codex/native-provider-cleanup-handoff`.

Current phase: closure.

Selected skills: workstream-runner.

Selected agents:

- Safety reviewer: destructive cleanup ownership and path-boundary review.
- Proof-boundary reviewer: JSON semantics, dry-run wording, and parity-claim
  review.

Selected hooks: default repo/session hooks only.

## Frame

Objective: Add a generic cleanup-behind provider sync capability, with Codex
native install superseding old RAWR-managed direct projection residue as the
first policy.

Containment boundary: `services/agent-config-sync`,
`plugins/cli/plugins`, service-local docs/tests, and CLI surface tests.

Primitive boundary: one implementation workstream. Downstream `rawr-hq`
content and downstream `packages/agent-sync` are out of scope.

Non-goals:

- Do not backport into downstream `rawr-hq`.
- Do not delete downstream `packages/agent-sync`.
- Do not treat direct projection as provider parity.
- Do not add a broad filesystem janitor.
- Do not claim MCP/settings parity where provider activation is not proven.
- Do not claim plugin-package custom-agent activation; active Codex custom
  agents are native role TOML config under the Codex home.

Done means:

- Provider sync can invoke generic cleanup-behind behavior.
- The first Codex cleanup policy removes only registry-owned residue after a
  same-home verified native install or dry-run planned install.
- Cleanup is undo-backed, dry-run-visible, JSON-visible, and shared-claim safe.
- Habitat and Hyperresearch remain installed/enabled in real Codex and Claude
  homes, with native Codex hooks visible.

## Opening Packet

Opening input: user-approved Generic Cleanup-Behind Provider Sync Workstream
plan.

Authority inputs:

- User-approved implementation plan.
- `NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md`.
- `PARITY_INVESTIGATION_REPORT.md`.
- Live repo code/tests/docs.
- Real provider proof from `/Users/mateicanavra/.codex-rawr` and Claude local
  plugin homes.

Authority order: user plan, live repo/tests, provider proof, existing handoff,
prior report.

Coordination inputs: none external.

Evidence inputs: service tests, CLI tests/help, full Nx gate, real provider
app-server/Claude validation proof.

Excluded or stale inputs: direct downstream backport plans and old
projection-as-parity claims.

Control inputs: Graphite workflow, repo AGENTS instructions, workstream-runner
closure expectations.

Stop/escalation conditions:

- Cleanup requires deleting unmanaged paths.
- Cleanup would remove projection-only behavior not proven native.
- Real provider install proof diverges from package/install JSON.
- Unrelated tracked changes appear in touched files.

## Output Contract

Required outputs:

- Generic cleanup-behind service procedure.
- First Codex native-superseded-projection cleanup policy.
- CLI `--cleanup-behind` wiring and `cleanupBehind` JSON.
- Tests covering destructive safety boundaries.
- Updated docs/report/workstream record.
- Real-home provider proof.

Optional outputs: zero-context Next Packet if anything remains open.

Claim strength / evidence class: local verified for service/CLI behavior; real
provider proof for installed Habitat/Hyperresearch state.

Surfaces touched: service retirement module, plugin CLI sync commands,
plugin sync docs, parity report, tests.

Expected gates:

- `bunx nx run @rawr/agent-config-sync:test --output-style=stream`
- `bunx nx run @rawr/plugin-plugins:test --output-style=stream`
- `bunx vitest run apps/cli/test/plugins-command-surface-cutover.test.ts --project cli`
- Full run-many gate for service, node adapter, and plugin CLI.
- CLI help checks.
- `git diff --check`

## Workflow

Preflight: branch and repo state checked clean on
`codex/native-provider-cleanup-handoff`; implementation branch created.

Investigation lanes:

- Service retirement API and helper boundaries.
- CLI native package/install result flow.
- Test fixture and provider proof surfaces.

Phase teams: DRA-only implementation with later review/proof disposition.

Design lock:

- Generic procedure name: `cleanupBehindProviderSync`.
- First policy reason: `codex_native_superseded_projection`.
- JSON output key: `cleanupBehind`.
- CLI flag: default-on `--cleanup-behind`.

Agent packets: N/A.

Wave packets: N/A.

Scratch policy: no scratch artifacts beyond this record.

## Findings

Accepted reviewer findings:

- Cleanup skill verification originally used total `skills/list` visibility
  rather than same-plugin skill visibility. Fixed by adding
  `visiblePluginSkillCount` to Codex install verification and requiring it to
  cover `skillCount` before skill cleanup is authorized.
- Registry claim values originally joined directly into deletion targets. Fixed
  by bounding cleanup targets under their expected roots and retaining unsafe
  registry claims as `unsafe-registry-claim-retained`.
- Cleanup candidate construction originally did not suppress real cleanup when
  `codexInstall.ok === false`. Fixed by returning no candidates after failed
  real Codex install results.
- Stale docs still referenced proposed names such as
  `retireNativeSupersededCodexProjections`,
  `nativeProjectionCleanup`, and `--no-native-projection-cleanup`. Fixed to
  use `cleanupBehindProviderSync`, `cleanupBehind`, and
  `--no-cleanup-behind`.

## Outcome Record

Objective outcome: achieved.

Residual objective gaps:

- Hyperresearch has retained cleanup-behind residue because the existing
  managed registry entry points at a different existing source worktree:
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-rawr-hq-hyperresearch-hooks/plugins/agents/hyperresearch`.
  The policy correctly treats this as a source collision, not safe residue to
  delete.
- Graphite submit remains the final repository operation after this record is
  submitted.

Implementation summary:

- Added generic cleanup-behind service contract and router path.
- Added Codex cleanup-behind policy helper for native-superseded projection
  residue.
- Added CLI `--cleanup-behind` and `cleanupBehind` output for single/all sync.
- Added plugin-scoped Codex skill verification via `visiblePluginSkillCount`.
- Added root-bounded deletion checks for skill, hook, and MCP registry claims.
- Added service and CLI tests for destructive safety boundaries.

Decisions:

- Projection-only prompts, scripts, and settings/config remain retained by
  default.
- Codex custom-agent TOML role files are retained as native role config, not
  projection-only residue.
- MCP `config.toml` entries remain retained without exact key ownership.
- Shared runtime skill deletion checks sibling Codex homes that share
  `$HOME/.agents/skills`.
- Real cleanup is suppressed when Codex install reports failure. Dry-runs still
  show planned cleanup from planned package/install actions.

Evidence:

- `bunx nx run @rawr/agent-config-sync:test --output-style=stream`: passed,
  34 tests.
- `bunx nx run @rawr/plugin-plugins:test --output-style=stream`: passed,
  14 tests.
- `bunx nx run @rawr/agent-config-sync-node:test --output-style=stream`:
  passed, 19 tests.
- `bunx nx run-many -t typecheck,test,build,structural -p @rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins --output-style=stream`:
  passed.
- `bun run rawr -- plugins sync --help`: passed; shows
  `--[no-]cleanup-behind`.
- `bun run rawr -- plugins sync all --help`: passed; shows
  `--[no-]cleanup-behind`.
- `git diff --check`: passed.

Verification:

- Real Habitat sync from downstream source with template operator passed:
  Codex install verified `installed: true`, `enabled: true`, `skillCount: 2`,
  `visiblePluginSkillCount: 2`, `providerHookCount: 2`; cleanup removed the two
  old root direct-projection skills on first real run and later reported no
  matching residue.
- Real Hyperresearch sync from downstream source with template operator passed:
  Codex install verified `installed: true`, `enabled: true`, `skillCount: 1`,
  `visiblePluginSkillCount: 1`, `providerHookCount: 2`; cleanup retained the
  source-collision registry entry.
- Codex app-server proof with
  `/Users/mateicanavra/.volta/bin/codex app-server --enable plugins --enable plugin_hooks`
  and `CODEX_HOME=/Users/mateicanavra/.codex-rawr`:
  `plugin/list` showed `habitat@rawr-hq` and `hyperresearch@rawr-hq`
  installed/enabled; `plugin/read` showed
  `habitat:workstream-review-loops`, `habitat:workstream-runner`, and
  `hyperresearch:hyperresearch-codex`; `skills/list` showed those namespaced
  plugin skills; `hooks/list` showed two enabled hooks for each plugin.
- Claude proof:
  `claude plugin list` showed `habitat@local` and `hyperresearch@local`
  enabled; `claude plugin validate` passed for both with warnings only.

## Deferred Inventory

N/A so far.

## Review Result

Leaf loops:

- Safety review: initial blockers accepted and fixed; focused re-review found
  no remaining blockers.
- Proof-boundary review: initial blocker accepted and fixed; focused re-review
  found no remaining blockers. Two non-blocking stale-doc findings were fixed.

Composed loops: DRA disposition complete.

Waivers: none.

Invalidations: none.

Repair demands: all accepted demands repaired.

Closure steward result: self-closed by DRA using workstream-runner closure
checks.

## Final Output

Artifacts:

- Service procedure: `cleanupBehindProviderSync`.
- First cleanup policy: `codex_native_superseded_projection`.
- CLI flag: `--cleanup-behind` / `--no-cleanup-behind`.
- JSON result: `cleanupBehind`.
- Workstream record: this file.

Verification run: passed as recorded above.

Repo/Graphite state: committed on current branch and submitted as draft PR
`https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/317`.

## Next Packet

No Next Packet required. The remaining action is external review/merge of the
submitted Graphite stack:

- Handoff PR: `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/316`
- Implementation PR:
  `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/317`
