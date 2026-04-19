# Session Intelligence Host-Package Removal Mini Plan

Branch: `agent-SESSIONS-remove-host-package`  
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-SESSIONS-remove-host-package`  
Parent branch: `agent-ORCH-service-resource-remediation-docs`

## Confirmed Starting State

- `git rev-parse --show-toplevel`: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-SESSIONS-remove-host-package`
- `git branch --show-current`: `agent-SESSIONS-remove-host-package`
- `git status --short`: clean before writing this scratchpad.
- Graphite stack shows this branch stacked above `agent-ORCH-service-resource-remediation-docs`.
- Nx project truth after `bun install --frozen-lockfile`:
  - `@rawr/session-intelligence` root `services/session-intelligence`, targets `build`, `sync`, `structural`, `typecheck`, `test`.
  - `@rawr/session-intelligence-host` root `packages/session-intelligence-host`, targets `build`, `typecheck`, `test`.
  - `@rawr/plugin-session-tools` root `plugins/cli/session-tools`, targets `build`, `typecheck`, `test`.
  - Current dependency graph has `@rawr/plugin-session-tools -> @rawr/session-intelligence-host`; this edge must disappear.

## Current Violations Found

1. `packages/session-intelligence-host` exists as a service-specific `*-host` package. The remediation cheat sheets now explicitly invalidate this abstraction.
2. `plugins/cli/session-tools/package.json` depends on `@rawr/session-intelligence-host`.
3. `plugins/cli/session-tools/src/lib/session-intelligence-client.ts` dynamically imports `@rawr/session-intelligence-host` and calls `createNodeSessionIntelligenceBoundary`.
4. `packages/session-intelligence-host/src/source-runtime.ts` exports and implements service-level verbs outside the service:
   - `listSessions`
   - `resolveSession`
   - `extractSession`
   - `listCodexSessionFiles`
   - `findClaudeSessionPathById`
   - `findCodexSessionCandidateByNeedle`
5. `packages/session-intelligence-host/src/index-runtime.ts` exports and implements service-level search/index verbs outside the service:
   - `getSearchTextCached`
   - `reindexSessions`
   - `searchSessionsByMetadata`
   - `searchSessionsByContent`
   - `clearIndex`
   - `clearIndexFile`
6. `packages/session-intelligence-host/src/parsers.ts` duplicates semantic source detection, Claude/Codex normalization, role filtering, tool inclusion, and message extraction that now belongs in `services/session-intelligence`.
7. `packages/session-intelligence-host/src/types.ts` duplicates service schemas/types and widens runtime ports beyond the service-owned port contracts.
8. `packages/session-intelligence-host/src/boundary.ts` returns `scope: {}` while `services/session-intelligence/src/service/base.ts` requires `scope.workspaceRef`; the plugin hides this with `unknown` dynamic imports.
9. `scripts/phase-03/verify-session-intelligence-structural.mjs` currently requires the host package, root scripts, Vitest project, plugin dependency, AGENTS split routing, and template-managed path entry. It must be inverted.
10. `eslint.config.mjs` still instructs consumers to use `@rawr/session-intelligence-host` and says concrete access belongs there.
11. `vitest.config.ts`, root `package.json`, `bun.lock`, `AGENTS_SPLIT.md`, `scripts/githooks/template-managed-paths.txt`, and `tools/architecture-inventory/node-4-extracted-seams.json` all still reference the host package.
12. `services/session-intelligence/src/service/modules/*/schemas.ts` mostly re-export from `service/shared/schemas.ts`. This does not match the current rule that service modules own module schemas and shared schemas contain only real cross-module primitives.
13. `services/session-intelligence/src/service/shared/README.md` says concrete runtime belongs in `@rawr/session-intelligence-host`; this is now wrong.

## Behavior That Stays Or Moves Into `services/session-intelligence`

The service already owns most semantic behavior in `src/service/shared/*`; implementation should preserve and tighten that ownership rather than move it out:

- Catalog module keeps ownership of list, resolve, metadata filtering, newest-first ordering, path-vs-id semantics, modified-time windows, source filtering, model/cwd/branch/project filters, and session metadata normalization.
- Transcripts module keeps ownership of source detection, Claude/Codex format normalization, role filtering, tool inclusion/exclusion, dedupe, offset, max-message semantics, and extracted transcript shape.
- Search module keeps ownership of metadata ranking, regex validation/error mapping, content search, snippet construction, cache-key semantics, reindex orchestration, clear-index semantics, stale/deleted indexed-file handling through ports, and content text construction from normalized messages.
- Service shared ports remain the only contracts for concrete resources:
  - `SessionSourceRuntime`: `discoverSessions`, `statFile`, `readJsonlObjects`.
  - `SessionIndexRuntime`: `getSearchText`, `setSearchText`, `clearSearchText`.
