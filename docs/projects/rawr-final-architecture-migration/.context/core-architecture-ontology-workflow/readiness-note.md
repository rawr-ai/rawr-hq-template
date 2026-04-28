# Readiness Note

## Ready For CloudPro

The context packet is ready for CloudPro to draft a first curated core architecture ontology.

CloudPro should receive:

- `Workflow.md`
- `ontology-design.md`
- `ontology-system-design.md`
- `cloudpro-core-ontology-draft-prompt.md`
- `RAWR_Canonical_Architecture_Spec.md`
- `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `RAWR_Authoring_Classifier_System_Canonical_Spec.md` as future-goal context only

## CloudPro Must Not Decide

CloudPro must not:

- treat the authoring classifier spec as current core architecture authority;
- produce an exhaustive extraction graph;
- promote every repeated noun phrase into a canonical entity;
- encode speculative classifier rules as locked architecture facts;
- use `mentions` as a decision relation;
- conflate source authority with certainty;
- treat runtime realization as a second public semantic architecture.

## Review When CloudPro Returns

Review the draft for:

- entity count and curation quality;
- stable IDs and source references;
- controlled predicate discipline;
- relation direction and operational consequence;
- clear separation of canonical, candidate, deprecated, forbidden, TBD, and evidence-only;
- classifier-readiness annotations without premature rule locking;
- coverage of ownership laws, semantic direction, runtime lifecycle, and forbidden stale shapes.

## Semantica Workbench Implications

The existing Semantica workbench should probably be revised after the CloudPro draft is accepted.

Expected changes later:

- replace broad extraction-first behavior with curated seed-first ingestion;
- treat extracted claims as evidence ledger entries;
- add promotion flow from candidate queue to canonical ontology;
- validate predicate signatures and source references before graph ingestion;
- render canonical graph, evidence ledger, and candidate queue separately;
- prevent `.semantica/current` reports from presenting evidence-only nodes as architecture truth.

## Self-Review Against Prior Failure Mode

This packet explicitly corrects the earlier brittle shape:

- It defines a small canonical ontology rather than a broad 2,000-node graph.
- It separates canonical ontology, evidence ledger, and candidate queue.
- It treats precision as schema discipline, not certainty.
- It keeps classifier utility operational without turning speculative future rules into current truth.
- It scopes document metadata to source authority and semantic diff needs, not a broad meta/process ontology.
