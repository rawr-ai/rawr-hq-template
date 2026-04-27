# Practical Ontology Design For RAWR Core Architecture

## Purpose

This document defines practical ontology design rules for the RAWR core architecture ontology. The goal is not to extract every meaningful phrase from the architecture docs. The goal is to build a small, source-backed, reviewable model of architectural truth that can support:

- semantic drift detection across architecture documents;
- source-of-truth reconciliation when docs partially supersede each other;
- future Semantica ingestion and graph querying;
- eventual classifier/pre-classifier use for deterministic software production.

The key correction from the previous packet extraction is this: the graph must separate canonical architecture from extracted evidence. A 2,000-node evidence graph can be useful for review, but it is not the architecture ontology.

## Source Map

Primary RAWR sources:

- `RAWR_Canonical_Architecture_Spec.md` defines the durable core ontology, repository roots, stable semantic nouns, ownership laws, semantic direction, and stable architecture versus runtime realization.
- `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` defines runtime realization ownership, runtime lifecycle, runtime artifacts, schema ownership, and producer/consumer handoffs.
- `RAWR_Authoring_Classifier_System_Canonical_Spec.md` is future-goal context. It says the ontology must become operational: a classification decision should change allowed files, imports, required schemas, selected resources, provider coverage, app membership, generator recipes, verification gates, or runtime compiler expectations. It is not current source-of-truth for the core architecture.

External research anchors:

- [Semantica](https://github.com/Hawksight-AI/semantica) exposes semantic extraction, knowledge-graph construction, decision tracking, temporal validity, checkpoint diffing, SKOS vocabulary management, export surfaces, and an MCP server.
- [Graphiti](https://github.com/getzep/graphiti) models entities, facts/relationships, episodes as provenance, temporal validity windows, and prescribed versus learned ontology.
- [OWL 2](https://www.w3.org/TR/owl-primer/) is useful as a reference model for classes, properties, individuals, annotations, consistency, and inferred knowledge.
- [SHACL](https://www.w3.org/TR/shacl/) is useful as a reference model for graph shape validation: data graph plus shapes graph produces validation results.
- [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) is useful as an interchange model for snapshots and triples, not as a storage requirement.
- [SKOS](https://www.w3.org/TR/skos-primer/) is useful for controlled vocabulary, aliases, deprecated labels, broader/narrower concepts, and change notes.
- [PROV-O](https://www.w3.org/TR/prov-o/) is useful as a provenance vocabulary reference, especially `wasDerivedFrom`, `wasGeneratedBy`, `used`, and `wasAttributedTo`.

## Representation Recommendation

Use repo-local JSON/YAML ontology definitions as the primary authoring substrate for v1.

Do not start with full OWL/RDF as the canonical authoring format. OWL is powerful for formal reasoning, but this workflow needs fast iteration, source-aware review, curated identity, and operational predicates before it needs full semantic-web reasoning. OWL/SKOS/RDF should remain export and interoperability targets. SHACL should inform validation design, especially shape constraints, required fields, legal predicate signatures, and validation reports.

Semantica should be treated as an execution and query substrate, not as the source of truth. It can ingest curated seeds, evidence claims, and relation edges. The authoritative model should remain in tracked repo-local ontology files until we deliberately promote Semantica storage to an operational runtime.

Graphiti's most useful lesson is not automatic ontology creation. It is the separation between episodes and derived facts: raw inputs remain ground-truth episodes, while extracted facts carry provenance and temporal validity. RAWR should adopt that distinction even if it does not adopt Graphiti as a runtime.

Semantica-specific stance:

- Use Semantica for ingestion, evidence graph storage, semantic extraction, decision/diff experiments, provenance transport, checkpointing, and future MCP/CLI access.
- Use the repo-local ontology files and canonical specs as governing artifacts.
- Treat Semantica-generated entity labels, confidence scores, and relation extraction as evidence, not truth.
- Keep output shapes compatible with Semantica, RDF, SKOS, OWL, and SHACL where cheap, but do not adopt those formats as the governing authoring surface until there is a concrete operational requirement.
- Model Semantica MCP/server/Explorer surfaces as access paths, not as authority sources.

## Three-Layer Fact Model

### Canonical Ontology

The canonical ontology is the small reviewed source-of-truth graph. It should start around 50-150 entities.

Canonical entities are durable architecture nouns, runtime overlay nouns, locked laws, and allowed/forbidden construction rules that have operational consequences.

An entity earns canonical status only when it is:

- defined or directly entailed by the finalized architecture/runtime specs;
- stable across wording changes;
- important to ownership, construction, validation, realization, drift detection, or classifier decisions;
- assigned a stable ID;
- backed by source references;
- reviewed as architecture truth, not merely extracted text.

### Evidence Ledger

The evidence ledger is allowed to be large. It stores claims, extracted terms, source spans, confidence, source authority, prompt/model metadata, and unresolved contradictions.

Evidence ledger entries are not canonical facts. They are review material. They can support, challenge, or propose changes to the canonical ontology.

### Candidate Queue

The candidate queue contains terms or relations that may become canonical but are not yet accepted.

Candidates are useful when a new document introduces a plausible new decision, a stale doc contains a still-valid broad architecture concept, or extraction finds a repeated term that needs review. Candidates must not be used as authoritative classifier rules or semantic-diff baselines until promoted.

## Epistemic Rules

Precision is schema discipline, not certainty.

Every canonical fact, evidence claim, and candidate must carry:

- `source_refs`: path plus section or line/span when available;
- `authority`: source type and rank;
- `status`: `locked`, `candidate`, `deprecated`, `forbidden`, `tbd`, or `evidence-only`;
- `review_state`: `reviewed`, `needs-review`, `rejected`, or `superseded`;
- `epistemic_basis`: `explicit`, `directly-entailed`, `derived-rule`, `inferred`, or `speculative`;
- `operational_consequence`: the behavior affected by the fact, or `none` for evidence-only claims.
- `valid_from` / `valid_to`: when the architecture claim is true in the modeled domain, if known;
- `observed_at` / `extracted_at`: when the workflow learned or extracted it;
- `invalidated_by`: source, run, or decision that superseded the claim, if any.

Never collapse these fields:

- Source authority is not truth certainty.
- Model confidence is not permission.
- A frequent term is not a canonical entity.
- A canonical-ranked document can contain spans that are illustrative, reserved, or superseded.

## Entity Design Rules

Canonical core entities should be few and durable. Good candidates include:

- repository roots: `packages`, `resources`, `services`, `plugins`, `apps`;
- stable semantic nouns: `service`, `plugin`, `app`, `role`, `surface`, `resource`, `provider`, `entrypoint`, `repository`;
- runtime overlay nouns: `SDK derivation`, `runtime compiler`, `bootgraph`, `provisioning kernel`, `process runtime`, `surface adapter`, `harness`, `RuntimeAccess`, `RuntimeCatalog`;
- ownership/law entities: `Services own truth`, `Plugins project`, `Apps select`, `Runtime realizes`, `Diagnostics observe`;
- lifecycle phases: `definition`, `selection`, `derivation`, `compilation`, `provisioning`, `mounting`, `observation`;
- classifier-readiness concepts with enforcement consequences: `allowed move`, `forbidden pattern`, `required gate`, `rule pack`, `constraint graph`.

Do not promote these automatically:

- every file path;
- every package import;
- every example capability;
- every sentence noun phrase;
- every old term from under-revision documents;
- every inferred relation from LLM extraction.

## Relation Design Rules

Keep predicates controlled and operational. A relation belongs in the canonical graph only if it affects one of:

- ownership;
- legal dependency direction;
- construction/authoring;
- runtime realization;
- validation/gating;
- supersession/drift;
- classifier narrowing or rejection.

Recommended predicate families:

| Family | Predicates | Use |
| --- | --- | --- |
| Authority | `is_authority_for`, `supersedes`, `replaces`, `forbids`, `deprecates` | Document and terminology reconciliation |
| Ownership | `owns_truth`, `does_not_own`, `owns_schema`, `owns_selection`, `owns_projection` | Architecture law and drift checks |
| Construction | `supports`, `declares`, `implements`, `projects`, `selects`, `depends_on`, `requires` | Legal system assembly |
| Runtime | `derives`, `compiles_to`, `provisions`, `binds`, `lowers_to`, `mounts`, `observes`, `finalizes` | Runtime realization overlay |
| Validation | `validated_by`, `checked_by_gate`, `emits_diagnostic`, `requires_schema` | Operational enforcement |
| Classifier readiness | `narrows`, `allows_move`, `forbids_move`, `requires_gate`, `has_operational_consequence` | Future pre-classifier use |

Do not use `mentions` as a decision graph edge. Mentions are evidence/provenance signals only.

## Identity And Naming

Use stable IDs that reflect architectural meaning, not prose wording:

- `core.kind.service`
- `core.kind.plugin`
- `runtime.phase.provisioning`
- `runtime.artifact.compiled-process-plan`
- `law.ownership.services-own-truth`
- `forbidden.pattern.role-specific-public-start-verb`

Aliases belong on canonical entities only when the alias is accepted as a safe synonym or broad-language alias. Stale terms should be represented as `forbidden` or `deprecated` with `replaces` edges.

## Validation Rules

The ontology is decision-grade only if:

- every canonical entity has at least one source reference;
- every canonical relation connects canonical entities or an explicit overlay entity;
- every predicate is in the controlled predicate set;
- every relation has a direction that matters;
- every `forbidden` or `deprecated` term has a replacement, rejection reason, or explicit unresolved status;
- every classifier-readiness annotation has an operational consequence or is marked `tbd`;
- evidence-only claims cannot appear in canonical views without promotion.

Recommended validation gates:

- no canonical fact without source span and review status;
- no LLM-only extraction promoted directly to core;
- no predicate outside the approved registry unless candidate-scoped;
- no current fact with `valid_to` in the past;
- no replacement/supersession without old and new targets;
- no architecture entity whose only evidence is a loose mention.

## Why This Avoids Brittle Ontology

The ontology should be precise about schema and status, not overconfident about extracted meaning.

The brittle failure mode is:

```text
source prose -> LLM extraction -> thousands of entities -> high-confidence graph -> treated as architecture truth
```

The corrected workflow is:

```text
finalized specs -> curated canonical entities and laws -> reviewed source-of-truth ontology
new/old docs -> evidence ledger and candidate queue -> semantic diff -> promote/update/reject decisions
```

That lets Semantica help find drift and candidate changes without letting extraction manufacture certainty.
