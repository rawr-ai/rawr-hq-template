# Habitat Router (`habitat`)

## Purpose

- Expose the installed Habitat CLI and its inferred Nx policy graph without
  duplicating Habitat's evaluator, registry, or acquisition lifecycle.

## Scope

- Applies to Template's Habitat consumer boundary in `scripts/habitat/**`.

## Boundaries

- `package.json` and `bun.lock` pin the released `@habitat-ai/cli` package and
  its exact bytes. Template owns the package source separately; Nx graph
  bootstrap never executes that workspace source as a fallback.
- `.habitat/**` owns structure, source, and blueprint authority. The installed
  Habitat package owns registry discovery, rule selection, inputs, caching,
  Grit acquisition, evaluation, and hook behavior.
- This project owns only workspace hygiene, formatting, and the explicit Nx
  anchor that merges with Habitat's inferred targets.
- Do not restore a provisioner, wrapper, hand-maintained rule list, raw Grit
  invocation, or script-backed structural policy.

## Behavior

- Nx loads `@habitat-ai/cli/nx-plugin`, discovers registered rules, and infers one
  cacheable rule target plus owner-local `check:policy` composition.
- The `habitat` project contributes the repository-wide Biome pass. Its public
  `check` enters the same shared Nx graph as every other project.
- Codex Stop delegates to `habitat hook agent-stop`; it is fast feedback over
  the registered hook rules, not a second admission graph.

## Concepts

- The **package release** is tool identity. The **rule registry** is policy
  identity. An **owner target** is the Nx projection of rules owned by one
  repository component.

## Flow

- Bun installs the pinned package and realizes its package-local Grit binary.
- Nx derives rule and owner targets from `.habitat/**`.
- Project `check` targets depend on their inferred policy target, while
  protected CI remains merge authority.

## Interfaces

- `bun habitat` is the operator and hook command surface.
- `bunx nx run <project>:check:policy` is the owner-local policy surface.
- `.habitat/**` is the only structural and source-law authoring surface.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)
- [Habitat authority](../../.habitat/AUTHORITY.md)

## Validation

- `bun habitat --version`
- `bunx nx show project habitat --json`
- `bunx nx run habitat:check:policy`
- `bunx nx run habitat:check`
