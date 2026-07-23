# Nx Generator Router

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

## Flow

- `nx.json` registers a generator from this collection.
- Nx sync invokes the generator and compares its output with the tracked file.
- The separate inventory verifier compares tracked declarations with their
  owning project metadata.

## Routing

- [Repository router](../../AGENTS.md)
- [Nx admission tool](../../scripts/nx/AGENTS.md)
- [Architecture inventory](../architecture-inventory/AGENTS.md)

## Validation

- `bunx nx sync:check`
- `bun run sync:check`
