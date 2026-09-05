# Runtime Observation

## Purpose
Implement the definition-owned observation port and non-authorizing diagnostic,
telemetry, topology and catalog projections. This is a private package-less Nx owner.

## Boundaries
The sole private dependency is runtime-definition. Never import SDK, compiler,
derivation, bootgraph, substrate, process-runtime, harnesses, mounting, resources
or providers. SDK composition maps selected topology into the closed seed DTO.
Effect data/helper/type imports are not prohibited by this boundary.
No acquisition, execution, selection, mounting, stop, retry queue or control plane
belongs here. Project only fixed admitted event fields; never serialize raw
errors, config, paths, callbacks, schema methods or live values. Unobserved
histories are not successful lifecycle evidence. Snapshot and retention state
are process-local, detached, immutable and bounded.
Explicit typed telemetry preserves authored JSON metadata; its caller owns
semantic redaction. Omitted annotations never project their value, and product
results/errors are never appended to telemetry records.

## Validation
Run owner TypeScript, behavior tests and disposable Nx cache proofs. Native
source-law acceptance belongs in the uncached repository Habitat target.
