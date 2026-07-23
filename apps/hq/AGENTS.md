# HQ Application Router (`@rawr/hq-app`)

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

## Flow

- `createRawrHqManifest` declares the application roles and selected plugin
  registrations.
- A process entrypoint creates the manifest and delegates through the named
  host adapter.
- The server host supplies concrete resources and materializes executable
  routes without moving that policy into the manifest.

## Routing

- [Apps router](../AGENTS.md)
- [Server host](../server/AGENTS.md)
- [HQ SDK](../../packages/hq-sdk/AGENTS.md)

## Validation

- `bunx nx run @rawr/hq-app:lint`
- `bunx nx run @rawr/hq-app:typecheck`
- `bunx nx run @rawr/hq-app:test`
- `bunx nx run @rawr/hq-app:build`
