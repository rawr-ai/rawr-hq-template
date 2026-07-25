# Nx Generator Router

## Purpose

- Host deterministic repository-local Nx generators that synchronize declared
  artifacts through Nx's supported tree interface.

## Scope

- Applies to repository-local Nx generator registration and implementations in
  `tools/nx/**`.

## Boundaries

- Owns `generators.json` and the deterministic generators registered from
  `nx.json`.
- Generators may synchronize declared files through the Nx tree API; they do
  not own the project graph, task execution, or repository quality policy.
- Quality-target admission and ratchet enforcement belong to `scripts/nx/**`,
  not this generator collection.
- Keep generator schemas closed and generator output deterministic. Do not add
  filesystem-discovered project inventories or package-name exceptions.

## Behavior

- A registered generator accepts a closed schema, derives deterministic output
  from declared inputs, and lets Nx detect whether tracked state is stale.

## Concepts

- A **generator registration** makes an implementation discoverable to Nx. A
  **sync generator** describes expected tracked output; the **Nx tree** is its
  bounded write interface.

## Flow

- `nx.json` registers a generator from this collection.
- Nx sync invokes the generator and compares its output with the tracked file.
- The separate inventory verifier compares tracked declarations with their
  owning project metadata.

## Interfaces

- `generators.json` and `nx.json` expose generators to Nx; schemas face
  callers; the Nx tree carries generated changes; separate verifiers consume
  the tracked output.

## Routing

- [Repository router](../../AGENTS.md)
- [Nx admission tool](../../scripts/nx/AGENTS.md)
- [Architecture inventory](../architecture-inventory/AGENTS.md)

## Validation

- `bunx nx sync:check`
- `bun run sync:check`
