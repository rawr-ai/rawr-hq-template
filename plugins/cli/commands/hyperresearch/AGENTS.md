# Hyperresearch CLI Plugin Router

## Scope

- Applies to `plugins/cli/commands/hyperresearch/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the Oclif operator and fixture projection for the
  `@rawr/hyperresearch-codex` service.

## Boundaries

- Commands own Oclif flags, exit behavior, and disclosure-safe CLI output.
  Hyperresearch run state, ledger transitions, and integrity findings remain
  service-owned.
- `src/lib/hyperresearch-codex-binding.ts` supplies the public service client
  with package-local IO and CLI backends. Keep those backends behind the
  service resource contracts; do not import service implementation paths.
- The real backend invokes the installed `hyperresearch` executable. The
  fixture backend is a test boundary, not a second production authority.
- This package must not load agent content, hooks, skills, or provider state
  from a Personal checkout.

## Flow

- Oclif parses an operator request, selects the explicit real or fixture
  backend, resolves the service client, invokes a public run procedure, and
  renders the resulting ledger status and integrity findings.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Command inventory and lifecycle boundary](README.md)
- [Behavior test](test/plugin-hyperresearch.test.ts)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run @rawr/plugin-hyperresearch:typecheck`.
- Run `bunx nx run @rawr/plugin-hyperresearch:test`.
- Run `bunx nx run @rawr/plugin-hyperresearch:manifest` when command discovery
  or Oclif metadata changes.
