# UI SDK Router (`@rawr/ui-sdk`)

## Scope

- Applies to the host-neutral micro-frontend mounting contract in
  `packages/ui-sdk/**`.

## Boundaries

- Owns mount context, navigation, unmount, and module types plus the
  `defineMicroFrontend` constructor.
- Must not own plugin discovery, application routing, lifecycle state, or a
  concrete browser host.
- Keep the package transport- and framework-neutral; host behavior remains in
  the application that invokes the mount function.

## Flow

- A host creates a `MountContext` and obtains a module created by
  `defineMicroFrontend`.
- The host invokes `mount`; the module may return an unmount handle for the
  host to call during teardown.

## Routing

- [Packages router](../AGENTS.md)
- [Web application](../../apps/web/AGENTS.md)

## Validation

- `bunx nx run @rawr/ui-sdk:lint`
- `bunx nx run @rawr/ui-sdk:typecheck`
- `bunx nx run @rawr/ui-sdk:test`
- `bunx nx run @rawr/ui-sdk:build`
