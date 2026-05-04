# Agent Sync Parity Closure Spec

Status: canonical forward implementation spec for closing `agent-config-sync` Codex parity gaps after correcting the earlier wrong-CLI assumption. This supersedes the older parity-closure plan where Codex plugin runtime support was treated as unavailable.

This spec lives with the service tests because the service owns sync semantics. CLI and Node package tests consume this contract at the package, process, and runtime-install boundary.

## Objective

Agent config sync must prove RAWR source material can be projected into Claude and Codex without silent gaps. RAWR remains source of truth; provider outputs are honest projections; every modeled material kind is either synced, adapter-required, unsupported, or unknown.

The corrected Codex target is the RAWR Codex binary, currently resolved as `/Users/mateicanavra/.local/bin/codex`, not whichever stale `codex` appears first on `PATH` inside a worktree. The RAWR binary reports `codex-cli 0.126.0-alpha.3` and exposes `codex plugin marketplace add|upgrade|remove` plus app-server plugin APIs.

The Hyperresearch-like workspace remains a synthetic coverage fixture, not the service architecture. Real Hyperresearch content transfer into personal RAWR is still excluded.

## Completed Prior Work

These prior parity items are complete or already represented in the current implementation and should not be reopened unless a new test failure proves drift:

- ~~Baseline and service ownership: `services/agent-config-sync` is the canonical service-shaped implementation; CLI remains binding/injection.~~
- ~~External source workspace support: template CLI can use personal-shaped `rawr-hq` as content source without migrating that repo shape.~~
- ~~Canonical material scan: workflows, skills, scripts, agents, hooks, hook lifecycle config, MCP, settings, assets, and orchestration evidence are modeled as semantic material.~~
- ~~Codex direct projection: skills, prompts, prefixed scripts, optional TOML agents, hook config/scripts, MCP/config fragments, runtime `.agents/skills`, registry ownership, drift, and GC are implemented as direct sync behavior.~~
- ~~Codex agent default: agents are included by default unless explicitly disabled.~~
- ~~Projection residuals: unsupported and adapter-required semantics are reported without making `IN_SYNC` mean unproven runtime parity.~~
- ~~Testing plan location: canonical testing guidance lives with the agent-config-sync service tests, not project docs.~~
- ~~Overfitting review: Hyperresearch transport remains a fixture/scenario, not architecture.~~

Remaining work is now specifically the official Codex plugin distribution/install lane plus cleanup of stale wording and status assignments created under the incorrect `0.94` assumption.

## Next Scoped Phase - Default User Install Scope And Cowork Distribution Follow-Up

Status: next implementation phase after the Codex parity closure. This phase is intentionally small: make the currently implicit user-local install scope explicit, reserve the interface for future scope support, and harden Cowork packaging enough that we know what it does and does not claim.

### Plan To Preserve

The implementation must preserve this wording and intent:

