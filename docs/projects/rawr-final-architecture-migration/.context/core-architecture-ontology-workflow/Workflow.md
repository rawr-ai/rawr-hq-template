# Core Architecture Ontology Workflow Plan

## Summary

Build a practical ontology foundation for RAWR that is small enough to be decision-grade, operational enough to support future classifier/code-generation use, and structured enough to compare future documents against the source-of-truth specs without manufacturing certainty.

On implementation, the first action is to write this plan verbatim as:

`docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/Workflow.md`

The workflow produces three artifacts:

1. `ontology-design.md` — practical ontology design principles for RAWR and Semantica.
2. `ontology-system-design.md` — system design for source-of-truth ontology, semantic diff, document alignment, and future classifier use.
3. `cloudpro-core-ontology-draft-prompt.md` — prompt for CloudPro to draft the first core architecture ontology from the two finalized specs.

Primary finalized source specs:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Reference/future-goal spec:

- `/Users/mateicanavra/Documents/projects/RAWR/RAWR_Authoring_Classifier_System_Canonical_Spec.md`

## Phase Workflow

### Phase 0: Context Packet And Source Grounding

- Create the context packet directory and write `Workflow.md` before any other artifact.
- Confirm current Graphite/worktree state and decide whether to work on the existing Semantica branch or create a new stacked branch before writing durable files.
- Read the two finalized specs for core architecture entities, runtime realization entities, ownership laws, lifecycle, allowed/forbidden moves, and source authority boundaries.
- Read the authoring classifier spec only as future-goal context: operational classifier, rule packs, constraint graph, allowed/not-allowed moves, and deterministic generation pressure.
- Review the existing Semantica workbench as implementation substrate, but do not treat its current broad extraction ontology as authoritative.

Gate: source map is complete, and the implementation branch/worktree choice is explicit before artifact writing continues.

### Phase 1: Ontology Design Research

Use a small research team:

- Semantica researcher: official Semantica representation, MCP/CLI surfaces, ontology/diff/provenance capabilities.
- Temporal graph researcher: Graphiti/Zep temporal KG model, especially episodes, provenance, temporal validity, prescribed vs learned ontology.
- Semantic Web researcher: OWL, RDF/SKOS, SHACL, and where they help or overcomplicate this use case.
- Synthesis owner: Codex/default agent decides what principles apply to RAWR.

Initial source seed:

