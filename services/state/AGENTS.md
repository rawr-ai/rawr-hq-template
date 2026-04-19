# @rawr/state

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Repo-local state persistence under `.rawr/state/state.json` (currently: enabled plugins + timestamps).
- Keep the package root thin. Persistence helpers live behind the `@rawr/state/repo-state` subpath rather than the root service boundary.

## Entry points
- `src/index.ts`: thin public package surface for in-process client + router only.
- `src/client.ts`: `createClient` boundary for in-process consumers.
- `src/router.ts`: stable package router export.
- `src/service/base.ts`: single declarative service seam.
- `src/service/contract.ts`: service-owned capability contract.
- `src/service/impl.ts`: central implementer.
- `src/service/router.ts`: final service router composition.
- `src/repo-state/index.ts`: public repo-state support subpath for persistence helpers + repo-state types.
- `src/repo-state/model.ts`: canonical repo-state model/types/schema.
- `src/repo-state/storage.ts`: authority, persistence, locking, atomic mutation.

## Consumers
- `apps/cli` (`@rawr/cli`).
- `apps/server` (`@rawr/server`).
