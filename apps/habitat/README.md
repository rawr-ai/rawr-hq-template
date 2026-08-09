# `@habitat-ai/cli`

Habitat's Oclif CLI and native Nx integration. The package owns the portable
repository preset, Habitat policy projection, and the public `habitat` command.

## External Oclif Extensions

The CLI composes Oclif's native extension lifecycle without wrapping or
reimplementing it:

```sh
habitat plugins --help
```

`@oclif/plugin-plugins` owns listing, installation, linking, inspection,
updates, reset, uninstallation, aliases, and its native per-user state.

## Create A Repository

Nx invokes the package's Bun-only `preset` generator while creating the workspace:

```sh
bunx create-nx-workspace@23.1.1 my-workspace \
  --preset=@habitat-ai/cli \
  --packageManager=bun
```

Nx initializes Git after the preset returns. Activate the repository hooks once
that boundary exists:

```sh
cd my-workspace
bunx nx generate @habitat-ai/cli:init --no-interactive
```

The preset creates generic Bun, Nx, TypeScript, Biome, and Habitat scheduler
configuration. It does not copy blueprints, select product policy, or author the
repository's `AGENTS.md` hierarchy.

## Adopt An Existing Bun Nx Repository

```sh
bunx nx add @habitat-ai/cli --no-interactive
```

`nx add` invokes `init`. Existing nonempty hooks and unrelated Nx/Codex
configuration remain consumer-owned. A Bun repository may additionally invoke the
`preset` generator to adopt the portable repository spine.

Later package releases use ordinary Nx migrations:

```sh
bunx nx migrate @habitat-ai/cli@latest
bun install
bunx nx migrate --run-migrations
```

The first command updates the fixed CLI/SDK pair and writes any applicable
Habitat migrations. The final command applies those package-owned repository
changes; no consumer copies or independently maintains the preset wiring.

Habitat `0.5.3` used Nx `23.1.0`, whose provenance reader predates npm 12. When
that exact historical pair is upgraded under npm 12, pin the migration CLI and
scope Nx's documented compatibility flag to both migration commands. The first
command generates the migration; the install materializes the released pair;
the final command applies the repository changes:

```sh
NX_MIGRATE_CLI_VERSION=23.1.1 NX_SKIP_PROVENANCE_CHECK=true \
  bunx nx migrate @habitat-ai/cli@0.5.13
bun install
NX_MIGRATE_CLI_VERSION=23.1.1 NX_SKIP_PROVENANCE_CHECK=true \
  bunx nx migrate --run-migrations=migrations.json --no-interactive
```

Only the historical Nx `23.1.0` upgrade needs that compatibility scope. Nx
`23.1.1` and later verify provenance normally.
