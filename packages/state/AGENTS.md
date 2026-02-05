# @rawr/state

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Repo-local state persistence under `.rawr/state/state.json` (currently: enabled plugins + timestamps).

## Entry points
- `src/index.ts`: re-exports repo state APIs + `RepoState` type.
- `src/repo-state.ts`: `getRepoState`, `setRepoState`, `enablePlugin`, `disablePlugin`, `defaultRepoState`, `statePath`.
- `src/types.ts`: `RepoState` schema/types.

## Tests
- No package-local tests currently (script uses `vitest run` if/when tests exist).

## Consumers
- `apps/cli` (`@rawr/cli`).
- `apps/server` (`@rawr/server`).

