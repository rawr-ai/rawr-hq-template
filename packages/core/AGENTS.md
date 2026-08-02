# Core Package Router (`@habitat-ai/rawr-core`)

## Purpose

- Standardize CLI bootstrap, results, workspace discovery, and telemetry
  installation across command and process entrypoints.

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

## Behavior

- Core normalizes shared command lifecycle and process support while leaving
  every command's domain operation and every host's composition decision with
  its owner.

## Concepts

- `RawrCommand` is the common CLI lifecycle base; `RawrResult` is the neutral
  command outcome; **workspace discovery** locates bootstrap context without
  assigning product identity.

## Flow

- CLI commands inherit `RawrCommand`, parse the shared base flags, and render a
  `RawrResult`.
- Entrypoints use `findWorkspaceRoot` before binding workspace-owned services.
- Runtime hosts import the dedicated telemetry export and install it at their
  process boundary.

## Interfaces

- Commands extend the CLI base and return common results; entrypoints consume
  the workspace locator; process hosts consume the telemetry installer.

## Routing

- [Packages router](../AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-core:typecheck`
- `bunx nx run @habitat-ai/rawr-core:test`
- `bunx nx run @habitat-ai/rawr-core:build`
