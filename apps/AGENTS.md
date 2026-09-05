# Apps Router

## Purpose

- Route the foundational Habitat CLI package source without treating a
  downstream product app as platform source.

## Scope

- Applies to `apps/**`.

## Nx First Hop

- Before exploring app code directly, use Nx to confirm the project name, root, tags, and targets:
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills when the task is about workspace navigation, project structure, task execution, or generators.

## Current Surface

- Habitat CLI application and Nx entrypoint: `apps/habitat/`.

## Boundaries

- `apps/habitat` is the public CLI package and its explicit self-host composition
  boundary, not an enclosure for downstream product source.
- `habitat plugins ...` manages external Oclif extensions.
- Curated agent-plugin lifecycle has no CLI projection until task 12.1 lands
  its command, manifest, profile, and policy together.
- Rawr product apps, web hosts, topics, and profiles belong in Rawr's
  independent repository.

## Behavior

- The CLI projects public Habitat SDK behavior through native Oclif and Nx
  contracts while leaving runtime and domain ownership with their owners.

## Concepts

- A **projection** translates a public Habitat capability into a host-native
  command or task surface without acquiring domain authority.

## Flow

- Oclif parses operator input and delegates Habitat work through the public SDK.
- Nx exposes the same package through its native plugin and generator surfaces.

## Interfaces

- Executable: `habitat`.
- Nx plugin and generators: `@habitat-ai/cli`.

## Routing

- [Habitat app router](habitat/AGENTS.md) for Habitat provider selection,
  Oclif composition, and the published Nx entrypoint.
- [Packages router](../packages/AGENTS.md) for shared package boundaries.

## Validation

- Use `bunx nx show project @habitat-ai/cli --json` to select the owner targets.
- Run its focused typecheck, test, build, and manifest targets before broad checks.
