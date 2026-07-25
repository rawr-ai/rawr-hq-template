# Repository Check Router (`repository`)

## Purpose

- Own the repository-separation verification that remains outside Habitat's
  workspace and source-law checks.

## Scope

- Applies to the repository check owner in `scripts/nx/**`.

## Boundaries

- Owns the remaining repository-separation admission only. It does not schedule
  or reimplement checks owned by Habitat, the lifecycle service, or the CLI.
- Root scheduler and resolved project-quality policy belong to Habitat's
  `nx-workspace` rules. Do not restore either policy under `scripts/nx`.

## Behavior

- The repository project evaluates its single separation obligation and
  contributes that result to the shared Nx check graph without scheduling
  other owners.

## Concepts

- The **repository check owner** holds cross-repository separation. Its
  **verify target** is an owner-local prerequisite; the **scheduler graph** is
  Nx and Habitat authority, not script policy.

## Flow

- `repository:check` composes repository separation through its owner-local
  `verify` target. Shared Nx defaults add the one workspace lint task and this
  project's typecheck.
- The root `bun run check` schedules every project check once. Required Oclif
  and lifecycle command-channel structure laws enter that graph through the
  Habitat owner, while CLI source/build parity enters through the CLI owner.

## Interfaces

- The `repository:verify` and `repository:check` targets are the public check
  interface; shared Nx defaults compose lint, typecheck, Habitat policy, and
  dependency results around them.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run repository:typecheck`
- `bunx nx run repository:check:boundaries`
- `bunx nx run repository:check`