- Service module schemas should be re-grounded:
  - Keep true cross-module primitives in shared schemas, likely `SessionSource`, `SessionSourceFilter`, `RoleFilter`, `SessionListItem`, `SessionFileStat`, and `DiscoveredSessionFile` if consumed by more than one module/port.
  - Move module-specific output/input schemas such as `ResolveResult`, catalog filters, `ExtractOptions`, `ExtractedSession`, `SearchHit`, `MetadataSearchHit`, and `ReindexResult` into the owning module schema files unless cross-module usage proves otherwise.
- Repository provider style should be aligned with `example-todo`: recurring repository middleware lives in each module `middleware.ts` as `repository`; `module.ts` composes `observability`, `analytics`, `repository`, then reshapes context for handler ergonomics.

## Concrete Resources To Provide From `plugins/cli/session-tools`

Create plugin-local concrete runtime code instead of a replacement package:

- `plugins/cli/session-tools/src/lib/session-resource-boundary.ts`
  - Builds `CreateClientOptions` for `@rawr/session-intelligence`.
  - Statically imports `createClient` and `type CreateClientOptions` from `@rawr/session-intelligence`.
  - Supplies `deps.logger`, `deps.analytics`, `deps.sessionSourceRuntime`, `deps.sessionIndexRuntime`, `scope.workspaceRef`, and `config`.
  - Uses `satisfies CreateClientOptions` or an explicit return type so scope/deps mismatches typecheck.
- `plugins/cli/session-tools/src/lib/session-source-runtime.ts`
  - Provides concrete discovery only: Claude project JSONL discovery, Codex live/archive discovery, newest-bounded file selection, project filtering at discovery time, path/env/home resolution, `statFile`, and `readJsonlObjects`.
  - May keep Codex discovery cache as plugin-local SQLite implementation because it is concrete local CLI performance infrastructure, not session semantics.
  - Does not expose `listSessions`, `resolveSession`, `extractSession`, or parser/normalization helpers.
- `plugins/cli/session-tools/src/lib/session-index-runtime.ts`
  - Provides SQLite cache primitives only: `getSearchText`, `setSearchText`, `clearSearchText`, and default index path helper for CLI flags.
  - Does not expose `getSearchTextCached`, `reindexSessions`, `searchSessionsByContent`, `searchSessionsByMetadata`, or `clearIndexFile` as service-level verbs.
- `plugins/cli/session-tools/src/lib/jsonl.ts`
  - Provides JSONL streaming with malformed-row tolerance.
- `plugins/cli/session-tools/src/lib/sqlite.ts`
  - Provides plugin-local `bun:sqlite` first, `node:sqlite` fallback if still needed by the current runtime.
- `plugins/cli/session-tools/src/lib/session-paths.ts`
  - Owns CLI-local environment/path defaults: `HOME`, `CODEX_HOME`, `.codex`, `.codex-rawr`, `.claude/projects`, `RAWR_SESSION_INDEX_PATH`, Codex discovery TTL env vars.
- Existing CLI formatting/output files stay plugin-local:
  - `format.ts`
  - `out-dir.ts`
  - `transcript-output.ts`
  - command flag validation and oclif exit behavior.

## `@rawr/session-intelligence-host` Imports, Deps, And Files To Remove

Delete the full package:

- `packages/session-intelligence-host/package.json`
- `packages/session-intelligence-host/src/boundary.ts`
- `packages/session-intelligence-host/src/index-runtime.ts`
- `packages/session-intelligence-host/src/index.ts`
- `packages/session-intelligence-host/src/jsonl.ts`
- `packages/session-intelligence-host/src/parsers.ts`
- `packages/session-intelligence-host/src/shims/bun-sqlite.d.ts`
- `packages/session-intelligence-host/src/source-runtime.ts`
- `packages/session-intelligence-host/src/sqlite.ts`
- `packages/session-intelligence-host/src/types.ts`
- `packages/session-intelligence-host/test/boundary.test.ts`
- `packages/session-intelligence-host/tsconfig.build.json`
- `packages/session-intelligence-host/tsconfig.json`
- `packages/session-intelligence-host/vitest.config.ts`

Remove all references:

