# Repository Check Router (`repository`)

## Scope

- Applies to the repository check owner in `scripts/nx/**`.

## Boundaries

- Owns the TypeBox contract for the Nx project-graph facts it reads and the
  admission policy for project-kind, lint-target, and typecheck-target
  presence.
- Owns repository-separation admission and composes the repository's required
  owner checks. It does not reimplement the policies owned by Habitat, the
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
- `repository:check` composes this owner's lint, typecheck, tests,
  `check:projects`, and `check:boundaries` with `habitat:check` and the CLI
  Oclif boundary check. Required Oclif and lifecycle command-channel structure
  laws belong to Habitat's selected policy batch.
- The root `bun run check` runs affected `lint` and `typecheck` before entering
  this repository-owned aggregate.

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
