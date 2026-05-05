# Managed Provider Plugin Parity Workstream

Status: `ready-for-submit`.
Branch: `codex/agent-C-agent-config-sync-managed-provider-plugin-parity`.
PR: `none`.
Commit: `021d37b4 baseline`.
DRA: `Codex`.
Dates: `2026-05-04 -> active`.

This record preserves state and handoff context for one bounded workstream. It
is not architecture authority, product authority, a program definition,
sequence authority, or a live task board.

## Workstream State

Workstream record path:
`services/agent-config-sync/docs/MANAGED_PROVIDER_PLUGIN_PARITY_WORKSTREAM.md`

Status: active.

DRA: Codex.

Branch/stack: Graphite branch
`codex/agent-C-agent-config-sync-managed-provider-plugin-parity`, parent
`main`.

Current phase: Graphite commit and submission.

Selected skills: workstream-runner, team-design, perspective, system-design,
domain-design, git-worktrees, graphite.

Selected agents: paired read-only lanes:

- Pair A: Codex native plugin truth and Codex docs/runtime skew.
- Pair B: Claude native plugin truth and RAWR Claude adapter gap.
- Pair C: RAWR source/service truth and CLI/package dirty-diff
  classification.
- Pair D: architecture/review lanes after A-C evidence returns.

Selected hooks: local workstream pack projected by
`bun tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts --target local`.

## Frame

Objective: Make native provider plugin deployment the single sanctioned
Codex/Claude path for RAWR agent plugins, with hooks as the blocking parity
capability, after re-proving provider truth.

Containment boundary: `services/agent-config-sync`,
`packages/agent-config-sync-node`, `plugins/cli/plugins`, and adjacent
service-local docs/tests needed to prove the behavior.

Primitive boundary: one implementation workstream in `rawr-hq-template`.
Direct sync remains an auxiliary generic destination projection capability, not
a Codex/Claude deployment lane. Codex provider edits are outside this
workstream unless a separate explicit provider workstream is authorized.

Non-goals:

- Do not preserve direct sync as a sanctioned Codex/Claude fallback.
- Do not hide provider-native gaps with template-side shims.
- Do not promote downstream personal plugin material into the template.

Done means:

- Codex and Claude hooks install through native plugin paths.
- The code and CLI distinguish native provider deployment from generic
  destination projection.
- Prior RAWR-managed direct provider artifacts can be retired without touching
  unmanaged user material.
- The parity report and operator docs are current and concrete.

## Opening Packet

Opening input: user-approved managed provider plugin parity plan.

Authority inputs:

- User instruction in this thread.
- `PARITY_INVESTIGATION_REPORT.md`.
- Current repo code/tests/docs.
- Current `codex-rawr` and Claude provider surfaces.

Authority order: user instruction, live provider proof, live repo tests/code,
prior report, prior memory.

Coordination inputs: paired read-only agent lanes.

Evidence inputs: CLI help/output, provider source/docs, test results, code
diffs, report updates.

Excluded or stale inputs: old claims that Codex packages cannot carry hooks
until disproven or reconfirmed against the current `codex-rawr` app-server.

Control inputs: Graphite workflow, new worktree, local workstream pack.

Stop/escalation conditions:

- Current `codex-rawr` cannot natively activate plugin hooks and provider patch
  work is required before template parity can be claimed.
- Codex docs advertise plugin hooks but installed/source/runtime surfaces do
  not expose an activation lifecycle; this becomes version-skew/provider-blocker
  evidence, not a template-side shim opportunity.
- Native Claude/Codex install semantics would require destructive writes to user
  homes during tests.
- Existing unrelated user changes appear in tracked implementation files.

## Output Contract

Required outputs:

- Implementation closing native Codex/Claude hook parity.
- Generic destination projection retained as a distinct auxiliary capability.
- Updated CLI behavior and tests.
- Updated parity report/current-state/testing docs.
- Verification results and Graphite commit/submit state.

Optional outputs: visual Mermaid diagram in the report.

Claim strength / evidence class: local verified for implementation behavior;
official/source-code where provider docs/source are the only available surface.

Surfaces touched: service domain model, package writers, provider adapters, CLI
commands, tests, docs.

Expected gates: targeted Nx/Vitest suites, typecheck/build/structural checks,
provider temp-home smoke tests where safe.

