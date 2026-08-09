# Updating Habitat And Its Consumers

Habitat, Rawr, and Marketplace update independently from their own canonical
`main` branches. They share no Git synchronization workflow.

## Habitat Repository

Update this checkout from its own `origin`, then use the locked Bun/Nx
foundation:

```bash
gt sync --no-restack
bun install --frozen-lockfile
bunx nx show projects
```

Use Graphite for branch and stack changes. Before pushing, run `bun run check`;
the remote Repository Ratchet is merge authority.

## Public Interface Changes

1. Change the Habitat owner and its focused proof.
2. Release only the fixed `@habitat-ai/sdk` and `@habitat-ai/cli` Nx group.
3. Record registry integrity and provenance in the owning release receipt.
4. Let each consumer use native `nx migrate` and Bun install against that exact
   release.
5. Validate consumer behavior in its own repository and review process.

Do not introduce a checkout link, source fallback, private package cohort,
custom installer, or cross-repository Git ancestry.

## Command Surfaces

- `habitat plugins ...` is operational for external Oclif extensions.
- Curated agent-plugin lifecycle has no current Habitat CLI projection. Task
  12.1 must land its command, manifest, profile, and policy together.
- No Rawr alias or premature `habitat agent plugins ...` route is supported.

See [[docs/process/CROSS_REPO_WORKFLOWS]] for repository boundaries and
[[docs/process/GRAPHITE]] for Habitat stack operations.
