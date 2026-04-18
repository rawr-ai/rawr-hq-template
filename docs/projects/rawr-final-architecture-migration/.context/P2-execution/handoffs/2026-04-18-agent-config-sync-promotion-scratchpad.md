# Agent Config Sync Promotion Scratchpad

Date: 2026-04-18  
Branch at capture time: `codex/agent-config-sync-cutover`  
Purpose: lightweight handoff for the next agents working on service promotion decisions.

## What We Finished

We promoted the old `packages/agent-sync` capability into a real service:

- `services/agent-config-sync` is now the canonical sync service.
- `packages/agent-config-sync-host` owns concrete Node/Bun/runtime adapters.
- `packages/agent-sync` was removed.
- `plugins/cli/plugins` now enters the new surface through `plugins/cli/plugins/src/lib/agent-config-sync.ts`.

Why we did it this way:

- `agent-sync` owned service-grade semantics: sync planning, conflict policy, ownership/claims, stale managed retirement, GC, undo, and durable writes.
- The old package also mixed in filesystem, target-home, workspace-discovery, Cowork packaging, and Claude CLI execution concerns.
- The correct migration was therefore not “move the package,” but “split service truth from host runtime.”
- The service internals were required to follow `services/example-todo`, especially the `base/contract/impl/router` choke points and per-module `contract/module/router` shape.

Graphite stack shape:

- `5fe50f4c` `docs(agent-config-sync): capture migration plan`
- `0904b2f8` `feat(agent-config-sync-host): add runtime adapter package`
- `053cdd4b` `refactor(agent-config-sync): promote sync service`

## Invariants and Decision Rules

Use these rules when considering another package promotion:

- Classification is based on capability truth, not current folder or consumer count.
- If code owns durable semantic truth, canonical validation/merge semantics, authoritative writes, conflict policy, or undo/reversal semantics, it is a service candidate.
- A service package owns ports/contracts/models/modules, not concrete runtime adapters.
- Concrete filesystem/process/env/CLI/SQLite/runtime implementations are host-owned or host-adapter-package-owned.
- Plugins and CLIs are projections/hosts. They may orchestrate flags, UX, and config loading, but they should not own capability truth.
- The service must “look like `example-todo`” internally unless there is a deliberate, documented exception.
- Keep `hq-ops` config authority separate. For agent-config-sync, sync-source and layered config truth stayed with `hq-ops`.

## Gotchas from This Migration

- Do not treat an old live architecture line as binding when it conflicts with the repo’s stronger classification rule. The old docs said “defer agent-sync,” but the package’s actual authority made the older proposal correct.
- Do not lift host helpers wholesale into `src/service/**`. Extract or wrap them behind typed ports.
- Expect mixed files. `registry-codex.ts`, `marketplace-claude.ts`, `sync-engine.ts`, and `sync-all.ts` contained both service truth and host IO concerns.
- Nx may need `nx reset` after adding packages or targets.
- Root Vitest must know about new project names before `vitest run --project <name>` works.
- `bun.lock` can retain removed workspace names until a force install.
- Structural ratchets are worth adding immediately; otherwise a “service promotion” can silently become just a folder move.

## Proof Already Run

Core static proof:

- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-host,@rawr/plugin-plugins,@rawr/cli --skip-nx-cache`
- `bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-host,@rawr/plugin-plugins,@rawr/cli --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync-host:test --skip-nx-cache`
- `bunx nx run @rawr/plugin-plugins:test --skip-nx-cache`
- `bun run lint:boundaries`
- `bun run sync:check --project @rawr/agent-config-sync`
- `bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache`
- `bun run build:affected`

Command/runtime proof:

- `rawr plugins sync all --dry-run --json` passed through the new service/host seam.
- `rawr plugins sync sources list --json` stayed green through `hq-ops`.
- `rawr plugins status --json` returned expected drift/non-zero in a clean temp home.
- `rawr hq up --observability required --open none` reached ready output after restarting the external HyperDX container.
- `curl http://localhost:3000/health` returned `{"ok":true}`.
- `rawr hq down` returned the workspace to stopped state.

Known unrelated runtime noise:

- Startup still emits `Error: command hq:status not found` from the separate `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq` checkout.
- That is not caused by this repo’s agent-config-sync migration.

## What’s Next

The next likely question is whether other packages are similarly misclassified.

Start with `packages/session-tools`:

- The older proposal classified it as `services/session-intelligence`.
- The stated reason was service-grade ownership of session domain types, SQLite-backed session index/cache, multi-provider discovery/parsing for Claude and Codex session formats, full-text search, and metadata search.
- The next investigation should confirm whether the current code still matches that service-candidate profile and whether host/runtime concerns need a companion host package.

Also revisit other service-promotion candidates from the older proposal:

- `packages/hq` residual workspace/install/lifecycle truth -> likely `services/plugin-management`.
- `apps/cli/src/lib/hq-status.ts` / runtime health model -> likely `services/hq-operations`.
- Any remaining support package that owns durable semantic truth, write authority, or policy/merge semantics.

Use the same pattern:

- audit current code ownership
- compare to the older proposal
- classify service truth vs host runtime
- design an `example-todo`-shaped service
- add host package only when multiple legitimate hosts need shared concrete runtime
- add structural ratchets before final closeout