- [Semantica GitHub](https://github.com/Hawksight-AI/semantica) for MCP, semantic extraction, decision intelligence, SKOS, checkpoints/diff, provenance.
- [Graphiti GitHub](https://github.com/getzep/graphiti) and [Graphiti docs](https://help.getzep.com/graphiti/getting-started/welcome) for temporal graph, episodes, custom entity/edge types, and prescribed/learned ontology split.
- [OWL 2 Primer](https://www.w3.org/TR/owl-primer/) for class/property/reasoning concepts.
- [SHACL](https://www.w3.org/TR/shacl/) for validating graph shape and constraints.

Artifact: `ontology-design.md`

Required conclusions:

- Recommend a practical substrate: repo-local JSON/YAML ontology definitions and Semantica graph ingestion now; RDF/OWL/SKOS/SHACL only as export/validation inspiration unless a concrete Semantica need requires them.
- Separate three concepts clearly: canonical ontology, evidence ledger, and candidate queue.
- Treat precision as schema discipline, not certainty. All inferred facts must carry source, authority, confidence/epistemic status, and review state.
- Define when an entity earns “canonical core” status versus remaining a claim term, alias, candidate, or evidence-only node.
- Include rules for relationship design: only keep predicates that affect ownership, legality, construction, validation, realization, drift, or classifier decisions.

Gate: the design doc directly answers why the ontology should not become a brittle 2,000-node semantic dump.

### Phase 2: Ontology Workflow System Design

Use a second synthesis team:

- Core architecture modeler: maps stable architecture entities and relations from the canonical architecture spec.
- Runtime realization modeler: maps runtime lifecycle, artifacts, producer/consumer handoffs, ownership, and gates from the runtime spec.
- Classifier/operational modeler: uses the authoring classifier spec to ensure the ontology can later support allowed/not-allowed construction paths without prematurely locking speculative rules.
- Review owner: challenges whether each modeled layer is necessary now.

Artifact: `ontology-system-design.md`

Design decisions to lock:

- Model one primary ontology now: `core-architecture-ontology`.
- Add overlays, not separate peer ontologies, for:
  - `runtime-realization-overlay` where runtime details are operationally distinct but subordinate to core architecture.
  - `authority-and-document-overlay` for source document provenance, supersession, drift, and revision status.
  - `classifier-readiness-overlay` only as future-facing annotations: allowed move, forbidden move, required gate, TBD rule, operational consequence.
- Do not create a broad “meta/process ontology” yet. Model only the document authority metadata needed for semantic diff and revision decisions.
- Core graph target size should be curated and reviewable, roughly 50-150 canonical entities at first, not thousands.
- Evidence graph may be large, but it must not be presented as canonical architecture.
- The semantic diff workflow compares incoming documents against:
  - canonical core entities,
  - locked laws/replacement/forbidden rules,
  - runtime realization overlay,
  - authority/document overlay,
  - candidate queue for genuinely new decisions.

Gate: system design includes concrete acceptance criteria for “decision-grade graph” versus “evidence-only extraction.”

### Phase 3: CloudPro Prompt Artifact

Artifact: `cloudpro-core-ontology-draft-prompt.md`

The prompt must instruct CloudPro to produce a first draft of the core ontology using:

- the two finalized source specs,
- `ontology-design.md`,
- `ontology-system-design.md`,
- and the classifier spec as operational/future-goal context.

CloudPro output requirements:

- Produce a curated core ontology, not an exhaustive extracted graph.
- Include canonical entity IDs, labels, definitions, aliases, source references, layer, status, and operational consequence.
- Include controlled relation predicates only when they affect ownership, construction, realization, validation, replacement, prohibition, or semantic drift.
- Separate locked facts from TBD/to-be-revised/candidate facts.
- Explicitly flag uncertain or speculative classifier-related relationships instead of silently encoding them as canonical.
- Include a small seed set suitable for later Semantica ingestion and semantic diffing.

Gate: prompt is strict enough that CloudPro cannot return ontology theory, loose prose, or a giant uncurated concept list.

### Phase 4: Review And Readiness Handoff

- Run a self-review of all three artifacts against the earlier failure mode: overbroad extraction, fake certainty, too many entities, generic predicates, and source-authority confusion.
- Produce a short readiness note at the end of the context packet identifying:
  - what is ready for CloudPro,
  - what CloudPro must not decide,
  - what will be reviewed when CloudPro returns the ontology draft,
  - what existing Semantica scripts may need to be replaced later.
- Do not operationalize Semantica ingestion yet. That comes after CloudPro’s draft is reviewed.

Gate: artifacts are internally consistent and can be handed to CloudPro without extra verbal context.

## Agent Strategy

- Codex owns final synthesis, artifact quality, and deciding what survives into the plan.
- Use default agents for synthesis-sensitive work: Semantica fit, ontology design, system design, classifier implications.
- Use explorer agents only for raw collection: source excerpts, file paths, facts, official docs. Their conclusions are not trusted.
- Keep agent teams phase-scoped. Close or stop using a team after its phase to avoid stale assumptions carrying forward.
- Each agent receives the full frame: source-of-truth ontology, semantic diff, future classifier/pre-classifier use, operational grounding, no manufactured certainty, and curated core graph over broad extraction.

## Test And Acceptance Criteria

The implementation is complete when:

- `Workflow.md` exists and contains this plan.
- The three deliverable artifacts exist in the context packet directory.
- The ontology design doc gives concrete representation guidance for Semantica, Graphiti-style temporal/provenance lessons, and OWL/SHACL applicability without overcommitting to OWL.
- The system design doc clearly separates core ontology, runtime overlay, document authority overlay, candidate queue, and future classifier-readiness annotations.
- The CloudPro prompt is directly usable and names the exact input specs and output expectations.
- No source specs are modified.
- No generated Semantica state is treated as authoritative.
- Repo state is clean or committed through the repo’s Graphite workflow, depending on the implementation branch plan.

## Assumptions

- The artifacts should live under the RAWR target repository, not a separate repo.
- The existing Semantica workbench branch is useful background, but this workflow should correct its overbroad ontology direction rather than extend it blindly.
- The first real ontology should be curated from the finalized specs, not generated purely by broad LLM extraction.
- The authoring classifier spec is reference/future-goal material, not a third source of truth for current core architecture.