```markdown
# Default User Install Scope + Cowork Distribution Follow-Up

## Summary

Keep the existing install-scope plan, but make it more explicit and operational:

- First implementation step: update `services/agent-config-sync/test/AGENT_SYNC_PARITY_CLOSURE_SPEC.md` with this plan, preserving the existing parity plan and adding this as the next scoped phase.
- Add a minimal `--install-scope user` hook to both sync commands.
- Keep behavior user-local by default for Claude and Codex.
- Do not expand the config service or add multi-scope routing.
- Treat Cowork separately: current ZIP/manual-upload path is likely valid, but under-validated and not a full install pipeline.

## Install Scope Changes

- CLI:
  - Add `--install-scope <scope>` to `rawr plugins sync` and `rawr plugins sync all`.
  - Only accepted option: `user`.
  - Default: `user`.
  - Add help text saying this reserves provider install-scope expansion and currently supports only user-local installs.

- Claude install:
  - Add `installScope: "user"` to the Claude install adapter input/results.
  - Pass `--scope user` when running `claude plugin marketplace add`.
  - Keep `claude plugin install` and `claude plugin enable` behavior unchanged.
  - Add a TODO at the adapter boundary for future `project/local/managed` support if we decide to expose it.

- Codex install:
  - Add `installScope: "user"` to the Codex install adapter input/results.
  - Validate/record the scope, but do not pass a scope arg because current RAWR Codex CLI does not expose one.
  - Keep the current meaning: selected `CODEX_HOME` plus user-local Codex marketplace install.
  - Add a TODO at the adapter boundary for future Codex repo/admin scope support if the CLI grows that API.

- Reporting:
  - Include `installScope: "user"` in `codexInstall` JSON and Claude install actions.
  - Human output should mention user scope only when install/package output is printed.
  - Do not add scope fields to unrelated direct-sync file projections.

## Cowork Follow-Up

- Keep `.zip` as the Cowork artifact extension.
  - Official Cowork org docs require valid `.zip` files under 50 MB.
  - Current archive root appears correct because ZIP entries are rooted at `.claude-plugin/plugin.json`, `commands/`, `skills/`, etc., not wrapped under `<pluginName>/`.

- Strengthen Cowork packaging without turning it into runtime install automation:
  - Add ZIP-entry tests that assert exact archive root and expected entries.
  - Assert no top-level `<pluginName>/` wrapper.
  - Fix docs wording that says `.plugin`; use `.zip` consistently.
  - Keep Cowork output labeled `manual_upload`, not user-scope install.

- Fix the real packaging risk:
  - Do not blindly copy source `.claude-plugin/plugin.json` if it declares custom component path fields the packager does not honor.
  - Minimal implementation: either normalize to RAWR’s staged default layout or reject package-breaking component path overrides with a clear error.
  - Validate manifest basics: JSON parse, `name`, `version`, lowercase kebab-case name, <=64 chars, and safe relative component paths.

- Earmark the bigger Cowork gap:
  - Current pipeline produces manual-upload ZIP artifacts only.
  - It does not upload to Cowork, manage Cowork org marketplaces, configure installation preferences, or provision 3P/admin `org-plugins/` directories.
  - It also does not yet package all modern Claude/Cowork plugin surfaces such as hooks and `.mcp.json` into Cowork artifacts.
  - Record this as a future distribution lane, not part of the minimal install-scope change.

## Test Plan

- CLI tests:
  - `--install-scope user` works for single-plugin and full sync.
  - any non-`user` scope is rejected.
  - dry-run JSON includes `installScope: "user"` for Codex and Claude install plans.

- Adapter tests:
  - Claude marketplace add includes `--scope user`.
  - Codex install records `installScope: "user"` and does not pass unsupported scope args.
  - Existing behavior is unchanged when the flag is omitted.

- Cowork tests:
  - ZIP contains `.claude-plugin/plugin.json`, command files, skill directories, scripts, and agents when included.
  - ZIP does not contain a leading plugin-name wrapper directory.
  - invalid/custom manifest component paths fail or are normalized deterministically.
  - output remains `.zip`, under-size warnings still work, and artifact remains `manual_upload`.

## Assumptions

- `user` is the only install scope supported by RAWR for this phase.
- Codex scope remains controlled by selected `CODEX_HOME`; no Codex CLI scope flag exists today.
- Claude Code gets explicit `--scope user`; Cowork does not get install-scope automation.
- Cowork ZIP artifacts are likely correct for manual upload, but require stronger validation before we treat them as reliable.
```

### Expanded Implementation Notes

