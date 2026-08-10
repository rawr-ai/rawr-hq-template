# Runtime Definition Mental Model

## Meaning

The runtime-definition project owns cold vocabulary. It lets semantic owners
describe apps, services, projections, resources, providers, and executable
Effect programs without doing any live work.

## Boundaries

- One package-less Nx project owns all definition modules.
- The sole private dependency is runtime-schema. Nx proves that edge.
- Imports construct no client, provider, timer, native host, managed runtime,
  process, or global registration.
- Process catalogs are immutable app data, never process kinds or supervisors.
- Launch identity is supplied once, copied, and frozen; it carries no placement
  or lineage-selection authority.
- Runtime observation records are bounded upstream input. Their port cannot
  select, acquire, mount, stop, or project downstream read models.
- Live start, derivation, compilation, provisioning, harnesses, observation
  projection, and mounting belong to their later runtime owners.

## Proof

Habitat owns the exact positive project topology. Nx owns the dependency and
task graph. TypeScript owns public capability visibility and inference. Owner
tests prove cold authoring behavior and cache restoration/invalidation.
