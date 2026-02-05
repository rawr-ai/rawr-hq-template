# Phase 2 — “Warehouse → Factory” (Command Factory + Journal/Reflect + State Enablement)

This is the **source of truth** for Phase 2. If implementation diverges, update this doc to prevent drift.

## Goals (what “done” means)

### Core systems
- **Command factory:** generate commands/workflows/plugins with tests + conventions in one invocation.
- **Journal + reflect:** snippet-level retrieval in **3–5 calls**, metadata-first; optional semantic search.
- **State enablement:** `plugins enable` persists and server/web behavior depends on enabled state.

### Centerpiece workflows (end-to-end)
- `rawr workflow forge-command`
- `rawr workflow demo-mfe`
- `rawr workflow harden`

### Security hardening plan (docs only)
- Multi-agent produced and integrated into `docs/plans/SECURITY_HARDENING_PLAN.md`.

## Explicit constraints
- No “whole context” packing workflows in this phase.
- Keep names **“journal + reflect”** and **“state enablement”** for now.
- Marketplace + LLM judge remain parked.

## Fractal safe workflow (required)

### Worktrees
- Root: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees`
- Branch naming: `agent-<ID>-rawr-phase2-<slice>`
- Worktree dir: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-<ID>-rawr-phase2-<slice>`

### Graphite invariants
- `gt sync --no-restack` only
- `gt restack --upstack` only on your stack
- Submit/merge via `gt submit --stack` + `gt merge` once checks pass

### Required docs
- Orchestrator scratch: `docs/scratchpads/phase-2/orchestrator.md`
- Per-agent scratch: `docs/scratchpads/phase-2/agent-<ID>.md`

### Decision logging (prevent drift)
Add decisions here as they occur.

## Implementation Decisions

### [Decision template]
- **Context:**
- **Options:**
- **Choice:**
- **Rationale:**
- **Risk:**

## Systems scope (v0)

### State enablement (packages/state)
- Persist repo state at `.rawr/state/state.json` (gitignored).
- Provide helpers:
  - `getRepoState(repoRoot)`
  - `setRepoState(repoRoot, nextState)`
  - `enablePlugin(repoRoot, pluginId)`
  - `disablePlugin(repoRoot, pluginId)`
- CLI:
  - persist after gate pass in `plugins enable`
  - add `plugins disable` and `plugins status`
- Server:
  - load/mount only enabled plugins
  - `GET /rawr/state` returns enabled plugin ids

### Journal + reflect (packages/journal)
- Store:
  - `.rawr/journal/events/*.json`
  - `.rawr/journal/snippets/*.json`
  - `.rawr/journal/index.sqlite` (FTS)
- CLI:
  - `journal tail`
  - `journal search`
  - `journal show`
  - `reflect`
- Optional semantic search:
  - enabled only if `VOYAGE_API_KEY` or `OPENAI_API_KEY` present (env only)
  - otherwise falls back to FTS with warning

### Command factory
- `factory command new <topic> <name> --description ...`
- `factory workflow new <name> --description ...`
- `factory plugin new <dirName> --kind server|web|both`

### Micro-frontend demo plugin
- `plugins/mfe-demo` with:
  - `src/server.ts` exporting `registerServer(app, ctx)`
  - `src/web.ts` exporting `mount(el, ctx)` (vanilla DOM)
- Server serves enabled plugin web bundles:
  - `GET /rawr/plugins/web/:dirName` → `dist/web.js` (enabled only)
- Web mounts enabled microfrontends on Mounts page via dynamic import + `@rawr/ui-sdk` contract.

### Security posture tool
- `security posture` reads latest security report and writes:
  - `.rawr/security/posture/latest.json`
  - `.rawr/security/posture/latest.md`

## Workflows (centerpiece)

### `workflow forge-command`
- Uses factory to create a demo “workload” command (safe namespace) and runs tests.
- Emits a journal snippet summarizing what was created.

### `workflow demo-mfe`
- Ensures demo plugin exists (create if missing), enables it (state + gate), verifies mount path.
- Emits snippet with “how to view” instructions.

### `workflow harden`
- Runs snapshot + security check + posture and (optionally) a repo-mode routine check.
- Emits snippet with posture summary + next actions.

## Agent slices + boundaries

Implementation agents:
- `SE` State enablement — owns `packages/state/**`, CLI `plugins/*`, server state endpoint, server plugin filter.
- `JR` Journal + reflect — owns `packages/journal/**`, CLI `journal/*`, CLI index instrumentation, reflect command.
- `CF` Command factory — owns CLI `factory/*`, templates, and tests.
- `SP` Security posture — owns CLI `security/posture`, any helper code, and posture output format.
- `MFE` Micro-frontend demo — owns `plugins/mfe-demo/**`, server web module serving, web Mounts wiring.
- `WF` Workflows — owns CLI `workflow/*` + tests; integrates factory/state/journal/posture/mfe pieces.

Hardening-plan (docs-only) agents:
- `H1..H8` — each owns a scratchpad + contributes to `docs/plans/SECURITY_HARDENING_PLAN.md` via orchestrator integration.

## Integration order
1) `SE`
2) `JR`
3) `CF`
4) `SP`
5) `MFE`
6) `WF`
7) `H1..H8` docs (anytime)

## Acceptance checklist
- `bun run test` green on `main`
- `rawr journal search/show/tail` works with small results
- `rawr reflect` returns structured suggestions
- `plugins enable` persists; `plugins status` shows enabled; server mounts enabled only
- `security posture` writes JSON+MD
- Demo micro-frontend mounts when enabled
- All three workflows run with `--dry-run` and at least one end-to-end test (where feasible)