- Scope is a CLI/API stub, not a new config model. The service should keep provider destination selection exactly as-is; install scope belongs at the install adapter boundary because it controls marketplace registration/install behavior, not material projection.
- The only supported runtime value is `"user"`. Use oclif flag options to reject unsupported CLI values early, and use adapter validation to reject unsupported direct programmatic calls. Do not add config precedence, provider-specific scope maps, or admin/repo routing in this phase.
- Claude should pass the explicit scope during marketplace registration: `claude plugin marketplace add --scope user <local-marketplace-home>` or the equivalent supported argument order. Install and enable still use the existing `<plugin>@<marketplace>` reference.
- Codex should record `installScope: "user"` in results, but not pass any scope argument to `codex plugin marketplace add`; current RAWR Codex exposes marketplace source selection, not install-scope selection.
- Cowork remains `manual_upload`. The pipeline may create ZIPs and validate their shape, but must not imply that Cowork user/org installation happened.
- Cowork package hardening should prefer deterministic generation over clever manifest passthrough. If a source manifest declares component path overrides that do not match the staged layout, fail the package step with a clear message rather than shipping a ZIP that points Cowork away from the staged files.
- The known future Cowork distribution lanes are manual ZIP upload, GitHub-synced organization marketplaces, and third-party/admin `org-plugins/` filesystem provisioning. They are recorded as future work only.

## Original Corrected Plan, Verbatim

The implementation must preserve this wording and intent:

```markdown
# Finish Codex Plugin Parity With Correct RAWR Codex CLI

## Summary
Use the correct RAWR Codex binary and finish the official Codex plugin lane as package + marketplace + install, while keeping direct Codex home sync as a separate compatibility lane. Remove stale "artifact-only because Codex lacks plugin support" assumptions.

Evidence anchors:
- Codex plugin install/use docs: https://developers.openai.com/codex/plugins
- Codex plugin build/marketplace docs: https://developers.openai.com/codex/plugins/build
- Codex skills paths: https://developers.openai.com/codex/skills
- Codex hooks: https://developers.openai.com/codex/hooks
- Codex MCP: https://developers.openai.com/codex/mcp

## Phase 1 - Purge Incorrect-Assumption Work
Fleet: purge auditor, Codex source-schema reviewer, docs/test reviewer.

- Remove stale "artifact-only / no runtime install support" language from CLI help, README, agent-sync skill docs, tests, and validation notes.
- Keep the direct Codex projection engine, registry ownership, drift, GC, and projection residual model; those are core sync semantics, not wrong-CLI scaffolding.
- Rework Codex package output from "loose package artifacts" into a marketplace root:
  - `--codex-out` means marketplace root, default `dist/codex`.
  - Packages live under `<codex-out>/plugins/<plugin>/`.
  - Marketplace file lives at `<codex-out>/.agents/plugins/marketplace.json`.
- Remove package manifest `hooks` support for the current RAWR Codex target unless local RAWR Codex source accepts it. Direct hook sync remains supported through Codex hooks config.
- Reclassify projection statuses:
  - Codex direct hooks/MCP/settings that are actually written are not blanket `adapter_required`.
  - Claude-only orchestration semantics remain `adapter_required`.
  - Plugin-lane agents/settings/hooks are reported as unsupported by the current RAWR Codex plugin manifest, not as vague "unverified runtime" gaps.

## Phase 2 - Re-Validate Correct CLI + Plugin Workflow
Fleet: docs researcher, local CLI probe, RAWR Codex source verifier, protocol verifier.

- Always resolve Codex explicitly:
  - Add `--codex-bin <path>`.
  - Default resolution: `RAWR_CODEX_BIN`, then `~/.local/bin/codex`, then `codex`.
  - Validate with `codex --version`, `codex plugin marketplace --help`, and `codex app-server --help`.
  - Never trust bare `codex` without reporting the resolved path.
- Confirm official marketplace workflow:
  - `codex plugin marketplace add <marketplace-root>`
  - `codex plugin marketplace upgrade [marketplace-name]`
  - `codex plugin marketplace remove <marketplace-name>`
- Confirm install workflow through Codex's own app-server protocol, not by duplicating cache/config writes:
  - Start `codex app-server --listen stdio:// --enable plugins`.
  - Initialize JSON-RPC.
  - Use `plugin/list`, `plugin/read`, and `plugin/install`.
  - Pass `marketplacePath: <codex-out>/.agents/plugins/marketplace.json` and `pluginName`.
