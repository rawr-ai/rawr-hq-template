# Research Experiment Platform Capability

This OpenSpec change is the sole shared design, migration, and coordination
record for the research-experiment capability. The directory name records its
SDK-shaped history; it does not name the target product topology. The oRPC and
Inngest study owners retain their cases, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + base | Phase | Active writer | Claimed slice | Review input | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | RAWR HQ-Template `5f99837f5244e34be4eb58db5ec3e3bfefd7c88f` | DESIGN | none after freeze | Docs-only counterpart correction: recovery namespaces, terminal-before-release, evaluator adoption, exact external-runner disposition, operation falsifier, and Effect-oRPC direction | The immutable docs-only child of `5f99837f`; exact SHA is supplied in the review handoff | Complete activated Habitat service packet and production app-profile/runtime provisioning are not canonical | Obtain exact Inngest review; then hold source until both prerequisites are named and canonical |

## Record

- [[proposal]] states the product change and nonclaims.
- [[design]] defines the system map, ontology, alternatives, flows, state,
  failure model, deletion ledger, prerequisites, and slice plan.
- [[tasks]] records the independently green transition sequence.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The blackboard is coordination text only. It is not service state, runtime
selection, provider configuration, a lease, or a workflow engine.
