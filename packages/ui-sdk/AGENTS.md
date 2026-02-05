# @rawr/ui-sdk

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Minimal micro-frontend mounting contract (types + `defineMicroFrontend`) for host/app integration.

## Entry points
- `src/index.ts`: `defineMicroFrontend` and all public types (`MountContext`, `MountFn`, `MicroFrontendModule`, etc).

## Tests
- `test/ui-sdk.test.ts` (Vitest).

## Consumers
- `apps/web` (`@rawr/web`).