- Good engineering reason not to automate would be unstable protocol or repeated install/cache corruption. Current evidence says install automation is straightforward enough because Codex already owns the app-server install method.

## Phase 3 - Implement
Fleet: package/marketplace worker, CLI install worker, test/e2e worker, adversarial reviewer.

- In `agent-config-sync-node`, add Codex marketplace generation:
  - Write `.codex-plugin/plugin.json`.
  - Include `skills: "./skills/"`.
  - Include `mcpServers: "./.mcp.json"` when modeled MCP exists.
  - Include supported interface/assets metadata.
  - Omit plugin-lane agents/settings/hooks for current RAWR Codex unless source verification proves support.
  - Write `.agents/plugins/marketplace.json` with one marketplace name per source workspace and local entries pointing to `./plugins/<plugin>`.
- In CLI sync commands:
  - Keep `--codex-package`, but make it mean "build Codex marketplace package."
  - Add `--codex-install / --no-codex-install`; default install when `--codex-package` is enabled and not dry-run.
  - Add `--codex-bin`.
  - Dry-run reports planned package, marketplace registration, and install actions without writing.
  - JSON output includes `codexMarketplace` and `codexInstall` results without removing existing fields.
- Install path:
  - Run `codex plugin marketplace add <codex-out>` first.
  - Run app-server `plugin/install` for each generated plugin.
  - Verify `plugin/list` shows installed/enabled and `plugin/read` shows expected skills/MCP.
  - Fail loudly on install failure; do not silently downgrade to package-only.

## Phase 4 - Test + End-to-End Gates
Fleet: deterministic tests team, RAWR Codex runtime smoke team, final adversarial review team.

- Unit/package tests:
  - Marketplace root shape.
  - Package manifest paths are `./`-relative.
  - Stale package and marketplace entries are removed.
  - No unsupported plugin-lane agents/settings/hooks are emitted.
  - Direct hook/MCP/settings projection statuses are accurate.
- CLI tests:
  - `--codex-bin` resolution reports the selected binary.
  - `--codex-package --dry-run` writes nothing.
  - `--codex-package` writes package + marketplace.
  - `--codex-install` calls the Codex install adapter.
  - Install failures are surfaced in JSON and exit status.
- Runtime smoke with temp `CODEX_HOME`:
  - Generate synthetic Hyperresearch-like fixture from RAWR source shape.
  - Run sync/package/install with `/Users/mateicanavra/.local/bin/codex`.
  - Assert plugin appears in `plugin/list`.
  - Assert `plugin/install` succeeds.
  - Assert cache path exists under `<CODEX_HOME>/plugins/cache/<marketplace>/<plugin>/<version-or-local>/`.
  - Assert `plugin/read` shows skills and MCP servers.
  - Assert `skills/list` can see installed plugin skills.
- Direct compatibility gate remains separate:
  - Prompts, runtime user skills, retired root skill cleanup, scripts, TOML agents, hooks config, MCP config, registry, drift, and GC still pass.
  - This lane must not be described as official plugin install parity.
- Final personal-source smoke:
  - First run against personal `rawr-hq` source with temp Codex home.
  - Then, if clean, run against real RAWR Codex home using the resolved RAWR binary.
  - Leave repo and Graphite status clean.