- `plugins/cli/session-tools/package.json`: remove dependency on `@rawr/session-intelligence-host`.
- `plugins/cli/session-tools/src/lib/session-intelligence-client.ts`: remove dynamic host import and build the service client with plugin-local resources.
- `root package.json`: remove `@rawr/session-intelligence-host` from `build`, `typecheck`, and `pretest:vitest` project lists.
- `vitest.config.ts`: remove `packages/session-intelligence-host` test project.
- `bun.lock`: remove workspace and dependency entries for `@rawr/session-intelligence-host`.
- `eslint.config.mjs`: remove guidance that points at the host package; add direct ban for `@rawr/session-intelligence-host`.
- `scripts/phase-03/verify-session-intelligence-structural.mjs`: invert host checks.
- `AGENTS_SPLIT.md`: remove `packages/session-intelligence-host` from template-owned shared packages.
- `scripts/githooks/template-managed-paths.txt`: remove `packages/session-intelligence-host/**`.
- `tools/architecture-inventory/node-4-extracted-seams.json`: remove `@rawr/session-intelligence-host`.
- `services/session-intelligence/src/service/shared/README.md`: replace host-package language with plugin/app/runtime-surface resource provisioning language.
- `docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md`: remove or supersede the temporary host package note.

Historical handoff docs that intentionally describe the abandoned direction can remain if they are clearly historical, but current architecture docs and ratchets must not bless `*-host` packages.

## Structural Ratchets To Update Or Add

Update `scripts/phase-03/verify-session-intelligence-structural.mjs` so it fails when:

- `packages/session-intelligence-host` exists.
- Any source or package manifest imports/depends on `@rawr/session-intelligence-host`.
- Root `package.json` project lists include `@rawr/session-intelligence-host`.
- `vitest.config.ts` includes `packages/session-intelligence-host` or `session-intelligence-host`.
- `AGENTS_SPLIT.md`, `scripts/githooks/template-managed-paths.txt`, current architecture docs, or current lint messages route concrete resources to `packages/session-intelligence-host`.
- Plugin client binding uses dynamic `unknown` imports instead of a statically typed `CreateClientOptions` boundary.
- Plugin-local source/index runtimes expose host-level semantic verbs:
  - `listSessions`
  - `resolveSession`
  - `extractSession`
  - `searchSessionsByContent`
  - `searchSessionsByMetadata`
  - `reindexSessions`
  - `getSearchTextCached`
- Service files import concrete runtime modules (`node:*`, `bun:*`, `fs`, `path`, `os`, `readline`, SQLite packages) or reference `process.env`, `os.homedir()`, or concrete database construction.
- Module schema files are pure re-export stubs from `../../shared/schemas`.
- Service repositories are forwarding-only wrappers to same-named runtime methods. Calls to service-owned shared semantic helpers are allowed if those helpers live under `services/session-intelligence/src/service/**`, but forwarding to injected runtime methods with names like `listSessions`/`extractSession`/`reindexSessions` is not allowed.

Update `eslint.config.mjs` so it:

- Bans `@rawr/session-intelligence-host` and `@rawr/session-intelligence-host/*`.
- Keeps `services/session-intelligence/src/service/**` runtime-agnostic.
- Optionally restricts `plugins/cli/session-tools/src/lib/session-source-runtime.ts` and `session-index-runtime.ts` from exporting forbidden host-level semantic verb names.

## Behavioral Proof Commands And Exact Pass Criteria

Static/project proof:

```bash
NX_DAEMON=false bunx nx show project @rawr/session-intelligence --json
NX_DAEMON=false bunx nx show project @rawr/plugin-session-tools --json
NX_DAEMON=false bunx nx graph --print | jq '.graph.dependencies["@rawr/plugin-session-tools"]'
```

Pass criteria:

- `@rawr/session-intelligence-host` is not listed as a project.
- `@rawr/plugin-session-tools` depends on `@rawr/session-intelligence` and `@rawr/core`, not `@rawr/session-intelligence-host`.

Build/typecheck/test proof:

```bash
NX_DAEMON=false bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache
NX_DAEMON=false bunx nx run-many -t build --projects=@rawr/session-intelligence,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache
NX_DAEMON=false bunx nx run @rawr/session-intelligence:test --skip-nx-cache
NX_DAEMON=false bunx nx run @rawr/plugin-session-tools:test --skip-nx-cache
NX_DAEMON=false bunx nx run @rawr/session-intelligence:structural --skip-nx-cache
bun run lint:boundaries
bun run build:affected
```

Pass criteria:

- All commands exit 0.
- No command references or attempts to build/test `@rawr/session-intelligence-host`.
- The structural command fails if the host package directory is temporarily restored or if a host import/dependency is reintroduced.

Direct static ratchet proof:

```bash
test ! -d packages/session-intelligence-host
! rg -n "@rawr/session-intelligence-host|packages/session-intelligence-host|session-intelligence-host" package.json vitest.config.ts eslint.config.mjs AGENTS_SPLIT.md scripts/githooks/template-managed-paths.txt services plugins packages tools docs/projects/rawr-final-architecture-migration/resources
! rg -n "listSessions|resolveSession|extractSession|searchSessionsByContent|searchSessionsByMetadata|reindexSessions|getSearchTextCached" plugins/cli/session-tools/src/lib
```

