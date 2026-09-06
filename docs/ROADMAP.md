# ROADMAP

## Current Focus

- Preserve the accepted Habitat platform, Rawr product and Marketplace content
  boundaries and the released SDK/CLI 0.6.0 runtime.
- Use the [accepted runtime specification](../openspec/specs/app-runtime-realization/spec.md)
  and [implementation checkpoint](projects/habitat-runtime-realignment/IMPLEMENTATION.md),
  not the completed change's historical execution queue.

## Near-Term Milestones

1. Each downstream owner can assess its released-package handoff and decide its
   own adoption scope. Consumer migration and product acceptance are not implied
   by platform tests or authorized by this roadmap.
2. Qualify additional capabilities only when their owner and actual dependencies
   are selected. The completed cold pipeline, managed lifetime, execution,
   mounting, observation and native Oclif/server/async/web hosts are the baseline,
   not a new implementation queue.

## Later (Parked / Future)

- Semantic ledger, temporal inquiry and later Rawr transfers have independent
  [capability gates](projects/habitat-runtime-realignment/deferred-capabilities.md),
  not a global Fluree prerequisite.
- Native agent/OpenShell and desktop hosts retain independent qualification
  and integration under D-4. Their authoring/executable faces remain part of
  the released runtime, not deferred empty interfaces.
- Persisted observability integrations and deployment tooling extend the
  runtime's identity, observation and cold-handoff contracts; neither is claimed
  complete by this runtime workstream.
- External workspace plugin source locking after external sources are introduced;
  predecessor product-specific state names are not target platform authority.
- Marketplace/library workflows beyond local-first baseline.
- LLM-judge security layer beyond deterministic checks.
