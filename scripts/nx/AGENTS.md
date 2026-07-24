# Repository Check Router (`repository`)

## Scope

- Applies to the repository check owner in `scripts/nx/**`.

## Boundaries

- Owns the remaining repository-separation admission only. It does not schedule
  or reimplement checks owned by Habitat, the lifecycle service, or the CLI.
- Root scheduler and resolved project-quality policy belong to Habitat's
  `nx-workspace` rules. Do not restore either policy under `scripts/nx`.

## Flow

- `repository:check` composes repository separation through its owner-local
  `verify` target. Shared Nx defaults add the one workspace lint task and this
  project's typecheck.
- The root `bun run check` schedules every project check once. Required Oclif
  and lifecycle command-channel structure laws enter that graph through the
  Habitat owner, while CLI source/build parity enters through the CLI owner.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run repository:typecheck`
- `bunx nx run repository:check:boundaries`
- `bunx nx run repository:check`
