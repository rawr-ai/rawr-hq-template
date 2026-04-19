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
