# Habitat Router (`habitat`)

## Scope

- Applies to the pinned Habitat tool integration in `scripts/habitat/**`.

## Boundaries

- Owns the pinned release manifest, platform selection, download, exact byte
  verification, and local executable provisioning for the Civ7-owned Habitat
  CLI.
- `release.json` is the sole accepted release identity. A caller-supplied
  binary must be absolute, executable, and match its selected asset exactly.
- Habitat blueprint structure and source-pattern policy belong in `.habitat/**`;
  the native Habitat CLI owns evaluation. Do not duplicate either concern in a
  JavaScript wrapper.
- Fixture cleanup must stay limited to a canonical temporary parent, an exact
  owned prefix, a real directory, and a non-symlink path before recursive
  removal.
- This project consumes a compiled release. It must not vendor the Habitat SDK
  source or become a second SDK implementation.

## Flow

- The release manifest identifies one supported platform asset and its source
  provenance.
- Provisioning selects that asset, verifies an existing cache entry or
  downloads into an exclusive temporary file, then publishes and re-verifies
  the executable.
- Nx-owned repository checks consume the verified executable; policy remains
  in the `.habitat` authority tree.
- `habitat:check` composes this owner's lint, typecheck, and tests with
  `check:hygiene` and `check:policy`.
- `check:policy` acquires the selected green repository rules once, including
  the admitted Oclif structure laws and agent-plugin command-channel law. Rules
  with known live-corpus violations remain outside the required batch until
  their owning migration burns them down; direct rule selection is diagnostic,
  not a second required surface.
- Package scripts invoke the provisioned executable directly. Do not restore a
  JavaScript check wrapper or move pattern logic out of Habitat.

## Routing

- [Scripts router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run habitat:typecheck`
- `bunx nx run habitat:test`
- `bunx nx run habitat:check:hygiene`
- `bunx nx run habitat:check:policy`
- `bunx nx run habitat:check`
