# UI SDK Router (`@rawr/ui-sdk`)

## Purpose

- Define a framework-neutral mounting handshake between browser hosts and
  independently supplied micro-frontends.

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

## Behavior

- A micro-frontend accepts host-provided mount and navigation context, attaches
  its UI, and optionally returns a teardown capability to the host.

## Concepts

- A **micro-frontend module** owns a mount operation. `MountContext` carries
  the host element and navigation capability; an **unmount handle** reverses
  the attachment.

## Flow

- A host creates a `MountContext` and obtains a module created by
  `defineMicroFrontend`.
- The host invokes `mount`; the module may return an unmount handle for the
  host to call during teardown.

## Interfaces

- `defineMicroFrontend` faces module authors; `MountContext`, navigation, and
  the optional unmount handle form the runtime handshake with a browser host.

## Routing

- [Packages router](../AGENTS.md)
- [Web application](../../apps/web/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/ui-sdk:typecheck`
- `bunx nx run @rawr/ui-sdk:test`
- `bunx nx run @rawr/ui-sdk:build`
