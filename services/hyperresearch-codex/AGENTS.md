# Hyperresearch Codex Service Router

## Purpose

- Govern durable Hyperresearch V8 runs and provide a synthetic execution slice
  for testing the same artifact and integrity model.

## Scope

- Applies to `services/hyperresearch-codex/**`.
- This oRPC service owns Hyperresearch run transitions, run inspection and
  validation, and the synthetic fixture capability.

## Boundaries

- Consumers cross through declared package exports; run and fixture contracts,
  ledgers, integrity policy, and routers remain package-owned.
- The service owns research-run semantics. Hosts supply CLI execution, clock,
  identity, hashing, path, and file I/O capabilities.
- Reference packets and evidence inform behavior but do not replace the public
  service contract or become ambient runtime state.

## Behavior

- The service initializes or resumes a ledger, advances only admitted steps,
  emits agent work or synthesized artifacts, and reports integrity findings
  that determine run status.

## Concepts

- A **run ledger** is durable transition state. A **step definition** declares
  required artifacts and work; an **agent packet** is delegated work; an
  **integrity finding** classifies missing or inconsistent run evidence.

## Flow

- A host binds the Hyperresearch backend and I/O ports; the public router sends
  a request to the runs or fixtures module; the module advances or observes its
  ledger and returns structured integrity facts.

## Interfaces

- Runs and fixtures form the public oRPC boundary; CLI execution, time,
  identity, hashing, path, and file I/O enter through host-bound service
  resources.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Service I/O boundary](src/service/common/resources.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/hyperresearch-codex:typecheck`.
- Run `bunx nx run @rawr/hyperresearch-codex:test` when run or fixture behavior
  changes.