## Assumptions
- Target binary is RAWR Codex: `/Users/mateicanavra/.local/bin/codex`, currently `codex-cli 0.126.0-alpha.3`.
- We automate install because Codex exposes `plugin/install` through app-server; we do not recreate Codex cache/config internals.
- Official docs mention plugin hooks, but current RAWR Codex manifest source does not accept `hooks`; direct hook sync remains the supported hook lane until the RAWR fork catches up.
- Direct sync and official plugin install are both useful, but they are separate claims.
- Skills used: team-design.
```

## Expanded Execution Plan

### Phase 1 - Purge Incorrect-Assumption Work

Goal: remove stale guards caused by probing the wrong `codex` binary while preserving real provider-sync semantics.

Implementation detail:

- Search and update stale language in CLI help, README, agent-sync skill docs, test plan, package result notes, and JSON/human output.
- Replace "artifact-only" with "marketplace package generation" where the output can now be registered/installed by RAWR Codex.
- Preserve "separate lane" language where it is about architecture: direct sync is not the same as official plugin install.
- Remove `hooks` from Codex plugin manifest generation for the current RAWR Codex fork, because local `core-plugins/src/manifest.rs` currently deserializes `skills`, `mcpServers`, `apps`, and `interface`, but not `hooks`.
- Keep direct hook projection through `hooks.json`/config paths; that is a Codex direct-sync feature, not plugin package support.
- Reclassify projection statuses in service tests and helpers:
  - direct MCP/settings/hooks written to Codex destinations should be `native` or specifically described as direct managed projection;
  - plugin-lane omissions should be explicit unsupported component statuses;
  - Claude-only orchestration remains `adapter_required`.

Done when:

- No package/CLI docs claim Codex runtime plugin support is unavailable.
- No tests expect stale "runtime support unverified" wording.
- No official plugin package manifest includes unsupported `hooks` for current RAWR Codex.
- Projection residuals remain, but are not used as broad hedging for features now implemented.

### Phase 2 - Re-Validate Correct CLI And Protocol

Goal: base implementation on the real RAWR Codex surfaces, not PATH accident or stale docs.

Implementation detail:

- Add a small Node-side Codex CLI adapter in `@rawr/agent-config-sync-node`.
- Binary resolution order:
  1. explicit `--codex-bin`;
  2. `RAWR_CODEX_BIN`;
  3. `$HOME/.local/bin/codex`;
  4. `codex` on PATH.
- Adapter preflight:
  - run `<codexBin> --version`;
  - run `<codexBin> plugin marketplace --help`;
  - run `<codexBin> app-server --help`;
  - return resolved path, version, and supported operations in JSON output.
- Registration:
  - run `<codexBin> plugin marketplace add <codexOutRoot>`;
  - treat registration as idempotent when the same local marketplace is already present;
  - never call `marketplace upgrade` for generated local marketplaces.
- Install:
  - spawn `<codexBin> app-server --listen stdio:// --enable plugins`;
  - send JSON-RPC `initialize`;
  - send `plugin/list` with optional `cwds` containing the marketplace root or source workspace;
  - send `plugin/read` for each generated plugin;
  - send `plugin/install` with `marketplacePath` and `pluginName`;
  - verify by calling `plugin/list` and `plugin/read` after install.
- The adapter must not write Codex plugin cache/config files itself. Codex app-server owns those mutations.

Done when:

- The correct binary path is visible in JSON and human output.
- A stale PATH binary cannot silently drive install.
- The only Codex cache/config writes during plugin install come from Codex itself.

### Phase 3 - Implement Marketplace Package And CLI Install

Goal: make `rawr plugins sync ... --codex-package` produce an installable marketplace and install it by default when not dry-run.

Implementation detail:

- `packageCodexPlugin` output contract:
  - `outDir` remains the plugin package directory.
  - `marketplaceRoot` is the Codex marketplace root.
  - `marketplacePath` is `<marketplaceRoot>/.agents/plugins/marketplace.json`.
  - `marketplaceName` is stable and normalized from the source workspace package name unless explicitly overridden.
  - `marketplacePluginCount` reports retained generated marketplace entries.
- Default paths:
  - `--codex-out <dir>` points at marketplace root.
  - If callers pass an existing `.../plugins` path for compatibility, normalize root to its parent and continue writing packages under `plugins/`.
- Marketplace manifest:
  - top-level `name`;
  - optional `interface.displayName`;
  - one entry per active plugin;
  - `source: { source: "local", path: "./plugins/<plugin>" }`;
  - `policy.installation: "AVAILABLE"`;
  - `policy.authentication: "ON_INSTALL"`;
  - category from RAWR plugin kind or `"rawr"`.
