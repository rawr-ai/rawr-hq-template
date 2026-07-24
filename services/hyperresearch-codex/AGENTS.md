# Hyperresearch Codex Service Router

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

## Flow

- A host binds the Hyperresearch backend and I/O ports; the public router sends
  a request to the runs or fixtures module; the module advances or observes its
  ledger and returns structured integrity facts.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Service I/O boundary](src/service/common/resources.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/hyperresearch-codex:typecheck`.
- Run `bunx nx run @rawr/hyperresearch-codex:test` when run or fixture behavior
  changes.
