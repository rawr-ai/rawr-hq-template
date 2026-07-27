# Habitat Router (`habitat`)

## Purpose

- Provision the exact pinned Habitat executable and expose it to repository
  checks without duplicating Habitat's evaluation engine or policy.

## Scope

- Applies to the pinned Habitat tool integration in `scripts/habitat/**`.

## Boundaries

- Owns the pinned release manifest, platform selection, download, exact byte
  verification, and local executable provisioning for the Civ7-owned Habitat
  CLI.
- `release.json` is the sole accepted release identity. A caller-supplied
  binary must be absolute, executable, and match its selected asset exactly.
- Habitat blueprint structure and source-pattern policy belong in `.habitat/**`;
  the native Habitat CLI owns evaluation. A rule-owned `check.mjs` is allowed
  only for a demonstrated native capability gap and must disappear when the
  consumer exposes that runner; do not place structural policy in `scripts/**`.
- Fixture cleanup must stay limited to a canonical temporary parent, an exact
  owned prefix, a real directory, and a non-symlink path before recursive
  removal.
- This project consumes a compiled release. It must not vendor the Habitat SDK
  source or become a second SDK implementation.

## Behavior

- The integration selects one manifest-approved platform asset, verifies every
  local or downloaded byte, publishes it through a bounded cache transition,
  and invokes the native CLI for owned checks.

## Concepts

- The **release manifest** is executable identity. A **verified cache entry**
  is a byte-exact local copy; a **source-law batch** is the explicitly selected
  set of active Habitat rules.

## Flow

- The release manifest identifies one supported platform asset and its source
  provenance.
- Provisioning selects that asset, verifies an existing cache entry or
  downloads into an exclusive temporary file, then publishes and re-verifies
  the executable.
- Nx-owned repository checks consume the verified executable; policy remains
  in the `.habitat` authority tree.
- `habitat:lint` performs the one ordinary repository-wide Biome lint
  pass. It is not structural or architectural authority.
- `habitat:lint:effect` is the stricter Effect migration surface. It remains
  separate until its existing findings are burned down; it is not a substitute
  structural checker.
- `habitat:check` composes the workspace lint owner, this project's typecheck
  and tests, and `check:policy`.
- `check:policy` composes `check:source-law` with the rule-owned Nx project
  admission adapter. The source-law leaf acquires the selected green Grit and
  structure rules once, including the workspace scheduler law, admitted Oclif
  structure laws, resource and provider package boundaries, and agent-plugin
  command-channel law. Rules with known live-corpus violations remain outside
  the required batch until their owning migration burns them down; direct rule
  selection is diagnostic, not a second required surface.
- The selected source-law batch is intentionally uncached because Nx and
  Habitat do not share one ignore model. Nx may schedule independent graph work
  beside it; Habitat owns bounded execution of the selected rules inside its
  one process.
- Package scripts invoke the provisioned executable directly. Do not restore a
  JavaScript check wrapper or move pattern logic out of Habitat.

## Interfaces

- Release provenance and downloads enter through the manifest and provisioner;
  Nx targets invoke the verified Habitat CLI; `.habitat/**` supplies policy
  directly to that native evaluator.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run habitat:typecheck`
- `bunx nx run habitat:test`
- `bunx nx run habitat:check:project-admission`
- `bunx nx run habitat:check:source-law`
- `bunx nx run habitat:check:policy`
- `bunx nx run habitat:check`
