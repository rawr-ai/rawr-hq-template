# Session Tools CLI Plugin Router

## Scope

- Applies to `plugins/cli/commands/session-tools/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the Oclif projection for listing, resolving, searching,
  and extracting local Codex and Claude sessions.

## Boundaries

- Commands own flags, bounded operator defaults, output formatting, and
  optional output-file projection. Session catalog, search, facet, and index
  policy remain in `@rawr/session-intelligence`.
- `src/lib/session-source-runtime.ts` and
  `src/lib/session-index-runtime.ts` are concrete local filesystem and SQLite
  adapters for public service ports. They expose resource operations; they do
  not become alternate session-domain services.
- Provider-home discovery belongs to the source adapter, while candidate
  selection, indexing policy, and query semantics belong to the service.
- This is a core Oclif command plugin composed by `@rawr/cli`, not an external
  extension installed through `rawr plugins`.

## Flow

- Oclif validates the operator request, the binding realizes session-source
  and index adapters, the Session Intelligence client performs the requested
  capability, and the command renders or writes the projected result.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Command and filter behavior](README.md)
- [Behavior test](test/plugin-session-tools.test.ts)

## Validation

- Run `bunx nx run @rawr/plugin-session-tools:lint`.
- Run `bunx nx run @rawr/plugin-session-tools:typecheck`.
- Run `bunx nx run @rawr/plugin-session-tools:test`.
- Run `bunx nx run @rawr/plugin-session-tools:structural` when the package
  boundary changes.
- Run `bunx nx run @rawr/plugin-session-tools:manifest` when command discovery
  or Oclif metadata changes.
