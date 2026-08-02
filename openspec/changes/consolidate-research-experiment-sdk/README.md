# Research Experiment Platform Capability

This OpenSpec change is the sole shared design, migration, and coordination
record for the research-experiment capability. The directory name records its
SDK-shaped history; it does not name the target product topology. The oRPC and
Inngest study owners retain their cases, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + base | Phase | Active writer | Claimed slice | Review input | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | RAWR HQ-Template `223835fccedcb80523b761c571130852bdb106a2` | DESIGN | none after freeze | Docs/OpenSpec only: reframe the preserved SDK lineage as one HQ-composed research-experiment service, one CLI projection, and generic resources/providers | The immutable docs-only child of `223835fc`; exact SHA is supplied in the review handoff | Complete activated Habitat service packet and production app-profile/runtime provisioning are not canonical | Obtain exact Inngest review; then hold source until both prerequisites are named and canonical |

## Record

- [[proposal]] states the product change and nonclaims.
- [[design]] defines the system map, ontology, alternatives, flows, state,
  failure model, deletion ledger, prerequisites, and slice plan.
- [[tasks]] records the independently green transition sequence.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The blackboard is coordination text only. It is not service state, runtime
selection, provider configuration, a lease, or a workflow engine.