- CLI flags:
  - `--codex-package`: generate package + marketplace.
  - `--codex-install` / `--no-codex-install`: default to install when package is enabled and not dry-run.
  - `--codex-bin <path>`: explicitly select Codex binary.
- JSON output:
  - keep existing `codexPackage` field;
  - add `codexMarketplace` or include marketplace metadata under package entries;
  - add `codexInstall` with preflight, registration, install, verify, skipped, failed, and planned actions.
- Failure behavior:
  - package failure fails sync for that plugin;
  - marketplace registration failure fails the Codex install lane;
  - install verification failure is a real failure, not a silent package-only downgrade;
  - dry-run never spawns Codex or writes package/marketplace files.

Done when:

- `rawr plugins sync all --codex-package --json` writes package and marketplace files.
- The same command installs generated plugins through RAWR Codex unless `--no-codex-install` or `--dry-run` is supplied.
- Human output names package root, marketplace path, Codex binary, and install result.

### Phase 4 - Test And Runtime Proof

Goal: prove the objective end to end without adding runtime-verification machinery to service business logic.

Implementation detail:

- Package tests:
  - package root and marketplace root shape;
  - normalized marketplace names;
  - active plugin entry pruning;
  - stale package output cleanup;
  - manifest path rules;
  - MCP packaging via `.mcp.json`;
  - unsupported plugin-lane agents/settings/hooks omitted with explicit notes.
- CLI tests:
  - dry-run no-write for package and marketplace;
  - codex binary resolution order;
  - install adapter is called only when package is enabled and not dry-run;
  - `--no-codex-install` skips install but still generates package;
  - install failure appears in JSON and exit status;
  - external `--source-workspace` stays authoritative.
- Runtime smoke:
  - use temp `CODEX_HOME`;
  - use `/Users/mateicanavra/.local/bin/codex`;
  - generate synthetic Hyperresearch-like plugin source;
  - run package + install;
  - assert marketplace registration;
  - assert `plugin/list` includes generated marketplace/plugin;
  - assert `plugin/install` succeeds;
  - assert cache path under `<CODEX_HOME>/plugins/cache/<marketplace>/<plugin>/<version-or-local>/`;
  - assert `plugin/read` lists skills and MCP servers;
  - assert `skills/list` can see installed plugin skills.
- Direct projection regression gate:
  - direct sync still writes prompts, runtime skills, scripts, TOML agents, hooks, MCP config, registry, drift, and retired-root GC correctly;
  - this gate remains separate from plugin install parity.
- Personal source smoke:
  - run personal `rawr-hq` source against a temp Codex home first;
  - only then run a real-home install if all isolated gates pass and operator intent is clear.

Done when:

- Unit and CLI suites pass.
- Runtime smoke proves source workspace -> package -> marketplace -> Codex install -> skills/MCP visibility.
- Worktree and Graphite status are clean.

## Acceptance Gates

Required local gates after implementation:

```bash
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli,@rawr/hq-ops
bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli
bunx vitest run --project agent-config-sync
bunx vitest run --project agent-config-sync-node
bunx vitest run --project plugin-plugins
bun run rawr -- plugins sync all --dry-run --json --source-workspace <synthetic-or-personal-shaped-workspace> --agent codex --codex-package --allow-partial
bun run rawr -- plugins sync all --json --source-workspace <synthetic-or-personal-shaped-workspace> --agent codex --codex-package --codex-bin /Users/mateicanavra/.local/bin/codex --allow-partial
bun run rawr -- plugins sync drift --json --source-workspace <synthetic-or-personal-shaped-workspace> --agent codex --no-fail-on-drift
git diff --check
git status --short --branch
```

Runtime install gates must use temp homes before touching the real RAWR Codex home.

## Invariants

- RAWR source remains canonical.
- Service owns sync semantics; Node/CLI own host package and external process binding.
- Direct Codex sync and official Codex plugin install are separate lanes with separate claims.
- RAWR does not write Codex plugin cache/config internals by hand.
- No unsupported provider feature is silently ignored.
- No unmanaged/manual destination file is deleted by RAWR GC.
