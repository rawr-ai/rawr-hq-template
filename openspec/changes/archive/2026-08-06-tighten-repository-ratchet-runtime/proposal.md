## Why

The repository ratchet is correct but unnecessarily cold: the shared Biome
target claims files Biome cannot inspect, while one native Nx acceptance test
repeats enough process startup to sit on a 60-second CI cliff. These are task
ownership and test-design defects, not reasons to replace Nx, Grit, Biome,
Effect, or Habitat.

## What Changes

- Make the shared Biome target own only Biome-supported source and its active
  formatter configuration.
- Ratchet that positive input contract through the existing Habitat Nx-workspace
  law.
- Preserve the native Nx invalidation contract with a smaller behavioral matrix
  that does not repeat equivalent graph startup.
- Record the measured boundary between cache precision and true-cold native
  Grit evaluation; add no runner, cache, daemon, or Rust implementation.

## Capabilities

### New Capabilities

- `repository-ratchet-runtime`: Defines precise source ownership and bounded
  native acceptance for the repository's foundational quality targets.

### Modified Capabilities

None.

## Impact

The change is limited to the shared Habitat Nx project, its existing
Nx-workspace source law, and Habitat CLI acceptance tests. It does not change
Habitat rule semantics, public CLI/SDK APIs, package publication, or product
runtime behavior.
