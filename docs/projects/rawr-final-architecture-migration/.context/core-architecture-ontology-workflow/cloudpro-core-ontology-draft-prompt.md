# CloudPro Prompt: Draft RAWR Core Architecture Ontology

You are drafting the first curated RAWR core architecture ontology.

This is not an extraction task. Do not produce a giant list of every noun phrase in the documents. Produce a small, operational, source-backed ontology suitable for later Semantica ingestion, semantic diffing, and future classifier/pre-classifier use.

## Inputs

Use these finalized source-of-truth specs:

1. `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
2. `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Use these design docs:

1. `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/ontology-design.md`
2. `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/ontology-system-design.md`

Use this future-goal reference spec only for operational/classifier pressure, not as a current source-of-truth authority:

1. `/Users/mateicanavra/Documents/projects/RAWR/RAWR_Authoring_Classifier_System_Canonical_Spec.md`

## Objective

Produce a first draft of `core-architecture-ontology`.

The ontology must model RAWR architecture truth in a way that can later support:

- semantic drift detection across documents;
- authority and supersession review;
- deterministic generation/classifier rule-pack derivation;
- allowed versus not-allowed construction paths;
- operational validation through gates, diagnostics, runtime compiler expectations, and import/file-boundary constraints.

## Critical Requirements

### Keep The Core Curated

Target roughly 50-150 canonical entities.

Do not include:

- every extracted concept;
- every example capability;
- every file path;
- every package import;
- every prose claim;
- every runtime artifact unless it participates in a meaningful handoff.

If a term seems relevant but not canonical, put it in `candidate_entities`, `aliases`, or `evidence_notes`, not the canonical entity list.

### Separate Truth From Evidence

Use these statuses:

- `locked`: explicitly source-backed current architecture truth.
- `candidate`: plausible but not accepted as core truth.
- `deprecated`: old language that should be replaced.
- `forbidden`: language or construction path that must not survive as target architecture.
- `tbd`: may matter, but not settled.
- `evidence-only`: source claim or mention, not ontology truth.

Do not encode uncertain classifier implications as locked facts. Mark them `candidate` or `tbd`.

### Make It Operational

Every canonical entity or relation should have at least one operational consequence, or a clear reason it is necessary for source-of-truth alignment.

Operational consequences include:

- file placement;
- import boundary;
- ownership;
- allowed dependency direction;
- required schema;
- resource/provider requirement;
- app/profile/entrypoint selection;
- runtime compiler expectation;
- generator output;
- verification gate;
- diagnostic;
- document drift detection.

A category that changes none of these is probably a label, not an ontology entity.

### Preserve Layer Boundaries

Model one primary ontology:

- `core-architecture-ontology`

Add overlays, not peer ontologies:

- `runtime-realization-overlay`
- `authority-and-document-overlay`
- `classifier-readiness-overlay`

Runtime realization is operationally distinct but subordinate to core architecture. It must not become a second public semantic architecture.

Document authority metadata should be minimal: source document, source span, authority rank/scope, supersession/replacement status, drift/review status.

Classifier-readiness annotations should preserve operational meaning without prematurely locking speculative rules.

## Expected Output

Return a Markdown document with these sections.

### 1. Modeling Summary

Briefly explain:

- what is in the core ontology;
- what is in overlays;
- what is deliberately excluded;
- how uncertainty is represented.

### 2. Canonical Entity Types

Define the entity types used in the ontology.

For each type include:

- `id`
- `description`
- whether it belongs to core or overlay
- promotion rule

### 3. Controlled Predicates

Define a controlled predicate set.

For each predicate include:

- `id`
- `domain`
- `range`
- direction
- operational meaning
- whether it is allowed in the canonical graph or only in evidence/candidate review

Use only predicates that affect ownership, legality, construction, validation, realization, drift, or classifier decisions.

Do not use `mentions` as a decision predicate.

### 3.5 Operational Consequence Matrix

Provide a concise matrix:

```yaml
- category: ArchitectureKind
  required_consequence:
    - ownership
    - legal-dependency-direction
  classifier_use: "Narrows legal owner and allowed construction path."
```

Cover at least:

- architecture kinds;
- runtime artifacts;
- lifecycle phases;
- projection/surface concepts;
- resource/provider/profile concepts;
- forbidden patterns;
- validation gates;
- classifier-readiness annotations.

### 4. Canonical Entity Seed

Provide a curated seed list.

Each entity must use this shape:

```yaml
- id: core.kind.service
  label: service
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "A semantic capability boundary."
  aliases: []
  source_refs:
    - path: docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns"
  operational_consequence:
    - ownership
    - import-boundary
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - ownership
      - generator-target
      - verification-gate
  notes: ""
```

Include at minimum entity families for:

- architecture roots;
- stable semantic nouns;
- app composition and entrypoint;
- service boundary lanes;
- plugin projection/lane concepts;
- resource/provider/profile concepts;
- runtime lifecycle phases;
- runtime realization machinery and artifacts;
- ownership laws;
- forbidden/deprecated patterns;
- validation gates.

### 5. Canonical Relation Seed

Provide controlled canonical relations.

Each relation must use this shape:

```yaml
- id: rel.services-own-truth
  subject: core.kind.service
  predicate: owns_truth
  object: core.boundary.semantic-capability-truth
  layer: core
  status: locked
  source_refs:
    - path: docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law"
  operational_consequence:
    - ownership
    - semantic-drift-detection
    - classifier-narrowing
```

Include relations for:

- ownership law;
- semantic direction;
- resource/provider declaration and implementation;
- service/plugin/app construction;
- app composition and entrypoint selection;
- runtime lifecycle order and handoffs;
- forbidden/deprecated replacement rules where explicit;
- document authority requirements only where needed for future semantic diff.

### 6. Candidate Queue

List terms or relations that might matter but should not be canonical yet.

For each candidate include:

- why it might matter;
- what source span suggests it;
- what decision is required before promotion;
- whether it has classifier relevance.

For unresolved operational areas, use a reserved-boundary shape:

```yaml
- id: candidate.reserved.<slug>
  label: ""
  owner: ""
  hook: ""
  required_input_output: ""
  diagnostic_expectation: ""
  enforcement_placeholder: ""
  promotion_trigger: ""
```

### 7. Explicit Exclusions

List high-risk false ontology categories and why they should not be canonical.

Include examples such as:

- dashboard-service when it only means UI code;
- workflow-service when it only registers a durable execution projection;
- shared-repository across unrelated services;
- plugin exposure/visibility fields that reclassify projection status;
- role-specific public start verbs.

### 8. Review Checklist

Include a checklist the next agent can use to validate the draft:

- canonical graph is roughly 50-150 entities;
- every canonical entity has source refs;
- every canonical relation uses a controlled predicate;
- every relation direction matters;
- uncertainty is marked as candidate/TBD/evidence-only;
- classifier-readiness annotations have operational consequences;
- no source-authority claim is confused with certainty;
- no evidence-only term is silently promoted.
- every classifier-relevant category has an enforcement consequence;
- any unresolved classifier implication is labeled `candidate`, `tbd`, or `reserved`, not `locked`.

## Tone And Output Constraints

Be precise and concrete. Use architecture terms from the finalized specs. Do not write generic ontology theory. Do not invent rules that are not sourced or directly entailed. If something is promising but unsettled, label it `candidate` or `tbd`.
