# HQ Application Router (`@rawr/hq-app`)

## Purpose

- Declare which roles and plugins make up the HQ application and expose thin
  process entrypoints for realizing that declaration.

## Scope

- Applies to the HQ application declarations and process entrypoints in
  `apps/hq/**`.

## Boundaries

- Owns HQ application identity and the declaration of role and plugin
  membership in `rawr.hq.ts`.
- `server.ts`, `async.ts`, and `dev.ts` are thin process entrypoints; they do
  not own service or provider policy.
- `legacy-cutover.ts` adapts those entrypoints to the server host. Host
  construction stays within that adapter and must not leak into the
  declaration surface.

## Behavior

- The application records membership and selects a host adapter; the host then
  realizes the declaration with concrete runtime capabilities.

## Concepts

- An **HQ manifest** is the declarative membership record for application
  roles and plugins. A **process entrypoint** selects how that manifest is
  realized, not what its services mean.

## Flow

- `createRawrHqManifest` declares the application roles and selected plugin
  registrations.
- A process entrypoint creates the manifest and delegates through the named
  host adapter.
- The server host supplies concrete resources and materializes executable
  routes without moving that policy into the manifest.

## Interfaces

- The manifest is consumed through HQ SDK declarations; process entrypoints
  hand it to the server host; realized routes and workflows are supplied back
  by that host boundary.

## Routing

- [Apps router](../AGENTS.md)
- [Server host](../server/AGENTS.md)
- [HQ SDK](../../packages/hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/hq-app:typecheck`
- `bunx nx run @rawr/hq-app:test`
- `bunx nx run @rawr/hq-app:build`
