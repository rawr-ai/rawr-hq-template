# Nx Admission Tool Router (`@rawr/nx-admission`)

## Scope

- Applies to the repository quality-target admission tool in `scripts/nx/**`.

## Boundaries

- Owns the TypeBox contract for the Nx project-graph facts it reads and the
  admission policy for project-kind, lint-target, and typecheck-target
  presence.
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

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run @rawr/nx-admission:lint`
- `bunx nx run @rawr/nx-admission:typecheck`
- `bunx nx run @rawr/nx-admission:test`
