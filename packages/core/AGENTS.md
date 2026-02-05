# @rawr/core

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Shared command/runtime primitives for the RAWR CLI (Oclif base command + output conventions).

## Entry points
- `src/index.ts`: exports `RAWR_CORE_VERSION` and re-exports everything from `src/cli/rawr-command.ts`.
- `src/cli/rawr-command.ts`: `RawrCommand`, `RawrResult`, `RawrError`, `RawrBaseFlags`.

## Tests
- `test/core.test.ts` (Vitest).

## Consumers
- `apps/cli` (`@rawr/cli`).

