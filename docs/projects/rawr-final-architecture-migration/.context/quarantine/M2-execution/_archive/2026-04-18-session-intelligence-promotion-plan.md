# Promote `session-tools` Into `services/session-intelligence`

## Summary
Promote `packages/session-tools` now. The archived proposal was correct: current code owns service-grade session semantics, while the later live plan's "support/tooling" classification conflicts with the repo's own service-promotion rubric.

Final target:
- `services/session-intelligence` becomes the canonical session domain service.
- `packages/session-intelligence-host` owns concrete Node/Bun runtime adapters.
- `packages/session-tools` is removed by the end of the stack.
- `plugins/cli/session-tools` remains the user-facing CLI projection for `rawr sessions ...`.
- No server/API projection is added in this slice; platform smoke is collateral safety, not service proof.

## Key Interfaces And Boundaries
Public service package:
- Add `@rawr/session-intelligence` with `./client`, `./router`, `./service/contract`, `./schemas`, `./ports/session-source-runtime`, and `./ports/session-index-runtime` exports.
- Root export stays boundary-only: `createClient`, `router`, `Client`, `Router`.
- Service modules are `catalog`, `transcripts`, and `search`.
- `catalog` owns list/resolve/session metadata behavior.
- `transcripts` owns source detection, provider normalization, role filtering, dedupe, offset, and max-message extraction.
- `search` owns metadata ranking, content search, regex validation, snippets, reindex, and clear-index behavior.

Host package:
- Add `@rawr/session-intelligence-host`.
- Export `createNodeSessionIntelligenceBoundary(...)`.
- Export concrete runtime helpers only where useful for tests and host composition.
- Host owns filesystem walking, JSONL streaming, stat/path checks, `HOME`, `CODEX_HOME`, `RAWR_SESSION_INDEX_PATH`, discovery TTL env handling, Codex live/archive source discovery, Claude project discovery, and `bun:sqlite` / `node:sqlite` adapters.

CLI projection:
- `plugins/cli/session-tools` imports `@rawr/session-intelligence` and `@rawr/session-intelligence-host`, not `@rawr/session-tools`.
- CLI owns oclif flags, ambiguous flag validation, human/table/markdown/text formatting, chunked output UX, `--out-dir` writes, and command-specific error exit codes.
- Move transcript/table formatting and `chunkMessages` into plugin-local code unless a structured service artifact requires them later.

Purity rules:
- No `node:*`, `bun:*`, `process.env`, `os.homedir()`, filesystem, readline, or concrete SQLite imports under `services/session-intelligence/src/service/**`.
- Provider-specific Claude/Codex wire-format normalization may live in service shared internals because it is semantic normalization, not concrete IO.
- Cross-package imports must use package exports/subpaths, not deep relative imports. Internal service files follow the `example-todo` local-relative pattern.

## Graphite Stack
1. `docs(session-intelligence): capture promotion decision`
Capture this plan verbatim in the Phase 2 scratch area, record the live-plan override, and add a classification matrix for current `packages/session-tools` files.

2. `refactor(session-intelligence): scaffold service and host package`
Create `services/session-intelligence` with the `example-todo` topology and create `packages/session-intelligence-host`; wire package exports, Nx tags/targets, Vitest projects, and minimal shape tests while leaving `packages/session-tools` intact.

3. `refactor(session-intelligence): move semantic session core`
Move schemas/types, source detection rules, Claude/Codex normalization, catalog list/resolve semantics, transcript extraction semantics, search ranking/snippets, and service-client tests into `services/session-intelligence` behind fake ports.

4. `feat(session-intelligence-host): add node session runtimes`
Move JSONL IO, filesystem discovery, env/home resolution, Codex discovery cache, transcript search cache, SQLite shims, and boundary assembly into `packages/session-intelligence-host`; add host tests for newest ordering, cache hit, cache invalidation, reindex, clear-index, and missing/corrupt files.

5. `refactor(plugin-session-tools): cut over to session-intelligence`
Rebind `plugins/cli/session-tools` commands through a host-local client factory, preserve `rawr sessions list|resolve|search|extract`, move formatting/chunk output locally, and replace placeholder plugin tests with command tests.

6. `chore(session-intelligence): remove legacy session-tools`
Delete `packages/session-tools`, remove `@rawr/session-tools` imports/dependencies, update root build/typecheck/pretest project lists, update `vitest.config.ts`, update `bun.lock`, update managed-path and AGENTS routing files, and add ratchets forbidding legacy imports.

