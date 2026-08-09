# Phase 2 Carry-Forward Risks

## HQ Ops Internal Shape Watch Item

Phase 1 left `services/hq-ops` in the correct external authority shape, but not in a clearly canonical internal module shape.

That means:

- do not assume a future HQ Ops runtime-verification failure is caused by the new runtime substrate
- first compare the HQ Ops internals to the cleaner `services/example-todo` service package
- treat fake modules, shims, helper buckets, or workaround-heavy internals as plausible root causes until disproven

Primary comparison surfaces:

- `services/hq-ops/src/service/modules/*`
- `services/example-todo/src/service/modules/*`
- `docs/projects/rawr-final-architecture-migration/.context/M1-execution/notes/HQ-OPS-service-shape-followup.md`
- `docs/projects/orpc-ingest-domain-packages/guidance.md`

Additional reminder:

- no repo-local service-package `decisions.md` was located during Phase 1 closeout
- if a later slice depends on one, locate it explicitly instead of assuming it exists
