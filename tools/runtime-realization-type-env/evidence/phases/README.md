# Runtime Realization Phase Containers

This directory keeps phase-level coordination artifacts visible without leaving
closed phase documents at evidence root.

Phase containers are not runtime authority and not proof authority. They explain
how a phase was framed, coordinated, and closed. Current proof status still
lives in the manifest, diagnostic, spine map, source, fixtures, tests, and
recorded gates.

Mental rule:

- Root evidence files are active authority/status, long-running maps, reusable
  workflow, or current handoff pointers.
- `phases/<phase>/` holds closed or phase-scoped coordination artifacts.
- `workstreams/` remains the chronological report ledger.
- `_archive/` holds historical provenance that should not be required reading
  unless an active workstream explicitly reopens it.

Current phase containers:

- `phase-two/`: closed Phase Two coordination artifacts.
- `phase-three/`: draft DRA re-grounding material for the expected next
  program workstream. It is not an approved Phase Three plan, runtime
  authority, or proof authority.
