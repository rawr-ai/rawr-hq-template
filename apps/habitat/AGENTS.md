# Habitat App Router

## Purpose

- Assemble the Habitat product from its public service, resource-provider, and
  plugin faces.

## Scope

- Applies to `apps/habitat/**`.

## Boundaries

- This app is the sole owner of the production Node provider profile.
- It constructs one workspace-bound Habitat client and supplies it to the
  Oclif and Nx projections.
- Domain behavior remains in `@habitat/service`; mechanical capabilities remain
  in resources and providers; argv and task projection remain in plugins.
- The `@habitat/cli` package is an ordinary Oclif distribution boundary, not a
  controller, runtime selector, service owner, or retained state authority.

## Behavior

- Every activation constructs a fresh client bound to the caller's workspace
  over the app process's one ready provider profile.
- Oclif and Nx expose the same service semantics through their native host
  contracts.

## Concepts

- **Composition** selects concrete providers for a ready service client.
- **Projection** translates that client into a host-native command or task
  surface without acquiring domain authority.

## Flow

- `composition.ts` selects ready Node capabilities and constructs the public
  service client for one absolute workspace root.
- `application.ts` binds that client into one Oclif invocation.
- `nx-plugin.ts` supplies the same construction seam to the package-less Nx
  projection and exports its native `createNodes` face.
- `bin/run.js` activates compiled Oclif output; `src/index.ts` is the source
  development entrypoint.

## Interfaces

- Executable: `habitat`.
- Nx plugin: `@habitat/cli/nx-plugin`.
- No root library export is admitted.

## Routing

- [Apps router](../AGENTS.md) for executable-host boundaries.
- [Habitat service router](../../services/habitat/AGENTS.md) for domain
  operations and context.
- [Plugins router](../../plugins/AGENTS.md) for Oclif and Nx projections.

## Validation

- Start with `bunx nx show project @habitat/cli --json`.
- Run `@habitat/cli:typecheck`, `@habitat/cli:test`,
  `@habitat/cli:build`, and `@habitat/cli:manifest` through Nx.
