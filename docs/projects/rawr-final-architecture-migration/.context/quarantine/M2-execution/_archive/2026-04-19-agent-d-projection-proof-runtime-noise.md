# Agent D Projection Proof And Runtime Noise Scratchpad

Updated: 2026-04-19

## Scope

- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`
- Branch: `agent-service-module-ownership-hardening`
- Objective: close or classify two proof gaps:
  - direct `rawr sessions ...` command loading through actual oclif plugin loading
  - `Error: command hq:status not found` during `rawr hq up`

## Finding 1: direct `rawr sessions ...` plugin loading

- Classification: repo-owned.
- Evidence so far:
  - isolated temp `HOME`, `XDG_*`, `CODEX_HOME`, and `CLAUDE_CONFIG_DIR` proof successfully ran `rawr plugins cli install all --json`.
  - `rawr plugins inspect @rawr/plugin-session-tools --json` showed the plugin was linked and valid, but `commandIDs` was empty.
  - inspect output showed `commandsDir` as `plugins/cli/session-tools/dist/src/commands`.
  - actual built command files live under `plugins/cli/session-tools/dist/commands/sessions/*.js`.
  - `rawr sessions list --json --limit 1` failed with `Error: command sessions:list not found`.
- Proposed fix:
  - correct `plugins/cli/session-tools/package.json#oclif.commands` from `./dist/src/commands` to `./dist/commands`.
  - add a direct plugin-loading test in `apps/cli/test/plugins-install-all.test.ts` that links workspace toolkit plugins with isolated temp state, inspects `@rawr/plugin-session-tools`, and executes `rawr sessions list --json` against a fixture `CODEX_HOME`.
- Files to change:
  - `plugins/cli/session-tools/package.json`
  - `apps/cli/test/plugins-install-all.test.ts`
- Proof commands:
  - `bunx nx run @rawr/plugin-session-tools:build --skip-nx-cache`
  - `bunx vitest run --project cli apps/cli/test/plugins-install-all.test.ts`
  - isolated direct proof:
    - `bun run rawr -- plugins cli install all --json`
    - `bun run rawr -- plugins inspect @rawr/plugin-session-tools --json`
    - `bun run rawr -- sessions list --json --limit 1`
    - `bun run rawr -- sessions search --source codex --query-metadata agent-d-direct-command-proof --json`
    - `bun run rawr -- sessions search --source codex --query proof --reindex --reindex-limit 1 --index-path <tmp>/session-index.sqlite --json`
- Proof result:
  - `@rawr/plugin-session-tools:build` passed after Agent C's session-index runtime source changes were present.
  - targeted CLI test passed with linked plugin loading and direct `rawr sessions` list/metadata-search/reindex-search.
  - manual isolated proof linked `@rawr/plugin-session-tools`, inspected command IDs, and ran direct `rawr sessions search --reindex`; result had `commandIDs=["sessions:extract","sessions:list","sessions:resolve","sessions:search"]`, `ok=true`, `count=1`, `first=agent-d-proof-reindex`.

## Finding 1B: session-tools database/index ownership audit

- Classification: repo-owned and remediated during orchestrator integration.
- Acceptable resource provision:
  - `plugins/cli/session-tools/src/lib/session-index-runtime.ts` opens SQLite and exposes primitive `execute`, `query`, `transaction`, and `removeIndex` operations.
  - `plugins/cli/session-tools/src/lib/session-source-runtime.ts` owns concrete filesystem/JSONL/path/env discovery resources.
- Service-owned semantics after integration:
  - `services/session-intelligence/src/service/modules/search/repository.ts` owns `session_cache` schema, cache reads/writes, reindex, and DELETE semantics.
  - `services/session-intelligence/src/service/modules/catalog/repository.ts` owns `codex_file_index` / `codex_root_scan_state` schema, refresh/prune/query policy, TTL checks, and all discovery-cache DELETE/UPDATE/INSERT statements.
  - `services/session-intelligence/src/service/shared/ports/session-index-runtime.ts` is now a primitive SQL execution resource contract, not a search-cache semantic API.
  - `services/session-intelligence/src/service/shared/ports/session-source-runtime.ts` exposes optional low-level Codex source/file discovery primitives so catalog cache policy remains service-owned.
- Ratchet:
  - `scripts/phase-03/verify-session-intelligence-structural.mjs` fails if plugin source files contain static SQL semantic strings or session database table tokens.
- Direct proof status:
  - `rawr sessions list` exercises the service catalog path through `@rawr/session-intelligence/client`.
  - `rawr sessions search --query-metadata ...` exercises the service search metadata path through `@rawr/session-intelligence/client`.
  - `rawr sessions search --reindex ...` exercises the service search path through `search.clearIndex`, `search.reindex`, and `search.content`, with SQLite exposed as concrete `execute/query/removeIndex` resource operations.
  - Note: this required rebuilding `@rawr/plugin-session-tools` so linked oclif dist matched Agent C's updated `SessionIndexRuntime` port.

## Finding 2: `Error: command hq:status not found` during `rawr hq up`

- Classification: external to this checkout.
- Evidence:
  - exact active-repo search found no local `hq:status` invocation.
  - local lifecycle implementation uses space-separated `hq status` command surface and shell status writer:
    - `apps/cli/src/commands/hq/up.ts`
    - `apps/cli/src/commands/hq/status.ts`
    - `apps/cli/src/lib/hq.ts`
    - `scripts/dev/hq.sh`
  - prior handoffs repeatedly record the noise as coming from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`, not this checkout.
  - live `rawr hq up --open none` proof reproduced the warning, and every stack frame for the failing command points at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`, not this worktree:
    - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/node_modules/.bun/@oclif+core@4.8.0/node_modules/@oclif/core/lib/config/config.js`
    - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/apps/cli/src/index.ts`
  - `bun run rawr -- hq status --json` after shutdown returned `summary=stopped` and `workspaceRoot=/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`.
  - the user-level oclif plugin-manager manifest at `/Users/mateicanavra/.local/share/@rawr/cli/package.json` is linked to the separate downstream checkout:
    - `@rawr/cli` -> `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/apps/cli`
    - `@rawr/plugin-devops` -> `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugins/cli/devops`
    - `@rawr/plugin-plugins` -> `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugins/cli/plugins`
    - `@rawr/plugin-session-tools` -> `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugins/cli/session-tools`
- Repo action:
  - no repo-owned `hq:status` invocation was found or changed.
  - added `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` note explaining how to classify this noise when the stack trace points outside the current workspace.
- Proof commands run:
  - `bun run rawr -- hq up --open none` with captured output at `/tmp/rawr-agent-d-hq-up.36165.log`
  - `bun run rawr -- hq status --json`
  - `bun run rawr -- hq down`
  - `rg -n "hq:status|command hq:status|/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq" /tmp/rawr-agent-d-hq-up.36165.log .rawr/hq/runtime.log`
- Proof result:
  - `hq up` reached runtime readiness far enough to write status and expose health.
  - `hq down` stopped the managed runtime.
  - final `hq status --json` returned `summary=stopped` for this worktree.