7. `docs(session-intelligence): canonize service promotion`
Update proposals, migration docs, architecture inventory, and service-promotion notes to say `session-intelligence` is fully migrated; record `packages/session-intelligence-host` as an accepted temporary top-level host package.

## Implementation Team
Use default agents with disjoint ownership during implementation:
- Boundary owner: scratch decision, file matrix, Graphite slice guardrails, and live-plan override.
- Service-shape owner: enforce `example-todo` topology, ORPC contracts, module shape, and service purity.
- Service core implementer: owns `services/session-intelligence/**`.
- Host adapter implementer: owns `packages/session-intelligence-host/**`.
- Surface cutover implementer: owns `plugins/cli/session-tools/**` and stale dependency cleanup.
- Verification/docs owner: owns structural ratchets, behavioral proof harness, final docs, and final review.

Fresh review agents after implementation:
- Architecture reviewer checks service/host/plugin ownership against the canonical architecture.
- Style reviewer checks the service internals against `services/example-todo`, `guidance.md`, and `DECISIONS.md`.
- Test reviewer checks that proof is falsifying and domain-meaningful, not liveness theater.
- Live checker runs command-surface proof and platform smoke, then verifies repo cleanliness.

## Test Plan
Static and structural proof:
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/session-intelligence-host,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache`
- `bunx nx run-many -t build --projects=@rawr/session-intelligence,@rawr/session-intelligence-host,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence:test --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence-host:test --skip-nx-cache`
- `bunx nx run @rawr/plugin-session-tools:test --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence:structural --skip-nx-cache`
- `bun run lint:boundaries`
- `bun run build:affected`

Structural ratchets:
- Fail if `packages/session-tools` exists after the removal slice.
- Fail if any source imports `@rawr/session-tools`.
- Fail if `services/session-intelligence/src/service/**` imports concrete Node/Bun/env/SQLite APIs.
- Fail if service topology lacks `base`, `contract`, `impl`, `router`, and module `contract/middleware/module/repository/router/schemas` files.
- Fail if `@rawr/plugin-session-tools` depends on the old package or owns session semantic parsing/ranking/cache policy.

Service behavior proof:
- Preserve current fixture behavior for Claude/Codex detection, metadata normalization, path resolve, transcript extraction, role filters, dedupe, offset/max, metadata ranking, regex content search, newest ordering, cache hit, and cache invalidation.
- Add client tests using fake ports so `catalog.list`, `catalog.resolve`, `transcripts.extract`, `search.metadata`, `search.content`, `search.reindex`, and `search.clearIndex` prove service procedures rather than direct helper calls.
- Add failure tests for unknown session, unknown format, invalid regex, missing runtime port, stale/deleted indexed file, and corrupt JSONL.

Command-surface proof:
- Use isolated `HOME`, `CODEX_HOME`, `XDG_*`, `RAWR_SESSION_INDEX_PATH`, and temp cwd.
- Link or load `plugins/cli/session-tools` in that temp context.
- Run `rawr sessions list --source codex --limit 1 --json` and assert one codex session.
- Run `rawr sessions resolve <fixture> --source codex --json` and assert resolved source/path metadata.
- Run `rawr sessions search --query-metadata rawr-fixture --json` and assert one metadata hit.
- Run `rawr sessions search --query oclif --use-index --index-path <temp-index> --json` and assert match count plus index file creation.
- Run `rawr sessions extract <fixture> --format markdown --out-dir <temp-out> --chunk-size 1 --chunk-output split --json` and assert metadata plus multiple transcript files.
- Run failure commands for missing session, ambiguous query flags, and split chunk output without `--out-dir`, asserting existing CLI error codes and exit status.

Platform and observability proof:
- Run `bun run rawr -- hq up --observability required --open none`, `curl -fsS http://localhost:3000/health`, `bun run rawr -- hq down`, and `bun run rawr -- hq status --json` only as platform collateral smoke.
- Do not claim HyperDX/server trace proof for `session-intelligence` unless a live server/API projection is added and exercised.
- For this slice, service observability proof is unit/in-process: assert service middleware emits expected logs/analytics/span attributes for success and typed failure paths.

## Assumptions
- The user-visible compatibility surface is `rawr sessions ...`; the private `@rawr/session-tools` package does not need a permanent compatibility shim.
- `session-intelligence` should not absorb shell routing, steward/governance behavior, corpus generation, journal writes, hq-ops config/state/security, plugin lifecycle, or agent-config-sync.
- `packages/session-intelligence-host` is acceptable for now as a temporary top-level host package; future consolidation is deferred.
- Docs must explicitly correct the live migration plan's prior "session-tools does not qualify" line after implementation.

## Classification Matrix

| Current file | Classification | Target |
| --- | --- | --- |
| `packages/session-tools/src/types.ts` | Service truth | `services/session-intelligence` schemas/types |
| `packages/session-tools/src/detect.ts` | Split: detection rules service, file read host | service shared source model + host JSONL runtime |
| `packages/session-tools/src/claude/parse.ts` | Service semantic normalization over host input | service shared source codecs |
| `packages/session-tools/src/codex/parse.ts` | Split: semantic normalization service, path/status host | service shared source codecs + host runtime |
| `packages/session-tools/src/util/jsonl.ts` | Concrete runtime | `packages/session-intelligence-host` |
| `packages/session-tools/src/paths.ts` | Concrete runtime + cache/index adapter | `packages/session-intelligence-host` |
| `packages/session-tools/src/list.ts` | Service operation over host discovery | `catalog` module |
| `packages/session-tools/src/resolve.ts` | Service operation over host discovery | `catalog` module |
| `packages/session-tools/src/extract.ts` | Service operation | `transcripts` module |
| `packages/session-tools/src/search/query.ts` | Service operation | `search` module |
| `packages/session-tools/src/search/index.ts` | Split: text construction service, SQLite runtime host | `search` module + host index runtime |
| `packages/session-tools/src/format.ts` | CLI projection, except reusable chunking if needed | `plugins/cli/session-tools` |
| `packages/session-tools/src/shims/bun-sqlite.d.ts` | Concrete runtime shim | `packages/session-intelligence-host` |
| `packages/session-tools/test/**` | Split tests | service, host, and plugin tests |
| `plugins/cli/session-tools/src/**` | CLI projection | stays plugin-local, rebound to new client |

## 2026-04-18 Implementation Stop / Critical Review Finding

Implementation was underway on branch `codex/session-intelligence-migration` when this note was added.

Current local state at stop:
- Stack head: `codex/session-intelligence-migration`
- Latest committed migration commit before the stop: `refactor(session-intelligence): promote session tooling service`
- Dirty files at stop:
  - `packages/session-intelligence-host/src/index-runtime.ts`
  - `packages/session-intelligence-host/src/source-runtime.ts`
  - `packages/session-intelligence-host/src/types.ts`
- Those dirty files are partial, unverified fixes for the review finding below. Do not assume they are correct.

What had passed before the review finding:
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/session-intelligence-host,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache`
- `bunx nx run-many -t build --projects=@rawr/session-intelligence,@rawr/session-intelligence-host,@rawr/plugin-session-tools,@rawr/cli --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence:test --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence-host:test --skip-nx-cache`
- `bunx nx run @rawr/plugin-session-tools:test --skip-nx-cache`
- `bunx nx run @rawr/session-intelligence:structural --skip-nx-cache`
- `bun run lint:boundaries`
- `bun run build:affected`
- direct plugin command-class proof for list/resolve/search/extract with real `@rawr/session-intelligence` + `@rawr/session-intelligence-host` and temp homes
- platform smoke: `rawr hq up --observability required --open none`, `/health`, `rawr hq status --json`, `rawr hq down`, final stopped status

Important caveats about that proof:
- `rawr plugins link <plugin>` failed with the existing oclif error `TypeError: Attempted to assign to readonly property`, so the command-surface proof used direct command-class execution instead of linked CLI-plugin loading.
- The known downstream `Error: command hq:status not found` still appeared during `hq up`; it points at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`, not this checkout.
- Failure-path command-class proof was attempted but direct `Command.run()` throws oclif `EEXIT`; the meaningful failure coverage currently lives in plugin tests.

Critical architecture review finding:
- A default review agent found a blocker: `packages/session-intelligence-host` still re-owned session semantic truth.
- Specifically, host types/runtime exposed old `session-tools` operations such as:
  - `listSessions`
  - `resolveSession`
  - `extractSession`
  - metadata/content search helpers
  - reindex helpers that operate at domain level
- This violates the migration intent because `services/session-intelligence` must own those semantics; the host package should only own concrete runtime adapters.
- The structural verifier passed despite this, so it is missing an important inverse ratchet: host packages must not expose service-level semantic operations.

Partial fix that was started and then stopped:
- I began narrowing `packages/session-intelligence-host/src/types.ts` to remove the service-level operations.
- I began narrowing `packages/session-intelligence-host/src/source-runtime.ts` so the runtime provides `discoverSessions`, `statFile`, and `readJsonlObjects` rather than full list/resolve/extract behavior.
- I began narrowing `packages/session-intelligence-host/src/index-runtime.ts` so the index runtime provides cache primitives (`getSearchText`, `setSearchText`, `clearSearchText`) rather than service-level search/reindex behavior.
- This partial fix is dirty and not yet typechecked.

The broader issue to investigate after compaction:
- The same anti-pattern is likely present in prior service migrations, not only `session-intelligence`.
- Suspect packages:
  - `packages/agent-config-sync-host`
  - `packages/hq-ops-host`
  - possibly any `*-host` package that was created during service promotion
- Pattern to investigate:
  - Service owns contracts/model/modules/semantic policy.
  - Host package is supposed to own only concrete runtime bindings and boundary assembly.
  - But host packages may still export or implement domain operations that duplicate service semantics because old package code was moved there too broadly.
- Do not resume by continuing edits immediately. First investigate and classify:
  - Which host exports are concrete adapter primitives?
  - Which host exports are semantic service operations?
  - Which semantic operations are still duplicated in host packages?
  - Which structural verifiers need inverse host-surface ratchets?

Recommended next turn:
1. Read this section first.
2. Inspect the dirty diff in `packages/session-intelligence-host`.
3. Investigate `packages/agent-config-sync-host` and `packages/hq-ops-host` for the same host-semantic leakage.
4. Design a repair plan for the general pattern before patching this instance.
5. Only then resume implementation.

## Additional Review Findings Received After Stop

A later review notification added these concrete blockers against the dirty working tree:

1. `@rawr/session-intelligence-host` no longer typechecks in the dirty partial fix.
   - `packages/session-intelligence-host/src/index.ts` still exports removed symbols such as `SessionFileCandidate` and `SessionFileStat`.
   - host tests and runtime code still call removed semantic methods such as `listSessions`, `listCodexSessionFiles`, `reindexSessions`, `getSearchTextCached`, and `clearIndexFile`.
   - `bunx nx run @rawr/session-intelligence-host:typecheck` fails.

2. `packages/session-intelligence-host/src/boundary.ts` is not strongly typed against the service boundary.
   - The host returns its own boundary type with `scope: {}`.
   - `services/session-intelligence/src/service/base.ts` declares `scope.workspaceRef`.
   - The plugin dynamically imports through `unknown`, so the mismatch can avoid compile-time detection.
   - Repair should type the host boundary from `@rawr/session-intelligence/client` `CreateClientOptions` or use `satisfies` against the service boundary.

3. `services/session-intelligence/src/service/shared/ports/session-index-runtime.ts` is not yet the single source of truth.
   - Service procedures require `indexPath` for search/reindex/clear-index behavior.
   - The service-owned `SessionIndexRuntime` port omits `indexPath` from `getSearchText`, `setSearchText`, and `clearSearchText`.
   - The dirty host type currently relies on a wider duplicate shape.
   - Repair should make the service port the single contract and include the caller-selected index path where required.

4. Service module repository provider style needs review against `example-todo`.
   - `catalog/module.ts`, `search/module.ts`, and `transcripts/module.ts` inject repositories via raw inline `.use(async ...)`.
   - The reviewer says `example-todo` guidance prefers recurring repository providers in `middleware.ts` via provider-style middleware, writing under `context.provided`, then reshaping for handler ergonomics.
   - This may be a style/architecture consistency issue rather than the main blocker, but it should be investigated before finalizing.

5. The current structural verifier is insufficient even though it passes.
   - It catches concrete runtime imports inside the service.
   - It does not catch host packages exporting/implementing service-level semantics.
   - It should add inverse ratchets for host packages: host may expose concrete runtime ports and boundary assembly only, not list/resolve/extract/search/reindex domain operations.

These findings reinforce the broader anti-pattern concern:
- The next pass should not simply fix `session-intelligence-host`.
- It should first inspect `agent-config-sync-host` and `hq-ops-host` for the same “host re-owns service truth” failure mode and decide the correct repair pattern across all promoted services.
