# AGENTS Coverage Matrix (Historical vs Current)

Date: 2026-02-06  
Owner: Agent D  
Repos:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

## Inventory Snapshot

- Historical unique `AGENTS.md` paths (git history, both repos): `32`
- Baseline at analysis start: `11` current paths per repo (`21` missing).
- Current after approved restores: `15` current paths per repo (`17` missing).
- Current coverage sets are identical across both repos.

## Decision Rules

1. `restore` only when a missing router sits on an active navigation boundary that lacks an adequate parent router.
2. `replace_with_pointer` when an existing parent router already provides sufficient routing context.
3. `archive_only` when the historical path is no longer part of the active tree and should only be retained as historical context.
4. Keep restored routers signpost-only: scope, hard invariants, and links to canonical docs/adjacent routers.

## Per-Path Matrix

| # | Historical Path | Template Current | RAWR HQ Current | Decision | Short Rationale | Destination Pointer |
|---|---|---|---|---|---|---|
| 1 | `AGENTS.md` | present | present | `restore (applied)` | Root router is required for repo-wide navigation and command-surface policy. | `AGENTS.md` |
| 2 | `apps/AGENTS.md` | present | present | `restore (applied)` | `apps/*` is an active runtime boundary with multiple surfaces. | `apps/AGENTS.md` |
| 3 | `apps/cli/AGENTS.md` | present | present | `restore (applied)` | CLI has critical command-channel split and routing needs. | `apps/cli/AGENTS.md` |
| 4 | `apps/cli/src/commands/AGENTS.md` | missing | missing | `replace_with_pointer` | Deep topic router can be covered by restored CLI router. | `apps/cli/AGENTS.md` |
| 5 | `apps/cli/src/commands/dev/AGENTS.md` | missing | missing | `replace_with_pointer` | Topic-level detail is implementation-local; parent CLI router is sufficient. | `apps/cli/AGENTS.md` |
| 6 | `apps/cli/src/commands/factory/AGENTS.md` | missing | missing | `replace_with_pointer` | Factory command pointers belong in CLI router + docs/process. | `apps/cli/AGENTS.md` |
| 7 | `apps/cli/src/commands/journal/AGENTS.md` | missing | missing | `replace_with_pointer` | Journal command details are covered by CLI router and package router. | `apps/cli/AGENTS.md` |
| 8 | `apps/cli/src/commands/plugins/AGENTS.md` | missing | missing | `archive_only` | Historical path removed; command surface moved under `hq/plugins`. | `apps/cli/src/commands/hq/plugins` |
| 9 | `apps/cli/src/commands/routine/AGENTS.md` | missing | missing | `replace_with_pointer` | Routine topic does not need a standalone local router. | `apps/cli/AGENTS.md` |
| 10 | `apps/cli/src/commands/security/AGENTS.md` | missing | missing | `replace_with_pointer` | Security routing can be handled by CLI + package security routers. | `apps/cli/AGENTS.md` |
| 11 | `apps/cli/src/commands/tools/AGENTS.md` | missing | missing | `replace_with_pointer` | Tools topic has narrow scope; parent CLI router is enough. | `apps/cli/AGENTS.md` |
| 12 | `apps/cli/src/commands/workflow/AGENTS.md` | missing | missing | `replace_with_pointer` | Workflow topic should be routed from top-level CLI contract docs. | `apps/cli/AGENTS.md` |
| 13 | `apps/cli/src/lib/AGENTS.md` | missing | missing | `replace_with_pointer` | Shared helper internals are discoverable from CLI router pointers. | `apps/cli/AGENTS.md` |
| 14 | `apps/server/AGENTS.md` | missing | missing | `replace_with_pointer` | Server path can route through restored `apps/AGENTS.md` and docs/system refs. | `apps/AGENTS.md` |
| 15 | `apps/web/AGENTS.md` | missing | missing | `replace_with_pointer` | Web host path can route through restored `apps/AGENTS.md`. | `apps/AGENTS.md` |
| 16 | `docs/AGENTS.md` | present | present | n/a | Router already present and aligned with docs architecture. | `docs/AGENTS.md` |
| 17 | `docs/plans/AGENTS.md` | missing | missing | `replace_with_pointer` | Plan docs can route via canonical docs router; avoid reintroducing legacy local docs routers. | `docs/AGENTS.md` |
| 18 | `docs/process/AGENTS.md` | missing | missing | `replace_with_pointer` | Process docs are already linked from `docs/AGENTS.md`. | `docs/AGENTS.md` |
| 19 | `docs/scratchpads/AGENTS.md` | missing | missing | `archive_only` | Path no longer exists in active tree; scratchpads moved/archived. | `docs/_archive/scratchpads/` |
| 20 | `docs/spikes/AGENTS.md` | missing | missing | `replace_with_pointer` | Spike navigation can remain centralized in `docs/AGENTS.md`. | `docs/AGENTS.md` |
| 21 | `packages/AGENTS.md` | present | present | `restore (applied)` | Parent router is needed for package-level navigation, especially newly added package dirs without local AGENTS. | `packages/AGENTS.md` |
| 22 | `packages/core/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/core/AGENTS.md` |
| 23 | `packages/journal/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/journal/AGENTS.md` |
| 24 | `packages/security/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/security/AGENTS.md` |
| 25 | `packages/state/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/state/AGENTS.md` |
| 26 | `packages/test-utils/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/test-utils/AGENTS.md` |
| 27 | `packages/ui-sdk/AGENTS.md` | present | present | n/a | Router exists and is active. | `packages/ui-sdk/AGENTS.md` |
| 28 | `plugins/AGENTS.md` | present | present | n/a | Router exists and already encodes command-surface policy. | `plugins/AGENTS.md` |
| 29 | `plugins/hello/AGENTS.md` | present | present | n/a | Router exists and is active. | `plugins/hello/AGENTS.md` |
| 30 | `plugins/mfe-demo/AGENTS.md` | present | present | n/a | Router exists and is active. | `plugins/mfe-demo/AGENTS.md` |
| 31 | `scripts/AGENTS.md` | present | present | n/a | Router exists and covers hooks/scripts conventions. | `scripts/AGENTS.md` |
| 32 | `scripts/githooks/AGENTS.md` | missing | missing | `replace_with_pointer` | Hook-specific guidance is already included in parent scripts router. | `scripts/AGENTS.md` |

