# `@habitat-ai/cli`

Habitat's Oclif CLI and native Nx integration. The package owns the portable
repository preset, Habitat policy projection, and the public `habitat` command.

## Create A Repository

Nx invokes the package's Bun-only `preset` generator while creating the workspace:

```sh
bunx create-nx-workspace@23.1.0 my-workspace \
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

## Adopt An Existing Nx Repository

```sh
bunx nx add @habitat-ai/cli --no-interactive
```

`nx add` invokes `init`. Existing nonempty hooks and unrelated Nx/Codex
configuration remain consumer-owned. A Bun repository may additionally invoke the
`preset` generator to adopt the portable repository spine.

Later package releases use ordinary Nx migrations:

```sh
bunx nx migrate @habitat-ai/cli@latest
```
