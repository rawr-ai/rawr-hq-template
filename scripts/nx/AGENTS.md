# Repository Check Router (`repository`)

## Scope

- Applies to the repository check owner in `scripts/nx/**`.

## Boundaries

- Owns the TypeBox contract for the Nx project-graph facts it reads and the
  admission policy for project-kind, public-check, lint-target, and
  typecheck-target presence.
- Owns repository-separation admission and its bounded project-metadata
  admission. It does not schedule or reimplement checks owned by Habitat, the
  lifecycle service, or the CLI.
- Nx remains project and task-graph authority. This tool checks declared graph
  facts; it does not infer projects from the filesystem or create missing
  targets.
- Content and fixture exemptions are explicit project kinds. Do not add
  package-name exceptions or a second project inventory.

## Flow

- The tool obtains the current Nx project graph, validates its structure, and
  evaluates every non-root project against the quality-target policy.
- Violations are sorted and reported together so the owning projects can
  repair their own metadata and targets.
- `repository:check` composes only this owner's lint, typecheck, tests,
  project admission, and repository separation through its owner-local
  `verify` target.
- The root `bun run check` schedules every project check once. Required Oclif
  and lifecycle command-channel structure laws enter that graph through the
  Habitat owner, while CLI source/build parity enters through the CLI owner.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run repository:lint`
- `bunx nx run repository:typecheck`
- `bunx nx run repository:test`
- `bunx nx run repository:check:projects`
- `bunx nx run repository:check:boundaries`
- `bunx nx run repository:check`