## Restore List

Restore these minimal routers in both repos:

1. `AGENTS.md`
2. `apps/AGENTS.md`
3. `apps/cli/AGENTS.md`
4. `packages/AGENTS.md`

Status: applied in both repos.  
These are the only restore targets needed to recover clear navigation without reintroducing deep, high-maintenance router sprawl.

## Replacement Pointer Map

Use this map when historical references resolve to missing routers:

- `apps/cli/src/commands/**/AGENTS.md` (except historical `plugins`) -> `apps/cli/AGENTS.md`
- historical `apps/cli/src/commands/plugins/AGENTS.md` -> `apps/cli/src/commands/hq/plugins`
- `apps/server/AGENTS.md`, `apps/web/AGENTS.md` -> `apps/AGENTS.md`
- `docs/plans/AGENTS.md`, `docs/process/AGENTS.md`, `docs/spikes/AGENTS.md` -> `docs/AGENTS.md`
- historical `docs/scratchpads/AGENTS.md` -> `docs/_archive/scratchpads/`
- `scripts/githooks/AGENTS.md` -> `scripts/AGENTS.md`

## Governance Resolutions (2026-02-06 Addendum)

1. `docs/plans/` and `docs/spikes/` are now explicitly documented in `docs/DOCS.md` and `docs/AGENTS.md` as retained workstreams.
2. Archived-doc command drift is explicitly fenced in `docs/_archive/README.md` with canonical Channel A/Channel B pointers.
3. `packages/control-plane` and `packages/session-tools` remain routed by `packages/AGENTS.md` by default.
   - Create package-local `AGENTS.md` only when package-specific policy/routing exceeds parent-router scope.
