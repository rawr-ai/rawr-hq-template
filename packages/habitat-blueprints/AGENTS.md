# Habitat Blueprints Package Router (`@habitat-ai/blueprints`)

## Purpose

- Transport selected generic Habitat blueprint data as a public, data-only npm
  artifact.

## Scope

- Applies to `packages/habitat-blueprints/**`.

## Boundaries

- The package owns its closed `habitat-pack.json` protocol and only blueprint
  members that have passed release-pack acceptance.
- It owns no evaluation, activation, instances, consumer wiring, or runtime.
- Do not add executable code, installers, repository-qualified data, host
  baselines, product paths, legacy v2 rules, or copied local `.habitat` state.

## Behavior

- Protocol 1 contains only `protocolVersion` and the ordered `blueprints`
  array.
- Keep `blueprints` empty until a v3 blueprint definition passes its complete
  release-pack acceptance gate.
- Package contents transport policy data; they do not make that policy active.

## Concepts

- A **policy pack** is a versioned data artifact containing accepted generic
  blueprint members. **Release-pack acceptance** is the gate that admits a
  member; package presence alone is not activation.

## Flow

- Accepted generic blueprint data enters the ordered manifest.
- The Habitat product resolves and evaluates an exact pack version.
- Consumers retain ownership of their instances and final wiring.

## Interfaces

- Public npm subpaths: `@habitat-ai/blueprints/habitat-pack.json`,
  `@habitat-ai/blueprints/blueprints/*`, and ordinary `package.json` metadata.
- No root export, executable entrypoint, installer, or runtime interface exists.

## Routing

- [[../AGENTS|Packages router]]
- [[../../services/habitat/AGENTS|Habitat service authority]]
- [[../../docs/projects/shared-habitat-substrate/CORPUS|Controlled Habitat transfer corpus]]

## Validation

- Parse `habitat-pack.json` as JSON and confirm its exact protocol-1 fields.
- Run `bunx nx show project @habitat-ai/blueprints --json` and confirm the package
  root, public npm status, and ownership tags.
