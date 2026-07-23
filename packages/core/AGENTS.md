# Core Package Router (`@rawr/core`)

## Scope

- Applies to the shared CLI bootstrap and telemetry primitives in
  `packages/core/**`.

## Boundaries

- Owns `RawrCommand`, common CLI result/output conventions, neutral workspace
  discovery, and the exported telemetry installer.
- Must not own command-specific behavior, plugin lifecycle policy, workspace
  manifest semantics, or application composition.
- Workspace discovery may locate a workspace for bootstrap; it does not make a
  checkout the identity of an installed command.

## Flow

- CLI commands inherit `RawrCommand`, parse the shared base flags, and render a
  `RawrResult`.
- Entrypoints use `findWorkspaceRoot` before binding workspace-owned services.
- Runtime hosts import the dedicated telemetry export and install it at their
  process boundary.

## Routing

- [Packages router](../AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run @rawr/core:lint`
- `bunx nx run @rawr/core:typecheck`
- `bunx nx run @rawr/core:test`
- `bunx nx run @rawr/core:build`
