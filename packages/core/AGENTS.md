# Core Package Router (`@habitat-ai/rawr-core`)

## Purpose

- Provide neutral workspace discovery and reusable telemetry installation
  across process entrypoints.

## Scope

- Applies to the workspace discovery and telemetry primitives in
  `packages/core/**`.

## Boundaries

- Owns neutral workspace discovery and the exported oRPC telemetry installer.
- Must not own CLI command lifecycle, parsing, result rendering,
  command-specific behavior, plugin lifecycle policy, workspace manifest
  semantics, or application composition.
- Workspace discovery may locate a workspace for bootstrap; it does not make a
  checkout the identity of an installed command.

## Behavior

- Core provides shared process support while leaving every command's lifecycle
  and domain operation, and every host's composition decision, with its owner.

## Concepts

- **Workspace discovery** locates bootstrap context without assigning product
  identity. **Telemetry installation** configures one compatible OpenTelemetry
  SDK instance at a process boundary.

## Flow

- Entrypoints use `findWorkspaceRoot` before binding workspace-owned services.
- Runtime hosts import the dedicated telemetry export and install it at their
  process boundary.

## Interfaces

- Entrypoints consume the workspace locator; process hosts consume the
  telemetry installer.

## Routing

- [Packages router](../AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-core:typecheck`
- `bunx nx run @habitat-ai/rawr-core:test`
- `bunx nx run @habitat-ai/rawr-core:build`
