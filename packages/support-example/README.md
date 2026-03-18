# `@rawr/support-example`

`@rawr/support-example` models the **support-example** capability with a router-first authority chain:

- `domain/`: business concepts and invariants (`TriageWorkItem`, status model)
- `modules/`: procedure implementations + module router composition (`triage/items/*`, `triage/triage.ts`)
- `router.ts`: source of truth for callable shape + handlers (`supportExample.triage.items.*`)
- `contract.ts`: derived contract view from router (no duplicate contract tree)

## Public exports

Package boundary exports are intentionally minimal:

- `@rawr/support-example/router`
- `@rawr/support-example/contract`

Callers create an in-process client where needed:

- `createRouterClient(supportExampleRouter, { context })`
- then call `client.triage.items.request(...)` / `list(...)` / `get(...)` / `start(...)` / `complete(...)`

## Hypothetical vs Production

- This package is intentionally example-oriented and non-normative.
- It is safe to use as a reference for package/plugin boundary patterns.
- It is not a production-ready implementation of a real support platform.
