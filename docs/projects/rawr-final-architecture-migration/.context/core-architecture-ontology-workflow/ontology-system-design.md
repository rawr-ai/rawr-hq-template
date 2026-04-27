# Ontology-Driven Architecture Alignment System Design

## System Goal

The system should let RAWR maintain a source-of-truth architecture ontology and compare future documents against it. It should support two outcomes:

- update a new or stale document so it aligns with the verified ontology;
- promote genuinely new decisions back into the source-of-truth ontology after review.

Longer term, the same ontology should support an authoring classifier/pre-classifier that turns user intent into constrained, generator-ready software production plans. That future matters now because ontology categories must be operational, not merely descriptive.

## Layer Model

Use one primary ontology with overlays.

### 1. `core-architecture-ontology`

This is the canonical source-of-truth graph.

It models durable RAWR architecture concepts:

- repository roots and first-class kinds: package, resource, provider, service, plugin, app;
- stable semantic structure: app composition, role, surface, entrypoint, service boundary, repository;
- ownership laws: services own truth, plugins project, apps select, resources declare, providers implement, SDK derives, runtime realizes, harnesses mount, diagnostics observe;
- semantic direction and construction law: packages support, services own, plugins project, apps select;
- forbidden or deprecated target terms that must not reappear as architecture truth.

This layer should be curated, source-backed, and reviewable. It is the baseline for semantic drift detection.

### 2. `runtime-realization-overlay`

Runtime realization is operationally distinct but subordinate to the core architecture.

It models:

- lifecycle phases: definition, selection, derivation, compilation, provisioning, mounting, observation;
- runtime artifacts: normalized authoring graph, service binding plan, surface runtime plan, compiled process plan, provider dependency graph, bootgraph, managed runtime handle, process runtime, surface adapter, runtime catalog;
- handoffs: SDK derives, compiler compiles, bootgraph orders, provisioning acquires, process runtime binds, adapters lower, harnesses mount, diagnostics observe;
- schema ownership and runtime-carried schema boundaries.

This overlay prevents runtime details from becoming a second public semantic architecture while still making runtime realization enforceable.

### 3. `authority-and-document-overlay`

This is the minimal document authority layer needed for semantic diff and revision decisions.

It models:

- source document identity;
- authority rank and scope;
- source span provenance;
- supersession and replacement edges;
- canonical/candidate/deprecated/forbidden status;
- review state;
- drift findings.

This is not a broad process ontology. It should not model every workflow step, editor action, meeting, or planning process. It exists only to keep architecture truth traceable and revisable.

### 4. `classifier-readiness-overlay`

This is future-facing and must be conservative.

It models only annotations needed to preserve operational meaning:

- allowed move;
- forbidden move;
- required gate;
- enforcement consequence;
- rule-pack candidate;
- TBD or likely-to-change rule;
- operational consequence category.

No classifier rule should be canonical unless it derives from finalized architecture/runtime specs and changes an enforcement consequence: file placement, imports, schema requirements, resource/provider requirements, auth/trust posture, process/runtime shape, generator output, verification gate, diagnostic, or runtime compiler expectation.

## Canonical Entity Families

The first ontology draft should include a curated set, roughly 50-150 entities.

| Family | Examples | Modeling rule |
| --- | --- | --- |
| Architecture roots | `packages`, `resources`, `services`, `plugins`, `apps` | Canonical core |
| Semantic kinds | `package`, `resource`, `provider`, `service`, `plugin`, `app`, `role`, `surface` | Canonical core |
| App structure | `app composition`, `manifest`, `entrypoint`, `runtime profile`, `provider selection` | Canonical core with aliases where safe |
| Service structure | `service boundary`, `deps`, `scope`, `config`, `invocation`, `provided`, `repository` | Canonical core |
| Projection structure | `plugin factory`, `plugin definition`, `useService`, role/surface/capability lane | Canonical core |
| Runtime lifecycle | `definition`, `selection`, `derivation`, `compilation`, `provisioning`, `mounting`, `observation` | Runtime overlay |
| Runtime machinery | `SDK derivation`, `runtime compiler`, `bootgraph`, `provisioning kernel`, `process runtime`, `surface adapter`, `harness`, `diagnostics` | Runtime overlay |
| Runtime artifacts | `NormalizedAuthoringGraph`, `CompiledProcessPlan`, `Bootgraph`, `RuntimeAccess`, `RuntimeCatalog` | Runtime overlay |
| Laws | ownership law, semantic direction, service boundary first, shared infrastructure is not ownership | Canonical core or runtime overlay |
| Forbidden patterns | role-specific public start verbs, plugin `exposure`/`visibility`/projection reclassification, shared repository across services | Authority overlay plus classifier-readiness |
| Gates | source references, relation endpoint resolution, controlled predicates, forbidden terms not canonical, review promotion required | Validation/design layer |

## Controlled Predicate Set

The ontology should prefer a small predicate set with explicit direction.

Core predicates:

- `owns_truth`
- `owns_schema`
- `owns_selection`
- `owns_projection`
- `declares`
- `implements`
- `projects`
- `selects`
- `supports`
- `depends_on`
- `requires`
- `does_not_own`
- `separate_from`

Runtime predicates:

- `derives`
- `compiles_to`
- `orders`
- `provisions`
- `binds`
- `lowers_to`
- `mounts`
- `observes`
- `finalizes`
- `produces`
- `consumes`

Authority and drift predicates:

- `is_authority_for`
- `supersedes`
- `replaces`
- `forbids`
- `deprecates`
- `conflicts_with`
- `needs_review`

Classifier-readiness predicates:

- `allows_move`
- `forbids_move`
- `narrows`
- `requires_gate`
- `checked_by_gate`
- `has_operational_consequence`

`mentions` is never a decision predicate. If needed, it belongs in evidence metadata.

## Semantic Diff Workflow

### Build Source-Of-Truth Baseline

1. Curate canonical entities and relations from the finalized architecture and runtime specs.
2. Store them in tracked ontology seed files.
3. Validate source references, predicate signatures, relation directions, and status fields.
4. Ingest into Semantica only after the curated ontology is reviewed.

### Compare A New Or Old Document

1. Parse the document into evidence claims with source spans.
2. Resolve terms against canonical entities and aliases.
3. Classify each claim as aligned, stale, forbidden, candidate-new, ambiguous, or outside-scope.
4. Produce a semantic diff report:
   - canonical matches;
   - stale terms and replacement suggestions;
   - conflicts with core laws;
   - candidate new entities/relations;
   - source spans requiring document edits;
   - source-of-truth update candidates.

### Decide Outcome

For each finding:

- `update-document`: the incoming document conflicts with the source-of-truth ontology.
- `promote-candidate`: the incoming document contains a genuine new accepted decision.
- `reject-candidate`: the finding is a loose phrase, false ontology, or unsupported inference.
- `defer-tbd`: the concept may matter but lacks source authority or operational consequence.

## Decision-Grade Versus Evidence-Only

Decision-grade facts:

- are curated from finalized specs or explicitly promoted;
- have stable IDs;
- use controlled predicates;
- carry source references;
- have operational consequence;
- have reviewed status;
- can be used as semantic-diff baseline.

Evidence-only facts:

- are extracted from prose;
- may have confidence but not authority;
- may suggest candidates;
- may support review;
- must not become baseline architecture without promotion.

## Future Classifier Link

The authoring classifier spec changes the ontology design pressure:

- categories must narrow legal construction space;
- labels without enforcement consequences are false ontology;
- confidence is not permission;
- rule packs are derived from canonical specs, not independent authority;
- every allowed/not-allowed path should leave a trace explaining what was ruled out.

Therefore, the core ontology should include operational consequence fields now, even if classifier rule packs are not implemented yet.

Recommended annotation shape:

```yaml
classifier_readiness:
  status: locked | candidate | tbd | not-applicable
  operational_consequence:
    - file-placement
    - import-boundary
    - sdk-derivation
    - runtime-compiler
    - generator-output
    - schema-requirement
    - provider-coverage
    - verification-gate
    - diagnostic
  notes: string
```

The classifier's future constraint graph is not the repository graph and not the canonical architecture graph. It is a working legal-space graph derived from the canonical ontology, current intent, existing repo facts, and rule packs. It should narrow as classification proceeds and record rejected alternatives. Re-expansion requires explicit reclassification and trace entries.

TBD areas should become reserved boundaries, not silent gaps. A reserved boundary should name an owner, hook, required input/output shape, diagnostic expectation, enforcement placeholder, and trigger for a dedicated spec.

### Consequence Matrix

CloudPro should preserve this matrix shape in the ontology draft:

| Ontology category | Required consequence |
| --- | --- |
| Architecture kind | Ownership or legal dependency direction |
| Runtime artifact | Producer, consumer, lifecycle phase, and validation gate |
| Projection/surface | Role/surface/capability lane and builder/topology classification |
| Resource/provider/profile | Contract, implementation, selection, lifetime, and provider coverage |
| Forbidden pattern | Rejected construction path and replacement or diagnostic |
| Classifier-readiness annotation | Allowed/forbidden move, required gate, or enforcement consequence |

## What Not To Model Yet

Do not create:

- a broad document editing workflow ontology;
- a general project-management ontology;
- a complete authoring classifier ontology;
- generated-code implementation details;
- every file path or code symbol;
- every term discovered by LLM extraction;
- separate peer ontologies for every subsystem.

Use overlays only where a concept is operationally distinct and needed for diff, validation, or future classifier use.

## Acceptance Criteria

The system design is good enough for CloudPro when:

- it makes the core ontology smaller than the evidence graph;
- it prevents source-authority and certainty from being conflated;
- it preserves runtime realization as an overlay, not a second public architecture;
- it keeps document metadata minimal and source-backed;
- it allows classifier-readiness annotations without turning speculative rules canonical;
- it gives CloudPro enough structure to draft a first ontology without producing a generic taxonomy.
