# HQ Application Router (`@rawr/hq-app`)

## Purpose

- Declare which roles and plugins make up the HQ application.

## Scope

- Applies to the HQ application declarations and process entrypoints in
  `apps/hq/**`.

## Boundaries

- Owns HQ application identity and the declaration of role and plugin
  membership in `rawr.hq.ts`.
- Owns process-role selection and the thin application entrypoints in
  `server.ts`, `async.ts`, and `dev.ts`.
- May call the server's public host interface. It must not construct server
  resources, reach into server internals, or expose a reverse compatibility
  bridge.

## Behavior

- The application records membership and selects a role. The server host
  realizes that selection with concrete runtime capabilities.

## Concepts

- An **HQ manifest** is the declarative membership record for application
  roles and plugins.

## Flow

- `createRawrHqManifest` declares the application roles and selected plugin
  registrations.
- An app-owned entrypoint projects the selected declarations into the public
  server host.
- The server supplies concrete resources and materializes executable routes
  without moving app policy into host composition.

## Interfaces

- The manifest is consumed through the package's `./manifest` export.
  Entrypoints consume `@rawr/server/host`; realized routes and workflows remain
  server-owned.

## Routing

- [Apps router](../AGENTS.md)
- [Server host](../server/AGENTS.md)
- [HQ SDK](../../packages/hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/hq-app:typecheck`
- `bunx nx run @rawr/hq-app:test`
- `bunx nx run @rawr/hq-app:build`
