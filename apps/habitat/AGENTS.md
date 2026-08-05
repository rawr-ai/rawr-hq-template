# Habitat CLI Router

## Purpose

- Ship the ordinary Habitat Oclif application and its native Nx integration over
  the public Habitat SDK.

## Scope

- Applies to `apps/habitat/**`.

## Boundaries

- `@habitat-ai/sdk` owns the workspace-bound production client and runtime
  composition. This app consumes that public client without reaching into its
  private implementation projects.
- Oclif owns command discovery, argv parsing, dispatch, help, and the generated
  command manifest. Habitat commands and their Oclif binding live in this app.
- Nx owns consumer initialization, project inference, target hashing, caching,
  and scheduling. The native Nx projection and generators live in this app.
- The `@habitat-ai/cli` package is an ordinary Oclif distribution boundary, not a
  controller, runtime selector, service owner, or retained state authority.

## Behavior

- Every activation asks the SDK for a fresh client bound to the caller's
  workspace.
- Oclif and Nx expose the same SDK semantics through their native host
  contracts.

## Concepts

- **Composition** belongs to the SDK and selects concrete providers for a ready
  workspace client.
- **Projection** translates that client into a host-native command or task
  surface without acquiring domain authority.

## Flow

- `application.ts` acquires the SDK client and binds it into one Oclif
  invocation; `src/commands/**` projects the three native commands.
- `nx-plugin.ts` supplies the same SDK construction seam to `src/nx/**` and
  exports its native `createNodes` face.
- `generators.json` exposes the ESM Nx initialization and named-hook removal
  emitted with the rest of the app; their binding fixes the package-owned Nx
  and Codex contributions, installs Husky as consumer development tooling, and
  supplies the default consumer-owned pre-push check without replacing a
  repository's existing nonempty hook.
- `bin/run.js` activates compiled Oclif output; `src/index.ts` is the source
  development entrypoint.

## Interfaces

- Executable: `habitat`.
- Nx plugin: `@habitat-ai/cli/nx-plugin`.
- Nx generators: `@habitat-ai/cli:init` and `@habitat-ai/cli:remove-hook`.
- Git-hook activation: consumer-root Husky installed by `@habitat-ai/cli:init`.
- Consumer package managers: npm, pnpm, and Bun; Yarn requires a different
  Husky lifecycle and is refused before initialization writes.
- Runtime SDK: `@habitat-ai/sdk`.
- No root library export is admitted.

## Routing

- [Apps router](../AGENTS.md) for executable-host boundaries.
- [Packages router](../../packages/AGENTS.md) for the public SDK boundary.

## Validation

- Start with `bunx nx show project @habitat-ai/cli --json`.
- Run `@habitat-ai/cli:typecheck`, `@habitat-ai/cli:test`,
  `@habitat-ai/cli:build`, and `@habitat-ai/cli:manifest` through Nx.