## Workflow

Preflight:

- Created isolated worktree from `main`.
- Tracked branch with Graphite parent `main`.
- Projected workstream-local Codex files into `.agents/` and `.codex/`.
- Cleaned the primary checkout.
- Removed accidental Codex provider worktree
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-agent-config-sync-provider-plugin-hooks`
  and deleted branch `codex/agent-config-sync-provider-plugin-hooks`.
- Re-cleaned the primary template checkout by removing generated local
  `.agents/` and `.codex/`; those remain only in this worktree.

Meta-design passes:

- Team design: paired read-only evidence lanes, with DRA-owned synthesis and no
  implementation authority delegated to agents.
- Perspective cycling: implementation, service, product, and architecture
  altitude passes are required before accepting any parity claim.
- System design: the dominant failure loop is "provider gap -> direct fallback
  -> false parity claim -> split paths"; the balancing intervention is a hard
  decision gate before implementation.
- Information assessment: live provider proof and installed/runtime protocol
  outrank repo intent docs; docs that advertise unproven behavior are treated as
  skew evidence.

Investigation lanes: complete. Implementation is accepted because provider
evidence proved Codex plugin hooks in latest native Codex and Claude native
plugin support through provider docs/runtime surfaces.

Phase teams: provider proof, service/package mapping, CLI/docs mapping.

Design lock: native provider deployment is the sanctioned Codex/Claude path;
generic destination projection is auxiliary and provider-agnostic. The lock can
block implementation if provider-native hooks are not actually available.

Agent packets: issued in chat to Pair A, Pair B, and Pair C. Pair D runs after
provider/service evidence returns.

Wave packets: this record plus
`MANAGED_PROVIDER_PLUGIN_PARITY_DECISIONS.md`.

Scratch policy: temporary provider fixtures and homes must live under system
temp directories or ignored build/test output, not tracked source paths.

## Findings

Reset findings:

- Accidental Codex provider edits were removed by deleting the provider
  worktree and branch before re-investigation.
- The workstream branch has provisional dirty template changes from the earlier
  attempt. Pair C classified the provider-package and projection split as
  salvageable, with Codex provider edits out of scope and direct-provider
  fallback claims replaced.
- Installed/generated app-server protocol exposes `plugin/install`,
  `plugin/read`, `plugin/uninstall`, and `hooks/list`. `PluginDetail` lists
  skills/apps/MCP but not hooks, so hook parity proof must use `hooks/list`.

Provider evidence:

- Current `codex-rawr` / `~/.local/bin/codex` is `0.126.0-alpha.3` and rejects
  `--enable plugin_hooks`.
- Latest native `/Users/mateicanavra/.volta/bin/codex` is
  `codex-cli 0.128.0` and supports plugin-local hooks when app-server starts
  with `--enable plugin_hooks`.
- Codex docs and upstream source define top-level `plugin.json#hooks`, default
  `hooks/hooks.json`, and app-server `hooks/list` with `HookMetadata.pluginId`.
- Codex does not publish a durable npm TypeScript/API package for these
  schemas. Generated app-server TypeScript/JSON Schema is version-specific to
  the selected binary.
- Claude native plugins support commands, skills, agents, hooks, MCP, and
  validate/install/update/enable lifecycle commands. RAWR must generate the
  local marketplace/plugin layout and use the provider CLI for lifecycle.

Decision-gate outcome:

- Proceed with template-side native provider deployment.
- Do not patch the Codex fork in this workstream.
- Use the latest native Codex binary for hook verification until `codex-rawr`
  catches up.
- Keep direct sync only as generic destination projection/export.

## Outcome Record

Objective outcome: `implemented; reviewed; verified`.

Residual objective gaps:

- Current `codex-rawr` provider-version skew for plugin hooks.
- Codex provider-native command/workflow, settings/config fragment, and custom
  agent activation semantics remain unproven package-support material.
- Codex/Claude explicit native uninstall/retirement lifecycle remains partial.
- Legacy RAWR-managed direct provider claims require careful retirement without
  touching unmanaged user files.

Implementation summary:

- Codex packages now emit hook config at `hooks/hooks.json`, reference it from
  `.codex-plugin/plugin.json` only when hook lifecycle config exists, copy hook
  scripts, rewrite hook commands to `${CODEX_PLUGIN_ROOT}/hooks/<script>`, and
  package scripts, agents, settings/config material, MCP, and assets. Hook
  scripts without hook config are support material and do not advertise native
  hook lifecycle support.
