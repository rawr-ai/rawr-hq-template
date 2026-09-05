# Habitat CLI Router

## Purpose

- Ship the ordinary Habitat Oclif application and its native Nx integration over
  the public Habitat SDK.

## Scope

- Applies to `apps/habitat/**`.

## Boundaries

- The app owns explicit plugin, profile, and provider selection. The public SDK
  realizes the selected entrypoint without exposing its private runtime owners.
- Oclif owns command discovery, argv parsing, dispatch, help, and the generated
  command manifest. Habitat commands and their Oclif binding live in this app.
- Oclif's native `@oclif/plugin-plugins` owns external extension state and the
  `habitat plugins ...` lifecycle; Habitat only composes the vendor plugin.
- Nx owns consumer initialization, project inference, target hashing, caching,
  and scheduling. The native Nx projection and generators live in this app.
- The `@habitat-ai/cli` package is an ordinary Oclif distribution boundary, not a
  controller, runtime selector, service owner, or retained state authority.

## Behavior

- Every activation starts one selected process with workspace-bound source data;
  its native host awaits command work and owns the explicit stop obligation.
- Oclif and Nx expose the same SDK semantics through their native host
  contracts.

## Concepts

- **Composition** belongs to the app; the SDK realizes its exact selected
  entrypoint. Provider implementations retain acquisition and release ownership.
- **Projection** translates that client into a host-native command or task
  surface without acquiring domain authority.

## Flow

- `habitat.app.ts` selects the foundation and authoring topics; `runtime/processes.ts` and
  `runtime/profiles/**` declare process and provider selections. `cli.ts`
  creates the exact entrypoint and starts it through the SDK.
- `src/application.ts` supplies deployment input and native host mode.
  The foundation topic owns command projections; the app owns native Oclif
  lifecycle. The Nx reader uses the same managed execution without escaping a
  ready client or abandoning process cleanup.
- `generators.json` exposes the ESM Bun repository preset, post-Git
  initialization, and named-hook removal emitted with the rest of the app. The
  preset creates only the portable Bun/Nx scheduler and source-quality spine;
  `init` then installs and activates the package-owned Nx, Codex, and Husky
  contributions without replacing a repository's existing nonempty hook.
- `bin/run.js` activates compiled Oclif output; `src/index.ts` is the source
  development entrypoint.

## Interfaces

- Executable: `habitat`.
- Native external-extension lifecycle: `habitat plugins ...`.
- Source authoring: `habitat cli command create <topic> <name>` and
  `habitat cli extension create <id> --destination <path>`, both with `--dry-run`.
  The app supplies separate native generator runners; the invoking directory
  is their exact root. Source creation never installs or activates its output.
- Nx plugin: `@habitat-ai/cli/nx-plugin`.
- Nx generators: `@habitat-ai/cli:preset`, `@habitat-ai/cli:init`, and
  `@habitat-ai/cli:remove-hook`.
- Source generators: `@habitat-ai/cli:service`, `@habitat-ai/cli:cli-command`,
  and `@habitat-ai/cli:cli-extension`. The latter two stage a fully validated
  native Nx Tree without installing or activating output. Native dry-run and
  preflight refusal publish nothing; native disk-flush errors are not rollback.
- New repository lifecycle: run the Bun-only `preset` through
  `create-nx-workspace`, then invoke `init` after Nx has initialized Git.
- Git-hook activation: consumer-root Husky installed by `@habitat-ai/cli:init`.
- Repository creation and existing-repository initialization are Bun-only.
- Runtime SDK: `@habitat-ai/sdk`.
- No root library export is admitted.

## Routing

- [Apps router](../AGENTS.md) for executable-host boundaries.
- [Packages router](../../packages/AGENTS.md) for the public SDK boundary.

## Validation

- Start with `bunx nx show project @habitat-ai/cli --json`.
- Run `@habitat-ai/cli:typecheck`, `@habitat-ai/cli:test`,
  `@habitat-ai/cli:build`, and `@habitat-ai/cli:manifest` through Nx.
- Run `@habitat-ai/cli:acceptance:oclif-native-plugins` when native extension
  installation or state behavior changes.
- Run `@habitat-ai/cli:acceptance:generators-installed-package` for native Nx
  generator and installed source-authoring command changes.
- Run `@habitat-ai/cli:acceptance:generators-installed-package` for source
  creators. It reuses the isolated-registry native `nx add` fixture and executes
  the packed generators through native `nx generate`, not source imports.
