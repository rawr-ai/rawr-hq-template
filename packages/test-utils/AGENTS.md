# @rawr/test-utils

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Small helpers for integration-style tests (currently: run a CLI command with Bun-or-Node fallback).

## Entry points
- `src/index.ts`: exports `runCommand` + related types.
- `src/run-command.ts`: `runCommand(command, args, { cwd, env, timeoutMs })`.

## Tests
- `test/rawr-cli.integration.test.ts` (Vitest).

## Consumers
- None declared in workspace `package.json` dependencies (as of current repo state).

