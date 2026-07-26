# Workstream CLI Plugin Router

## Purpose

- Project the `workstream-frame` service onto the RAWR CLI so an operator can
  open a frame, admit work, run the iterator, resolve peel-offs, and read the
  stream at any past position.

## Scope

- Applies to the `rawr workstream` command surface in this package.

## Boundaries

- This plugin owns CLI input parsing, flag policy, and rendering. It does not
  own stream truth, frame policy, or what a boundary means.
- It declares use of the service and binds a client at the composition edge.
  Provider selection sits in `src/lib/workstream-client.ts` today because that
  is where the shipped `bindService` path puts it; in the target architecture it
  moves to an HQ app runtime profile.

## Behavior

- Each command resolves one client, calls exactly one service procedure, and
  renders the result. `--json` emits the raw service payload so the CLI never
  becomes the only way to read the data.

## Concepts

- A **boundary** is declared as a repeated `--boundary` flag, in order. A
  **peel-off** is reported by `push` with the derived item's id, which is the
  argument `resolve` then takes. `--at` reconstructs a past position.

## Flow

- `open` → `admit` → `push` → `resolve` → `push` until the iterator reports
  `completed` or `equilibrium`; `inspect --at` reads any earlier position.

## Interfaces

- `rawr workstream open|admit|push|resolve|inspect`. `--ledger-url` and
  `--ledger` select the substrate; `FLUREE_URL` and `WORKSTREAM_LEDGER` are the
  environment equivalents.

## Routing

- [Workstream frame service](../../../../services/workstream-frame/AGENTS.md)
- [Semantic ledger resource](../../../../resources/semantic-ledger/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/plugin-workstream:typecheck`.
- Run `bunx nx run @rawr/plugin-workstream:test`.