Pass criteria:

- The package directory is absent.
- No current-source/import/config/docs references remain, except explicitly historical handoff docs if excluded from the command or documented as historical.
- Plugin-local concrete resource files expose only resource primitives, not service verbs.

Service behavior proof:

```bash
NX_DAEMON=false bunx nx run @rawr/session-intelligence:test --skip-nx-cache
```

Pass criteria:

- Existing service tests still prove Claude/Codex detection, normalized metadata, newest-first listing, path/id resolve, transcript extraction with dedupe/offset/max-message behavior, metadata ranking, content search, cache hit/miss behavior, reindex, clear-index, unknown session, unknown format, invalid regex, and stale/deleted cache behavior where currently covered.
- Add/extend tests if any behavior is only covered by deleted host tests.

Plugin behavior proof:

```bash
NX_DAEMON=false bunx nx run @rawr/plugin-session-tools:test --skip-nx-cache
```

Pass criteria:

- Command-class tests still cover list, resolve, metadata search, content/reindex path, extract split output, missing out-dir validation, ambiguous query validation, and missing session failure.
- Tests use plugin-local concrete resource factory or test override, never `@rawr/session-intelligence-host`.

Real command-surface proof with temp homes:

```bash
tmp="$(mktemp -d)"
HOME="$tmp/home" CODEX_HOME="$tmp/codex" RAWR_SESSION_INDEX_PATH="$tmp/index.sqlite" bun run rawr -- sessions list --source codex --limit 1 --json
HOME="$tmp/home" CODEX_HOME="$tmp/codex" RAWR_SESSION_INDEX_PATH="$tmp/index.sqlite" bun run rawr -- sessions resolve <fixture-session> --source codex --json
HOME="$tmp/home" CODEX_HOME="$tmp/codex" RAWR_SESSION_INDEX_PATH="$tmp/index.sqlite" bun run rawr -- sessions search --query-metadata rawr-fixture --json
HOME="$tmp/home" CODEX_HOME="$tmp/codex" RAWR_SESSION_INDEX_PATH="$tmp/index.sqlite" bun run rawr -- sessions search --query oclif --use-index --json
HOME="$tmp/home" CODEX_HOME="$tmp/codex" RAWR_SESSION_INDEX_PATH="$tmp/index.sqlite" bun run rawr -- sessions extract <fixture-session> --format markdown --out-dir "$tmp/out" --chunk-size 1 --chunk-output split --json
```

Pass criteria:

- Use a fixture temp home populated by the plugin test helper or an added script before these commands.
- List returns one codex session.
- Resolve returns the fixture path and source metadata.
- Metadata search returns one hit.
- Content search returns a hit and creates the index file.
- Extract writes metadata plus multiple transcript files.
- Failure commands for missing session, ambiguous query flags, and split chunk output without `--out-dir` return existing CLI error codes and expected non-zero exit statuses.

Platform smoke remains collateral only:

```bash
bun run rawr -- hq up --observability required --open none
curl -fsS http://localhost:3000/health
bun run rawr -- hq down
bun run rawr -- hq status --json
```

Pass criteria:

- All commands exit 0, but this does not count as session-intelligence behavioral proof unless the session service is actually exercised.

## Risks And Open Questions

- `bun install --frozen-lockfile` was needed in this isolated worktree before Nx could run; it installed ignored `node_modules` and left git status clean.
- Historical docs intentionally containing the old plan may need an explicit exclusion from broad `rg` ratchets; current docs must not bless host packages.
- Plugin-local concrete resource files will be larger than ideal, but extracting them to a package would recreate the forbidden single-service host/helper package. Extraction should wait until another service immediately uses the same abstraction.
- Current host tests cover Codex discovery cache behavior and SQLite transcript cache behavior. Those tests should be moved to plugin tests or converted into service tests with fake ports before deleting the host test project.
- The service index port currently lacks `indexPath` in `SessionSearchCacheKey` even though search/reindex/clear-index contracts accept `indexPath`. Implementation should decide whether the service-owned port key includes `indexPath` or whether each plugin-local runtime instance is bound to one index path. Given the CLI accepts per-call `--index-path`, the safer contract is to include `indexPath` in the service-owned cache key and update tests accordingly.
- The existing plugin client adapter wraps oRPC errors into `{ error }` for CLI compatibility. Keep the CLI-facing `SessionIntelligenceClient` facade, but make its backing client construction statically typed.
- The current module schema re-grounding may touch more service files than host deletion alone. It is still part of the same remediation because the governing correction explicitly says service modules own module schemas.