- Codex native install verification starts app-server with
  `--enable plugin_hooks` only when hooks are expected and verifies provider
  activation through `hooks/list` by `pluginId`.
- Claude local plugin staging now includes hooks, MCP, settings, assets, and
  manifest fields for provider-native install.
- Claude install now validates the local marketplace and updates already
  installed plugins before enabling them.
- CLI default sync now means native provider deployment. Generic filesystem
  projection is exposed as `rawr plugins export`, `rawr plugins export all`,
  and advanced `--destination-projection`. Export requires explicit destination
  homes and Codex projection support is labeled legacy/deprecated or
  adapter-required, not native provider parity.

Decisions:

- See `MANAGED_PROVIDER_PLUGIN_PARITY_DECISIONS.md`.

Evidence:

- Official Codex plugin docs:
  <https://developers.openai.com/codex/plugins/build>
- Official Codex hooks docs:
  <https://developers.openai.com/codex/hooks>
- Official Codex app-server schema-generation docs:
  <https://developers.openai.com/codex/app-server>
- Latest native provider smoke with `/Users/mateicanavra/.volta/bin/codex`
  verified an installed generated plugin hook through `hooks/list` with
  `source: plugin`, matching `pluginId`, `hookCount=1`, and
  `providerHookCount=1`.

Verification:

- `bun run --cwd packages/agent-config-sync-node test` passed: 18 tests.
- `bun run --cwd packages/agent-config-sync-node typecheck` passed.
- `bun run --cwd services/agent-config-sync test` passed: 26 tests.
- `bun run --cwd services/agent-config-sync typecheck` passed.
- `bun run --cwd plugins/cli/plugins test` passed: 12 tests.
- `bun run --cwd plugins/cli/plugins typecheck` passed.
- `bunx nx run-many -t typecheck,test,build -p @rawr/agent-config-sync-node,@rawr/agent-config-sync,@rawr/plugin-plugins --output-style=stream`
  passed for all three changed projects.
- `bunx nx run-many -t structural -p @rawr/agent-config-sync-node,@rawr/agent-config-sync,@rawr/plugin-plugins --output-style=stream`
  passed after adding the missing `@rawr/agent-config-sync-node`
  architecture-inventory registration required by that package's own
  `sync:check` target.
- Live temp-home Codex package/install/hooks-list smoke with
  `/Users/mateicanavra/.volta/bin/codex` passed:
  `ok=true`, `hookCount=1`, `providerHookCount=1`,
  `pluginHooksFeatureRequired=true`.
- `git diff --check` passed.

## Deferred Inventory

Pending.

## Review Result

Leaf loops: complete.

Composed loops: four read-only review lanes completed:

- Provider capability review found three blocking risks. Fixed by gating Codex
  hook lifecycle claims on hook config, separating provider-backed verification
  counts from package-only support counts, and relabeling Codex generic
  projection support away from native provider parity.
- Architecture boundary review found one blocking risk. Fixed by requiring
  explicit destinations for `rawr plugins export` / `export all` so projection
  cannot silently mutate default provider homes.
- Docs/report review found no blockers and several operator wording risks.
  Fixed stale directory-sync framing and Codex multi-home native install
  overclaim.
- Test coverage review found P2 coverage gaps. Added assertions for Codex
  package/install full-sync policy, explicit projection command guardrails,
  no `direct_mirror` schema/path, and non-native Codex projection statuses.

Waivers: none.

Invalidations: none accepted after repairs.

Repair demands: completed.

Closure steward result: gates passed; Graphite commit created; submission pending.

## Final Output

Artifacts:

- `PARITY_INVESTIGATION_REPORT.md` updated as the current handoff report.
- `MANAGED_PROVIDER_PLUGIN_PARITY_DECISIONS.md` records native-provider,
  provider-version, published-types, and projection decisions.
- Native Codex/Claude provider package/install adapters and CLI command
  surfaces are implemented with tests.
- Generic destination projection remains explicit and non-deployment.

Verification run: complete; see Verification above.

Repo/Graphite state: branch committed and ready for Graphite submission.

## Next Packet

Pending.
