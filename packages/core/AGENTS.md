# Transitional Core Package Router (`@habitat-ai/rawr-core`)

## Purpose

- Retain the predecessor telemetry installer until its Habitat-owned readers
  move in task 3.3.

## Scope

- Applies to the remaining telemetry source in `packages/core/**`.

## Boundaries

- Temporarily owns only the exported oRPC telemetry installer.
- Must not own CLI command lifecycle, parsing, result rendering,
  command-specific behavior, plugin lifecycle policy, workspace manifest
  semantics, or application composition.
- Must not restore workspace discovery or become a permanent Habitat SDK owner.

## Behavior

- The package preserves the existing telemetry behavior only until task 3.3
  moves its final readers and deletes this mixed predecessor.

## Concepts

- **Telemetry installation** configures one compatible OpenTelemetry SDK
  instance at a process boundary.

## Flow

- Runtime hosts may import the dedicated telemetry export and install it at their
  process boundary.

## Interfaces

- Process hosts consume the telemetry installer through its qualified subpath.

## Routing

- [Packages router](../AGENTS.md)
- [Repository router](../../AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-core:typecheck`
- `bunx nx run @habitat-ai/rawr-core:test`
- `bunx nx run @habitat-ai/rawr-core:build`
