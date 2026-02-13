# Agent Hardened Loops (v1)

This document defines repeatable, low-drift loops an AI agent can follow to ship end-to-end work in `RAWR HQ-Template` and downstream `RAWR HQ` repos.

## Purpose

- Convert idea to shipped artifact with minimal user nudging.
- Keep loops explicit, deterministic, and safe by default.
- Standardize handoffs, checks, and done criteria across common build axes.

## Selection Matrix

| If you are building... | Use this loop |
| --- | --- |
| New command in core CLI | [Loop A: Add core CLI command](#loop-a-add-core-cli-command-factory-based) |
| CLI extension plugin with command set + docs | [Loop B: Create CLI plugin + commands](#loop-b-create-cli-plugin--commands-priority-1) |
| Server and/or web plugin under `plugins/web/*` | [Loop C: Create RAWR workspace plugin](#loop-c-create-rawr-workspace-plugin-serverwebboth) |
| Micro-frontend mounted in host UI | [Loop D: Create micro-frontend plugin](#loop-d-create-micro-frontend-plugin) |
| New API route in server or plugin server surface | [Loop E: Add server API route](#loop-e-add-server-api-route-core-or-plugin) |
| End-to-end orchestrator command | [Loop F: Add workflow command](#loop-f-add-workflow-command) |

## Ground Rules (Hard Invariants)

### Safety defaults

- For irreversible operations, run a `--dry-run` plan first, then execute with confirmation (`--yes`) when supported.
- Prefer a two-phase shape: evaluate first, then execute.

### Output discipline

- Commands should support `--json` and produce stable machine-readable output.
- Keep retrieval and result payloads atomic and small by default.

### Testing gate

- Definition of done includes `bun run test` (fast gate).
- For heavy CLI orchestration and visual workflows, also run `bun run test:heavy`.
- Include `bun run typecheck` when changing interfaces, command contracts, or shared packages.

### Repo workflow

- Use Graphite/worktree invariants from `docs/process/GRAPHITE.md`.
- In parallel stacks, default to:
  - `gt sync --no-restack`
  - `gt restack --upstack` only on your own stack.

### Journaling expectation

- Workflow/orchestrator commands should emit concise journal snippets summarizing steps, outcome, and artifacts.

### Plugin terminology (important)

- **CLI-extension plugin**: oclif plugin system (`rawr plugins link|install|inspect ...`).
- **RAWR workspace plugin**: package under `plugins/web/*` with RAWR enablement gate (`rawr plugins web enable|disable|status|list`), plus optional server/web surfaces.
- Keep command channels explicit:
  - `rawr plugins ...` is Channel A (oclif plugin manager).
  - `rawr plugins web ...` is Channel B (workspace runtime plugins).

## Loop Template

Every loop below follows this structure:

- Goal
- Inputs
- Steps
- Artifacts
- Checks
- Failure modes

## Loop A: Add core CLI command (factory-based)

### Goal

Add a durable command to core CLI (`apps/cli`) with stable UX and test coverage.

### Inputs

- `topic` and `name` (kebab-case)
- command description
- output contract (`--json` shape and human output behavior)

### Steps

1. Scaffold with factory:
   - `bun run rawr -- factory command new <topic> <name> --description "<text>" --dry-run`
   - Re-run without `--dry-run` once plan looks correct.
2. Implement command behavior in `apps/cli/src/commands/<topic>/<name>.ts`.
3. Ensure command extends `RawrCommand`, parses base flags, and emits stable `outputResult`.
4. Refine generated test in `apps/cli/test/*` for real behavior, not only smoke output.
5. If command should be discoverable in command catalog, update `apps/cli/src/commands/tools/export.ts`.

### Artifacts

- `apps/cli/src/commands/<topic>/<name>.ts`
- `apps/cli/test/<...>.test.ts`
- optional: `apps/cli/src/commands/tools/export.ts`

### Checks

- `bun run rawr -- <topic> <name> --json`
- `bun run test`
- optional when changing heavy/visual surfaces: `bun run test:heavy`
- optional: `bun run typecheck`

### Failure modes

- Workspace root not found: run from repo root or a subdirectory within repo.
- Non-deterministic output: tighten JSON contract and remove incidental fields.
- Test flakiness: eliminate dependency on wall-clock or environment ordering.

## Loop B: Create CLI plugin + commands (Priority 1)

### Goal

Create an oclif plugin package with one or more CLI commands and plugin-local usage docs.

### Inputs

- plugin package name and directory (e.g., `plugins/cli/<dir>`)
- command ids and descriptions
- plugin-local docs scope (usage, examples, limitations)

### Steps

1. Create plugin package under `plugins/cli/<dir>` (manual or using existing scaffolds).
2. Add/verify `package.json#oclif` manifest:
   - source command path (`oclif.typescript.commands`)
   - built command path (`oclif.commands`) aligned with emitted `dist/**`.
3. Implement commands in `src/commands/*.ts`.
4. Add plugin-local docs (markdown) inside plugin package as placeholder for future skill-sync pipeline.
5. Build and test plugin:
   - `turbo run build --filter=<plugin-package-name>`
   - `vitest run --project <plugin-vitest-project>`
6. Link plugin into CLI for local dev:
   - `bun run rawr -- plugins link plugins/cli/<dir> --install`

> **Heads-up: the “disposable worktree” trap**
> - `rawr plugins link` stores an **absolute path** to the plugin directory.
> - If you link from a **disposable git worktree** and later delete it, `rawr` can fail at startup (missing `package.json`).
> - Prefer linking from a **stable checkout path** (your primary worktree), using an absolute path.
> - Recovery: `rawr plugins uninstall <plugin>` (or `rawr plugins reset` to wipe all user-linked plugins).
> - If available, prefer the repo-root helper: `rawr plugins install all`.
7. Verify command discovery and execution:
   - `bun run rawr -- --help`
   - `bun run rawr -- <plugin-command> --json` (if command supports JSON output pattern).

### Artifacts

- `plugins/cli/<dir>/package.json`
- `plugins/cli/<dir>/src/commands/*.ts`
- `plugins/cli/<dir>/test/*.test.ts`
- `plugins/cli/<dir>/*.md` (plugin-local usage docs)

### Checks

- `turbo run build --filter=<plugin-package-name>`
- `vitest run --project <plugin-vitest-project>`
- command appears in help and runs end-to-end

### Failure modes

- Command not discovered after link: check `package.json#oclif` built vs source paths.
- Plugin overrides unexpected command id: inspect collisions with existing plugin/core commands.
- Link succeeds but command runtime fails: verify build output and ESM compatibility.

## Loop C: Create RAWR workspace plugin (server/web/both)

### Goal

Create a gated plugin in `plugins/web/*` that integrates with RAWR state enablement and optional server/web surfaces.

### Inputs

- plugin dir name
- plugin kind: `server`, `web`, or `both`
- route/mount contract details

### Steps

1. Scaffold plugin:
   - `bun run rawr -- factory plugin new <dirName> --kind <server|web|both> --dry-run`
   - Re-run without `--dry-run` once planned files are correct.
2. Implement `src/server.ts` and/or `src/web.ts` exports.
3. Build plugin package.
4. Enable via RAWR gate:
   - `bun run rawr -- plugins web enable <id>`
5. Confirm state + mount behavior:
   - `bun run rawr -- plugins web status --json`
   - start stack and verify server/web behavior.

### Artifacts

- `plugins/web/<dir>/src/server.ts` and/or `plugins/web/<dir>/src/web.ts`
- `plugins/web/<dir>/test/*.test.ts`
- `.rawr/state/state.json` (runtime state, gitignored)

### Checks

- `turbo run build --filter=<plugin-package-name>`
- `bun run rawr -- plugins web status --json`
- `bun run dev` then endpoint/UI verification

### Failure modes

- Gate blocks enablement: inspect security findings and rerun with appropriate risk flags/policy.
- Enabled in state but not mounted: verify exported names and server loader paths (`dist/...` variants).

## Loop D: Create micro-frontend plugin

### Goal

Ship a plugin UI mounted by host web app using the `@rawr/ui-sdk` contract.

### Inputs

- plugin id/dir
- mount behavior and minimal UX
- any server companion endpoints required by the UI

### Steps

1. Start from Loop C with `kind=web` or `both`.
2. Implement `mount(el, ctx)` in `src/web.ts` with deterministic mount/unmount behavior.
3. If needed, add server endpoints via `src/server.ts`.
4. Build plugin and enable it.
5. Run dev stack and verify on mounts surface in web app.

### Artifacts

- `plugins/web/<dir>/src/web.ts`
- optional: `plugins/web/<dir>/src/server.ts`
- `plugins/web/<dir>/test/*.test.ts`

### Checks

- `turbo run build --filter=<plugin-package-name>`
- `bun run rawr -- plugins web enable <id>`
- `bun run dev` and validate mount behavior visually

### Failure modes

- Module fetch fails: verify server route serves enabled plugin web module path.
- Mount leaks DOM/state: ensure unmount cleanup path is implemented.

## Loop E: Add server API route (core or plugin)

### Goal

Add a small API route with explicit contract and tests.

### Inputs

- route path and method
- request/response schema/shape
- ownership decision: core server route vs plugin route

### Steps

1. Decide location:
   - core route in `apps/server/src/rawr.ts` (or server app setup),
   - or plugin route in `plugins/web/<dir>/src/server.ts`.
2. Define contract first (status codes, response schema, error shape).
3. Implement route logic and minimal guardrails.
4. Add/extend tests in `apps/server/test/*` or plugin tests.
5. Run tests and verify route manually in dev stack.

### Artifacts

- `apps/server/src/rawr.ts` or `plugins/web/<dir>/src/server.ts`
- `apps/server/test/*.test.ts` and/or plugin tests

### Checks

- `vitest run --project server` (and plugin project if applicable)
- `bun run dev` and call route

### Failure modes

- Route exists but not wired: check registration order in server bootstrap.
- Contract drift: align test expectations with documented response shape.

## Loop F: Add workflow command

### Goal

Add an orchestrator command that chains lower-level commands safely.

### Inputs

- workflow id/name
- required sub-steps
- dry-run plan output shape

### Steps

1. Scaffold:
   - `bun run rawr -- factory workflow new <name> --description "<text>" --dry-run`
   - Re-run without `--dry-run`.
2. Implement sub-step orchestration with explicit step objects and exit handling.
3. Ensure `--dry-run` emits planned steps only.
4. Emit journal snippet summarizing outcome/artifacts.
5. Add unit test and one integration/e2e test where feasible.
6. Add to tools export list if intended for discovery.

### Artifacts

- `apps/cli/src/commands/workflow/<name>.ts`
- `apps/cli/test/*<name>*.test.ts`
- optional: `apps/cli/src/commands/tools/export.ts`

### Checks

- `bun run rawr -- workflow <name> --dry-run --json`
- `bun run test`
- optional when workflow touches heavy command orchestration or visual surfaces: `bun run test:heavy`

### Failure modes

- Hidden side effects in dry-run: isolate write paths behind execution branch.
- Orchestrator swallows child failures: preserve exit codes and step status reporting.
