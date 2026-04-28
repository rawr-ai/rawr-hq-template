# core-architecture-ontology — first curated draft

## 1. Modeling Summary

This draft models RAWR’s current architecture truth as one primary ontology, `core-architecture-ontology`, with three overlays: `runtime-realization-overlay`, `authority-and-document-overlay`, and `classifier-readiness-overlay`. The design follows the ontology workflow instruction to keep the canonical graph small, reviewed, source-backed, and operational, rather than turning extracted prose into a giant evidence graph. The design docs explicitly distinguish the canonical ontology from evidence and candidate queues, and require source references, status, review state, epistemic basis, and operational consequences for decision-grade facts. fileciteturn1file0

The core ontology contains durable RAWR architecture concepts: repository roots, first-class architecture kinds, app composition, service boundary lanes, projection lanes, resource/provider/profile concepts, ownership laws, construction direction, and forbidden target patterns. The canonical architecture spec defines the five canonical repository roots, stable semantic nouns, resource/boundary nouns, service lanes, and runtime nouns that this seed uses. fileciteturn1file7

The `runtime-realization-overlay` contains lifecycle phases, runtime machinery, runtime artifacts, producer/consumer handoffs, diagnostics, runtime compiler expectations, and import/file-boundary enforcement. Runtime realization is modeled as subordinate to the core architecture, not as a second public semantic architecture. The runtime spec is explicit that runtime realization turns selected app composition into one started process per `startApp(...)`, owns the bridge from selected declarations to running software, and does not own service truth, plugin meaning, app identity, deployment placement, or surface semantics. fileciteturn1file5

The `authority-and-document-overlay` is intentionally minimal. It tracks source document identity, source span, authority scope, supersession/replacement, status, and drift/review state. It does not model a broad editing workflow, planning process, or every historical document claim.

The `classifier-readiness-overlay` preserves future classifier pressure without turning speculative rules into locked architecture. The classifier spec says operational classification maps intent into RAWR’s ontology and that useful categories must change allowed files, imports, schemas, resources, provider coverage, auth posture, plugin surfaces, app membership, generator recipes, verification gates, or runtime compiler expectations. It also warns that a category with no enforcement consequence is only a label. fileciteturn2file1

Deliberately excluded: every file path, every package import, example capabilities, deployment-specific nouns not in the requested source-of-truth pair, workstream/tension/foundry/export nouns, vendor names except where already entailed by runtime handoff boundaries, and any prose claim that does not change ownership, legality, construction, validation, realization, drift, or classifier narrowing.

Uncertainty is represented through `status`: `locked`, `candidate`, `deprecated`, `forbidden`, `tbd`, and `evidence-only`. Source authority is not treated as certainty. A locked source can still contain illustrative examples, reserved boundaries, or stale terms. Candidate and reserved-boundary items may influence review, but not semantic-diff baselines or classifier rule packs until promoted.

---

## 2. Canonical Entity Types

```yaml
- id: type.ArchitectureRoot
  description: "A top-level repository root with architectural meaning."
  layer: core
  promotion_rule: "Promote only when the canonical architecture spec defines the root and assigns ownership or dependency consequences."

- id: type.ArchitectureKind
  description: "A first-class RAWR kind such as package, resource, provider, service, plugin, app, role, surface, or entrypoint."
  layer: core
  promotion_rule: "Promote only when the kind is stable across source wording and affects ownership, legal dependency direction, construction, or semantic drift."

- id: type.SemanticBoundary
  description: "A boundary that owns or constrains semantic capability truth, projection, selection, or support."
  layer: core
  promotion_rule: "Promote only when the boundary changes owner, import legality, file placement, or runtime construction."

- id: type.AppStructure
  description: "App-owned selection, profile, membership, and process-shape concepts."
  layer: core
  promotion_rule: "Promote when the concept constrains app composition, selected plugin membership, runtime profile selection, or entrypoint behavior."

- id: type.ServiceBoundaryLane
  description: "A canonical service context lane used by service binding and runtime realization."
  layer: core
  promotion_rule: "Promote only when lane participation changes binding, caching, invocation, schema ownership, or caller/harness behavior."

- id: type.ProjectionLane
  description: "A role/surface/capability lane where a plugin projects service truth or host capability."
  layer: core
  promotion_rule: "Promote when topology plus builder classification changes legal plugin placement, app membership, surface mounting, or diagnostics."

- id: type.ResourceProviderProfileConcept
  description: "A resource, provider, requirement, lifetime, provider selection, or runtime profile concept."
  layer: core
  promotion_rule: "Promote when it constrains resource contract declaration, provider implementation, profile selection, provider coverage, or provisioning."

- id: type.ConstructionLaw
  description: "A locked architecture law that constrains ownership, dependency direction, assembly, or construction order."
  layer: core
  promotion_rule: "Promote when directly stated or directly entailed by finalized architecture/runtime specs and enforceable through drift review or gates."

- id: type.ForbiddenPattern
  description: "A construction path, name, field, import, or ownership collapse that must not survive as target architecture."
  layer: core
  promotion_rule: "Promote when a finalized spec explicitly forbids the pattern or directly defines a replacement."

- id: type.DeprecatedTerm
  description: "Old or broad language that should be replaced by a canonical term."
  layer: authority-and-document-overlay
  promotion_rule: "Promote only with a replacement edge and source-backed reason."

- id: type.RuntimePhase
  description: "A phase in runtime realization from definition through observation."
  layer: runtime-realization-overlay
  promotion_rule: "Promote when phase order, producer, consumer, or validation gate is defined by runtime sources."

- id: type.RuntimeMachinery
  description: "Runtime component that participates in derivation, compilation, provisioning, mounting, observation, or finalization."
  layer: runtime-realization-overlay
  promotion_rule: "Promote when it has a named owner, producer/consumer boundary, diagnostic, or validation gate."

- id: type.RuntimeArtifact
  description: "Derived or compiled artifact used in runtime realization handoffs."
  layer: runtime-realization-overlay
  promotion_rule: "Promote when the artifact is produced and consumed by named lifecycle machinery."

- id: type.ValidationGate
  description: "A deterministic gate, diagnostic, or shape validation needed to keep architecture facts legal."
  layer: runtime-realization-overlay
  promotion_rule: "Promote when it checks source refs, relation signatures, import boundaries, provider coverage, runtime compiler expectations, or forbidden patterns."

- id: type.DocumentAuthority
  description: "A source document with authority rank, scope, and supersession posture."
  layer: authority-and-document-overlay
  promotion_rule: "Promote only for documents that affect source-of-truth baseline, semantic diff, or review decisions."

- id: type.SourceSpan
  description: "A source-backed evidence pointer to a document section or span."
  layer: authority-and-document-overlay
  promotion_rule: "Promote when needed to trace a canonical entity/relation or resolve drift."

- id: type.ReviewFinding
  description: "A semantic diff or review finding such as aligned, stale, conflict, candidate-new, forbidden, ambiguous, or outside-scope."
  layer: authority-and-document-overlay
  promotion_rule: "Promote only as review metadata, not core architecture truth."

- id: type.ClassifierReadinessAnnotation
  description: "Future-facing annotation describing allowed/forbidden moves, gates, operational consequences, or rule-pack candidacy."
  layer: classifier-readiness-overlay
  promotion_rule: "Promote to locked only when derived from finalized specs and tied to enforcement consequence."

- id: type.ReservedBoundary
  description: "A named unresolved operational boundary with owner, hook, I/O, diagnostic expectation, enforcement placeholder, and promotion trigger."
  layer: classifier-readiness-overlay
  promotion_rule: "Promote when a dedicated spec or canonical decision resolves the boundary."
```

---

## 3. Controlled Predicates

Only these predicates are decision predicates. `mentions` is explicitly excluded from canonical graph decisions and belongs only in evidence metadata. The design docs require controlled predicates with meaningful direction and operational consequence. fileciteturn1file15

```yaml
- id: owns_truth
  domain: ArchitectureKind|SemanticBoundary
  range: SemanticBoundary
  direction: "owner -> truth"
  operational_meaning: "Determines semantic truth owner, write authority, schema/repository ownership, and drift baseline."
  allowed_in: canonical_graph

- id: owns_schema
  domain: ArchitectureKind|SemanticBoundary
  range: SemanticBoundary|RuntimeArtifact
  direction: "owner -> schema-bearing boundary"
  operational_meaning: "Determines who owns schema changes, migrations, runtime-carried schema, and validation."
  allowed_in: canonical_graph

- id: owns_selection
  domain: ArchitectureKind|AppStructure
  range: AppStructure|ResourceProviderProfileConcept|ProjectionLane
  direction: "selection owner -> selected thing"
  operational_meaning: "Determines app membership, provider/profile selection, process shape, and entrypoint constraints."
  allowed_in: canonical_graph

- id: owns_projection
  domain: ArchitectureKind|ProjectionLane
  range: ProjectionLane
  direction: "projection owner -> projected lane"
  operational_meaning: "Determines plugin lane ownership and prevents projections from becoming truth owners."
  allowed_in: canonical_graph

- id: declares
  domain: ArchitectureKind|ServiceBoundaryLane|ResourceProviderProfileConcept|ProjectionLane
  range: ResourceProviderProfileConcept|RuntimeArtifact|ServiceBoundaryLane
  direction: "declarer -> declared requirement/schema/fact"
  operational_meaning: "Creates import-safe declarations without acquiring live runtime values."
  allowed_in: canonical_graph

- id: implements
  domain: ArchitectureKind|ResourceProviderProfileConcept
  range: ResourceProviderProfileConcept
  direction: "implementation -> contract"
  operational_meaning: "Separates provider implementation from resource identity and semantic truth."
  allowed_in: canonical_graph

- id: projects
  domain: ProjectionLane|ArchitectureKind
  range: ArchitectureKind|SemanticBoundary
  direction: "projection -> projected truth/capability"
  operational_meaning: "Determines plugin projection path and forbids ownership transfer."
  allowed_in: canonical_graph

- id: selects
  domain: AppStructure|ArchitectureKind
  range: ProjectionLane|ResourceProviderProfileConcept|AppStructure
  direction: "selector -> selected artifact"
  operational_meaning: "Determines app composition, runtime profile, provider selection, and entrypoint process selection."
  allowed_in: canonical_graph

- id: supports
  domain: ArchitectureKind|ArchitectureRoot
  range: ArchitectureKind|RuntimeMachinery
  direction: "supporting kind -> supported kind"
  operational_meaning: "Allows packages/support matter to aid other kinds without owning truth."
  allowed_in: canonical_graph

- id: depends_on
  domain: ArchitectureKind|ProjectionLane|RuntimeArtifact|RuntimeMachinery
  range: ArchitectureKind|ResourceProviderProfileConcept|RuntimeArtifact
  direction: "consumer -> dependency"
  operational_meaning: "Constrains legal dependency direction and import boundaries."
  allowed_in: canonical_graph

- id: requires
  domain: ArchitectureKind|ProjectionLane|RuntimeArtifact|ValidationGate
  range: ResourceProviderProfileConcept|RuntimePhase|ValidationGate|RuntimeArtifact
  direction: "requiring thing -> requirement"
  operational_meaning: "Triggers provider coverage, schema, gate, lifecycle, or runtime compiler expectations."
  allowed_in: canonical_graph

- id: does_not_own
  domain: ArchitectureKind|RuntimeMachinery|ProjectionLane
  range: SemanticBoundary|RuntimeArtifact|AppStructure
  direction: "non-owner -> prohibited ownership target"
  operational_meaning: "Prevents false ownership, semantic drift, and construction-path collapse."
  allowed_in: canonical_graph

- id: separate_from
  domain: ArchitectureKind|AppStructure|RuntimeMachinery
  range: ArchitectureKind|AppStructure|RuntimeMachinery
  direction: "concept A -> concept B"
  operational_meaning: "Preserves architectural distinctions where conflation causes invalid construction."
  allowed_in: canonical_graph

- id: derives
  domain: RuntimeMachinery
  range: RuntimeArtifact
  direction: "producer -> derived artifact"
  operational_meaning: "Defines SDK derivation outputs and downstream runtime compiler inputs."
  allowed_in: canonical_graph

- id: compiles_to
  domain: RuntimeMachinery|RuntimeArtifact
  range: RuntimeArtifact
  direction: "compiler/input -> compiled artifact"
  operational_meaning: "Defines runtime compiler handoff to bootgraph/process runtime/adapters."
  allowed_in: canonical_graph

- id: orders
  domain: RuntimeMachinery
  range: RuntimeArtifact|RuntimePhase
  direction: "ordering mechanism -> ordered plan/phase"
  operational_meaning: "Constrains bootgraph lifecycle ordering, rollback, and finalization."
  allowed_in: canonical_graph

- id: provisions
  domain: RuntimeMachinery|ResourceProviderProfileConcept
  range: ResourceProviderProfileConcept|RuntimeArtifact
  direction: "provisioner -> provisioned resource/access"
  operational_meaning: "Determines who may acquire providers/resources and when."
  allowed_in: canonical_graph

- id: binds
  domain: RuntimeMachinery
  range: ArchitectureKind|RuntimeArtifact
  direction: "binder -> bound service/access"
  operational_meaning: "Constrains service binding, cache key participation, and live client creation."
  allowed_in: canonical_graph

- id: lowers_to
  domain: RuntimeMachinery|RuntimeArtifact
  range: RuntimeArtifact
  direction: "adapter/plan -> harness-facing payload"
  operational_meaning: "Defines adapter lowering and native payload boundaries."
  allowed_in: canonical_graph

- id: mounts
  domain: RuntimeMachinery
  range: RuntimeArtifact|ProjectionLane
  direction: "harness -> mounted surface/payload"
  operational_meaning: "Defines harness mounting without giving harnesses semantic ownership."
  allowed_in: canonical_graph

- id: observes
  domain: RuntimeMachinery|ValidationGate
  range: RuntimeArtifact|RuntimePhase
  direction: "observer -> observed state"
  operational_meaning: "Produces diagnostics, catalogs, telemetry, topology records, and drift signals."
  allowed_in: canonical_graph

- id: finalizes
  domain: RuntimeMachinery
  range: RuntimeArtifact|RuntimePhase
  direction: "finalizer -> finalized runtime state"
  operational_meaning: "Constrains deterministic shutdown, provider release, final records, and reverse ordering."
  allowed_in: canonical_graph

- id: produces
  domain: RuntimeMachinery|ArchitectureKind|ValidationGate
  range: RuntimeArtifact|ReviewFinding|RuntimeArtifact
  direction: "producer -> output"
  operational_meaning: "Records operational handoff artifacts."
  allowed_in: canonical_graph

- id: consumes
  domain: RuntimeMachinery|ValidationGate
  range: RuntimeArtifact
  direction: "consumer -> input artifact"
  operational_meaning: "Determines lifecycle handoff and artifact compatibility checks."
  allowed_in: canonical_graph

- id: validated_by
  domain: ArchitectureKind|RuntimeArtifact|ProjectionLane|ResourceProviderProfileConcept
  range: ValidationGate
  direction: "thing -> gate"
  operational_meaning: "Defines deterministic validation or diagnostic coverage."
  allowed_in: canonical_graph

- id: checked_by_gate
  domain: ArchitectureKind|RuntimeArtifact|ForbiddenPattern|ClassifierReadinessAnnotation
  range: ValidationGate
  direction: "claim/path -> gate"
  operational_meaning: "Connects law, artifact, or classifier move to enforcement."
  allowed_in: canonical_graph

- id: emits_diagnostic
  domain: RuntimeMachinery|ValidationGate
  range: RuntimeArtifact|ReviewFinding
  direction: "emitter -> diagnostic/finding"
  operational_meaning: "Makes invalid construction paths observable."
  allowed_in: canonical_graph

- id: requires_schema
  domain: ArchitectureKind|ResourceProviderProfileConcept|ServiceBoundaryLane|RuntimeArtifact
  range: ResourceProviderProfileConcept|RuntimeArtifact
  direction: "schema-bearing boundary -> required schema"
  operational_meaning: "Determines runtime-carried schema, config decoding, redaction, diagnostics, and harness payload validation."
  allowed_in: canonical_graph

- id: is_authority_for
  domain: DocumentAuthority
  range: ArchitectureKind|RuntimeMachinery|ConstructionLaw
  direction: "document -> governed scope"
  operational_meaning: "Determines source-of-truth baseline for semantic diff."
  allowed_in: authority_overlay

- id: supersedes
  domain: DocumentAuthority|DeprecatedTerm
  range: DocumentAuthority|DeprecatedTerm
  direction: "newer authority -> older authority"
  operational_meaning: "Resolves stale source claims and replacement status."
  allowed_in: authority_overlay

- id: replaces
  domain: ArchitectureKind|ConstructionLaw|ForbiddenPattern|DeprecatedTerm
  range: DeprecatedTerm|ForbiddenPattern
  direction: "canonical replacement -> old/invalid term"
  operational_meaning: "Provides rewrite target for drift repair."
  allowed_in: authority_overlay

- id: forbids
  domain: ConstructionLaw|ForbiddenPattern|DocumentAuthority
  range: ForbiddenPattern|ArchitectureKind|ProjectionLane
  direction: "law/source -> forbidden path"
  operational_meaning: "Rejects invalid construction paths and stale terminology."
  allowed_in: canonical_graph

- id: deprecates
  domain: DocumentAuthority|ConstructionLaw
  range: DeprecatedTerm
  direction: "authority/law -> deprecated term"
  operational_meaning: "Marks stale terms for review and document repair."
  allowed_in: authority_overlay

- id: conflicts_with
  domain: ReviewFinding|EvidenceClaim
  range: ArchitectureKind|ConstructionLaw|RuntimeArtifact
  direction: "finding -> conflicted canonical fact"
  operational_meaning: "Drives semantic diff and review."
  allowed_in: evidence_or_authority_review

- id: needs_review
  domain: ReviewFinding|CandidateEntity|ReservedBoundary
  range: DocumentAuthority|ArchitectureKind|ConstructionLaw
  direction: "unresolved item -> review target"
  operational_meaning: "Prevents silent promotion of uncertain claims."
  allowed_in: evidence_or_candidate_review

- id: allows_move
  domain: ClassifierReadinessAnnotation
  range: ArchitectureKind|ProjectionLane|AppStructure
  direction: "annotation -> allowed construction move"
  operational_meaning: "Future classifier narrowing; must have enforcement consequence."
  allowed_in: classifier_overlay

- id: forbids_move
  domain: ClassifierReadinessAnnotation
  range: ForbiddenPattern|ArchitectureKind|ProjectionLane
  direction: "annotation -> rejected construction move"
  operational_meaning: "Future classifier rejection with traceable rationale."
  allowed_in: classifier_overlay

- id: narrows
  domain: ClassifierReadinessAnnotation
  range: ArchitectureKind|ProjectionLane|ResourceProviderProfileConcept|ValidationGate
  direction: "classification fact -> narrowed legal space"
  operational_meaning: "Reduces legal construction paths during pre-classification."
  allowed_in: classifier_overlay

- id: requires_gate
  domain: ClassifierReadinessAnnotation|ArchitectureKind|ProjectionLane
  range: ValidationGate
  direction: "move/category -> gate"
  operational_meaning: "Connects classifier category to validation requirement."
  allowed_in: classifier_overlay

- id: has_operational_consequence
  domain: ArchitectureKind|ConstructionLaw|ClassifierReadinessAnnotation|ForbiddenPattern
  range: ValidationGate|RuntimeArtifact|AppStructure|ResourceProviderProfileConcept
  direction: "fact -> consequence"
  operational_meaning: "Prevents labels without enforcement consequences from entering classifier rule packs."
  allowed_in: canonical_graph_or_classifier_overlay
```

---

## 3.5 Operational Consequence Matrix

```yaml
- category: ArchitectureKind
  required_consequence:
    - ownership
    - legal-dependency-direction
    - file-placement
    - semantic-drift-detection
  classifier_use: "Narrows legal owner and allowed construction path."

- category: ArchitectureRoot
  required_consequence:
    - file-placement
    - import-boundary
    - authority-scope
  classifier_use: "Determines legal target root before generation."

- category: ServiceBoundaryLane
  required_consequence:
    - binding-participation
    - schema-requirement
    - cache-key-participation
    - per-call-vs-construction-time-separation
  classifier_use: "Prevents invocation/config/deps/provided confusion."

- category: ProjectionLane
  required_consequence:
    - plugin-topology
    - lane-builder-selection
    - surface-mounting
    - app-membership-selection
  classifier_use: "Maps a capability need to legal plugin lane without reclassifying by fields."

- category: AppStructure
  required_consequence:
    - app-membership
    - runtime-profile-selection
    - entrypoint-process-shape
    - provider-selection
  classifier_use: "Separates app composition from process shape and deployment placement."

- category: ResourceProviderProfileConcept
  required_consequence:
    - resource-contract
    - provider-implementation
    - provider-selection
    - provider-coverage
    - provisioning-lifetime
  classifier_use: "Forces resource/provider/profile separation and compiler coverage expectations."

- category: RuntimePhase
  required_consequence:
    - producer
    - consumer
    - phase-order
    - required-output
  classifier_use: "Predicts downstream preflight and diagnostics without making runtime a semantic owner."

- category: RuntimeMachinery
  required_consequence:
    - producer-consumer-handoff
    - ownership-boundary
    - import-boundary
    - diagnostic
  classifier_use: "Selects expected runtime compiler, bootgraph, provisioning, adapter, harness, or diagnostic role."

- category: RuntimeArtifact
  required_consequence:
    - producer
    - consumer
    - validation-gate
    - diagnostic-read-model
  classifier_use: "Lets classifier predict what must be emitted or checked after generation."

- category: ConstructionLaw
  required_consequence:
    - semantic-drift-detection
    - allowed-dependency-direction
    - forbidden-path-rejection
  classifier_use: "Turns architecture law into narrowing and rejection rules."

- category: ForbiddenPattern
  required_consequence:
    - rejected-construction-path
    - replacement-target
    - diagnostic
    - document-repair
  classifier_use: "Blocks invalid targets before generator output."

- category: ValidationGate
  required_consequence:
    - static-check
    - runtime-compiler-check
    - diagnostic
    - review-blocker
  classifier_use: "Requires an enforcement step for each classifier-relevant category."

- category: DocumentAuthority
  required_consequence:
    - source-of-truth-scope
    - source-span-provenance
    - supersession-review
  classifier_use: "Prevents stale source claims from becoming classifier rules."

- category: ClassifierReadinessAnnotation
  required_consequence:
    - allowed-move
    - forbidden-move
    - required-gate
    - generator-output
    - runtime-compiler-expectation
  classifier_use: "Encodes future rule-pack pressure while leaving unresolved implications candidate or tbd."
```

---

## 4. Canonical Entity Seed

This seed has 101 canonical entities. It stays inside the requested 50–150 range and omits broad adjacent systems.

```yaml
- id: core.root.packages
  label: packages/
  type: ArchitectureRoot
  layer: core
  status: locked
  definition: "Top-level root for support matter and platform machinery."
  aliases: ["packages"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.1 Canonical repository roots"
  operational_consequence:
    - file-placement
    - legal-dependency-direction
    - import-boundary
  classifier_readiness:
    status: locked
    consequence:
      - file-placement
      - import-boundary
      - generator-target
  notes: ""

- id: core.root.resources
  label: resources/
  type: ArchitectureRoot
  layer: core
  status: locked
  definition: "Top-level runtime-realization authoring root for provisionable capability contracts and provider selectors; first-class but not a business-capability owner."
  aliases: ["resources"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.1 Canonical repository roots"
  operational_consequence:
    - file-placement
    - resource-contract-address
    - provider-coverage
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - provider-coverage
      - runtime-compiler
  notes: "This is first-class runtime contract truth, not service truth."

- id: core.root.services
  label: services/
  type: ArchitectureRoot
  layer: core
  status: locked
  definition: "Top-level root for semantic capability boundaries."
  aliases: ["services"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.1 Canonical repository roots"
  operational_consequence:
    - file-placement
    - ownership
    - schema-ownership
    - write-authority
  classifier_readiness:
    status: locked
    consequence:
      - truth-owner
      - generator-target
      - verification-gate
  notes: ""

- id: core.root.plugins
  label: plugins/
  type: ArchitectureRoot
  layer: core
  status: locked
  definition: "Top-level root for runtime projection packages."
  aliases: ["plugins"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.1 Canonical repository roots"
  operational_consequence:
    - file-placement
    - projection-classification
    - surface-mounting
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
      - verification-gate
  notes: ""

- id: core.root.apps
  label: apps/
  type: ArchitectureRoot
  layer: core
  status: locked
  definition: "Top-level root for app identities, app composition, profiles, and entrypoints."
  aliases: ["apps"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.1 Canonical repository roots"
  operational_consequence:
    - app-membership
    - runtime-profile-selection
    - entrypoint-selection
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - runtime-profile
      - entrypoint-process-shape
  notes: ""

- id: core.kind.package
  label: package
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Support matter or platform machinery."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns"
  operational_consequence:
    - support-boundary
    - legal-dependency-direction
    - non-truth-owner
  classifier_readiness:
    status: locked
    consequence:
      - file-placement
      - import-boundary
      - generator-target
  notes: ""

- id: core.kind.resource
  label: resource
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Provisionable capability contract consumed by runtime plans."
  aliases: ["RuntimeResource when referring to authored resource descriptor"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 3.4 Resource and boundary nouns"
  operational_consequence:
    - resource-contract
    - provider-coverage
    - runtime-compiler-validation
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - schema-requirement
      - provider-coverage
  notes: "Use core.runtime-resource for descriptor-level runtime noun."

- id: core.kind.provider
  label: provider
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Implementation of a resource contract."
  aliases: ["RuntimeProvider"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 3.4 Resource and boundary nouns"
  operational_consequence:
    - provider-implementation
    - acquisition-plan
    - provider-selection-validation
  classifier_readiness:
    status: locked
    consequence:
      - provider-selection
      - provider-coverage
      - runtime-compiler
  notes: ""

- id: core.kind.service
  label: service
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "A semantic capability boundary."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 3.7 Core definitions"
  operational_consequence:
    - ownership
    - schema-ownership
    - write-authority
    - import-boundary
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - truth-owner
      - generator-target
      - verification-gate
  notes: ""

- id: core.kind.service-family
  label: service family
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Optional namespace grouping under services/; not a service or owner."
  aliases: ["family namespace"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 4.8 Namespace is not ownership"
  operational_consequence:
    - namespace-review
    - ownership-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - file-placement
      - ownership-check
  notes: "Leaf service remains canonical owner."

- id: core.kind.plugin
  label: plugin
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Runtime projection package."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 3.7 Core definitions"
  operational_consequence:
    - projection-ownership
    - lane-classification
    - app-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
      - verification-gate
  notes: ""

- id: core.kind.app
  label: app
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Top-level product/runtime identity."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 9.1 App posture"
  operational_consequence:
    - app-identity
    - app-membership
    - runtime-profile-selection
    - entrypoint-selection
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - runtime-profile
      - entrypoint-process-shape
  notes: ""

- id: core.kind.app-composition
  label: app composition
  type: AppStructure
  layer: core
  status: locked
  definition: "App-owned selection file at apps/<app>/rawr.<app>.ts."
  aliases: ["manifest"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 9.2 App composition posture"
  operational_consequence:
    - app-membership
    - selected-plugin-membership
    - sdk-role-surface-index-derivation
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - generator-target
      - sdk-derivation
  notes: "Manifest is accepted as broad architecture alias, not a separate runtime artifact."

- id: core.kind.manifest
  label: manifest
  type: AppStructure
  layer: core
  status: locked
  definition: "Broad architecture alias for the app composition file."
  aliases: ["app composition file"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 1 Scope"
  operational_consequence:
    - semantic-drift-detection
    - alias-resolution
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - document-drift-repair
  notes: "Do not treat as a second runtime artifact above AppDefinition."

- id: core.kind.role
  label: role
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Semantic execution class inside an app."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns"
  operational_consequence:
    - process-role-selection
    - plugin-lane-classification
    - harness-selection
  classifier_readiness:
    status: locked
    consequence:
      - process-shape
      - plugin-lane-selection
      - verification-gate
  notes: ""

- id: core.kind.surface
  label: surface
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "What a role exposes or runs."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 9.6 App selection, process shape, and surface remain distinct"
  operational_consequence:
    - surface-mounting
    - projection-classification
    - harness-adapter-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - surface-mounting
      - generator-target
  notes: ""

- id: core.kind.repository
  label: repository
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Service-internal persistence mechanic under semantic ownership."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns"
  operational_consequence:
    - service-internal-file-placement
    - schema-ownership
    - write-authority
  classifier_readiness:
    status: locked
    consequence:
      - file-placement
      - import-boundary
      - ownership-check
  notes: "Not a top-level architectural kind."

- id: core.kind.entrypoint
  label: entrypoint
  type: AppStructure
  layer: core
  status: locked
  definition: "Executable file that calls startApp(...) for one process shape."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 9.5 Entrypoints"
  operational_consequence:
    - process-shape-selection
    - runtime-profile-selection
    - app-start
  classifier_readiness:
    status: locked
    consequence:
      - entrypoint-process-shape
      - runtime-compiler
      - verification-gate
  notes: ""

- id: core.app.define-app
  label: defineApp(...)
  type: AppStructure
  layer: core
  status: locked
  definition: "App authoring operation that declares app identity and selected plugin membership."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.3 App authoring law"
  operational_consequence:
    - app-membership
    - sdk-derivation
  classifier_readiness:
    status: locked
    consequence:
      - generator-output
      - app-membership
  notes: ""

- id: core.app.app-definition
  label: AppDefinition
  type: AppStructure
  layer: core
  status: locked
  definition: "Concrete runtime authoring authority produced by defineApp(...)."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "1 Scope"
  operational_consequence:
    - app-membership-authority
    - sdk-runtime-input
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: "Manifest/app composition is not a second runtime artifact above AppDefinition."

- id: core.app.runtime-profile
  label: RuntimeProfile
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "App-owned provider, config-source, process-default, and harness-default selection."
  aliases: ["runtime profile"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns; 9.4 Runtime profiles and process defaults"
  operational_consequence:
    - provider-selection
    - config-source-selection
    - runtime-compiler-provider-coverage
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - runtime-profile
      - runtime-compiler
  notes: ""

- id: core.app.provider-selection
  label: ProviderSelection
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "App-owned normalized provider choice."
  aliases: ["providerSelections", "providers field in RuntimeProfile"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns; 9.4 Runtime profiles and process defaults"
  operational_consequence:
    - provider-coverage
    - app-owned-selection
    - provisioning-input
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - runtime-compiler
  notes: "Profile field named resources is forbidden as provider-selection field."

- id: core.app.process-shape
  label: process shape
  type: AppStructure
  layer: core
  status: locked
  definition: "Selected role set started by one entrypoint/startApp invocation."
  aliases: ["selected process role set"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints; 9.6 App selection, process shape, and surface remain distinct"
  operational_consequence:
    - process-start
    - runtime-compiler-input
    - placement-separation
  classifier_readiness:
    status: locked
    consequence:
      - entrypoint-process-shape
      - runtime-compiler
      - diagnostic
  notes: ""

- id: core.app.start-app
  label: startApp(...)
  type: AppStructure
  layer: core
  status: locked
  definition: "Canonical app start operation; each invocation starts exactly one process runtime assembly."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - app-start
    - entrypoint-validation
    - forbidden-role-specific-start-verb-detection
  classifier_readiness:
    status: locked
    consequence:
      - generator-output
      - verification-gate
  notes: ""

- id: core.boundary.service-boundary
  label: service boundary
  type: SemanticBoundary
  layer: core
  status: locked
  definition: "Transport-neutral, placement-neutral boundary that owns service truth."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.4 Service boundary first"
  operational_consequence:
    - ownership
    - dependency-direction
    - projection-before-composition
  classifier_readiness:
    status: locked
    consequence:
      - truth-owner
      - generator-target
      - semantic-drift-detection
  notes: ""

- id: core.lane.deps
  label: deps
  type: ServiceBoundaryLane
  layer: core
  status: locked
  definition: "Construction-time dependencies declared by the service and satisfied by runtime binding."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
  operational_consequence:
    - construction-time-binding
    - service-binding-plan
    - resource-or-service-dependency
  classifier_readiness:
    status: locked
    consequence:
      - schema-requirement
      - runtime-compiler
      - verification-gate
  notes: ""

- id: core.lane.scope
  label: scope
  type: ServiceBoundaryLane
  layer: core
  status: locked
  definition: "Construction-time business or client-instance identity."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
  operational_consequence:
    - construction-time-binding
    - runtime-carried-schema
    - service-binding-cache-key
  classifier_readiness:
    status: locked
    consequence:
      - schema-requirement
      - service-binding
  notes: ""

- id: core.lane.config
  label: config
  type: ServiceBoundaryLane
  layer: core
  status: locked
  definition: "Construction-time service behavior configuration."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
  operational_consequence:
    - construction-time-binding
    - runtime-carried-schema
    - service-binding-cache-key
  classifier_readiness:
    status: locked
    consequence:
      - schema-requirement
      - runtime-profile
      - service-binding
  notes: ""

- id: core.lane.invocation
  label: invocation
  type: ServiceBoundaryLane
  layer: core
  status: locked
  definition: "Required per-call input supplied by caller or harness."
  aliases: ["invocation context"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - per-call-input
    - excluded-from-service-binding-cache-key
    - caller-harness-context
  classifier_readiness:
    status: locked
    consequence:
      - schema-requirement
      - verification-gate
  notes: "Invocation never participates in construction-time binding or ServiceBindingCacheKey."

- id: core.lane.provided
  label: provided
  type: ServiceBoundaryLane
  layer: core
  status: locked
  definition: "Execution-derived values produced by service middleware/module composition."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - middleware-output
    - forbidden-runtime-seeding
    - service-pipeline-validation
  classifier_readiness:
    status: locked
    consequence:
      - verification-gate
      - diagnostic
  notes: "Runtime and package boundaries must not seed provided.* unless a named service-middleware contract changes the rule."

- id: core.dep.resource-dep
  label: resourceDep(...)
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Service dependency declaration on a provisionable host capability."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.4 Dependency helper rules"
  operational_consequence:
    - resource-requirement
    - service-binding-plan
    - provider-coverage
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - runtime-compiler
  notes: "Does not construct providers."

- id: core.dep.service-dep
  label: serviceDep(...)
  type: SemanticBoundary
  layer: core
  status: locked
  definition: "Service-to-service client dependency declaration."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.4 Dependency helper rules"
  operational_consequence:
    - service-dependency
    - binding-plan
    - sibling-internal-import-prevention
  classifier_readiness:
    status: locked
    consequence:
      - import-boundary
      - service-binding
  notes: "Not selected through RuntimeProfile and not a runtime resource."

- id: core.dep.semantic-dep
  label: semanticDep(...)
  type: SemanticBoundary
  layer: core
  status: tbd
  definition: "Explicit semantic adapter dependency; not a runtime resource, provider selection, or sibling repository import."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.4 Dependency helper rules; Reserved boundaries table"
  operational_consequence:
    - semantic-adapter-boundary
    - unresolved-diagnostic
  classifier_readiness:
    status: tbd
    consequence:
      - reserved-boundary
      - diagnostic
  notes: "Locked as a named helper category, but deeper adapter semantics remain reserved."

- id: core.plugin.plugin-factory
  label: PluginFactory
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Plugin authoring factory that produces lane-specific plugin definition."
  aliases: ["plugin factory"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "6 Layered naming and artifact ownership"
  operational_consequence:
    - plugin-authoring
    - app-selection
    - sdk-derivation
  classifier_readiness:
    status: locked
    consequence:
      - generator-output
      - plugin-lane-selection
  notes: ""

- id: core.plugin.plugin-definition
  label: PluginDefinition
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Cold plugin projection definition selected by an app and derived by the SDK."
  aliases: ["plugin definition"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "6 Layered naming and artifact ownership"
  operational_consequence:
    - app-selection
    - surface-runtime-plan
    - projection-classification
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: ""

- id: core.plugin.use-service
  label: useService(...)
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Plugin declaration of service use."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
  operational_consequence:
    - service-use-declaration
    - service-binding-plan
    - import-boundary
  classifier_readiness:
    status: locked
    consequence:
      - service-binding
      - verification-gate
  notes: ""

- id: core.projection.role-surface-capability-lane
  label: role/surface/capability lane
  type: ProjectionLane
  layer: core
  status: locked
  definition: "The lane identity into which a plugin projects service truth or host capability."
  aliases: ["projection lane"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.12 Plugin authoring invariants"
  operational_consequence:
    - projection-classification
    - topology-builder-agreement
    - harness-mounting
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
      - verification-gate
  notes: ""

- id: core.role.server
  label: server
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for public and trusted callable request/response ingress by default."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - ingress-selection
    - plugin-lane-classification
    - harness-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - auth-posture-tbd
  notes: ""

- id: core.role.async
  label: async
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for durable background work and governed execution."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - durable-work-placement
    - workflow-schedule-consumer-mounting
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - runtime-compiler
  notes: ""

- id: core.role.web
  label: web
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for browser-facing web projection."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape; 5 Canonical repo topology"
  operational_consequence:
    - web-projection
    - harness-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
  notes: ""

- id: core.role.cli
  label: cli
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for terminal-facing command projection."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape; 5 Canonical repo topology"
  operational_consequence:
    - command-projection
    - harness-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
  notes: ""

- id: core.role.agent
  label: agent
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for human-facing shell/channel/tool projection; durable steward execution remains on async."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.6 Agent subsystem nouns; 4.10 Ingress and execution law"
  operational_consequence:
    - agent-surface-selection
    - shell-steward-separation
    - governed-work-handoff
  classifier_readiness:
    status: tbd
    consequence:
      - auth-posture
      - governance-handoff
      - reserved-boundary
  notes: "Agent/OpenShell governance is reserved beyond locked integration hooks."

- id: core.role.desktop
  label: desktop
  type: ArchitectureKind
  layer: core
  status: locked
  definition: "Role for desktop projection lanes; desktop-local loops remain process-local and durable business workflows stay on async."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.11 Desktop projection"
  operational_consequence:
    - desktop-surface-selection
    - process-local-loop-boundary
    - harness-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - runtime-compiler
  notes: ""

- id: core.surface.server-api
  label: server API surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Public server API projection lane."
  aliases: ["plugins/server/api/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - plugin-file-placement
    - topology-builder-agreement
    - public-callable-surface
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - plugin-lane-selection
      - verification-gate
  notes: ""

- id: core.surface.server-internal
  label: server internal surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Trusted first-party/internal server API projection lane."
  aliases: ["plugins/server/internal/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - plugin-file-placement
    - topology-builder-agreement
    - trusted-callable-surface
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - plugin-lane-selection
      - verification-gate
  notes: "A capability needing both public and trusted internal callable surfaces authors two projection packages."

- id: core.surface.async-workflow
  label: async workflow surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Durable workflow projection lane."
  aliases: ["plugins/async/workflows/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - durable-execution
    - async-harness-mounting
    - function-bundle-lowering
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - runtime-compiler
      - verification-gate
  notes: ""

- id: core.surface.async-schedule
  label: async schedule surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Durable scheduled projection lane."
  aliases: ["plugins/async/schedules/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - scheduled-durable-work
    - async-harness-mounting
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - runtime-compiler
      - verification-gate
  notes: ""

- id: core.surface.async-consumer
  label: async consumer surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Durable consumer projection lane."
  aliases: ["plugins/async/consumers/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - event-consumption
    - async-harness-mounting
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - runtime-compiler
      - verification-gate
  notes: ""

- id: core.surface.cli-command
  label: CLI command surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Terminal-facing command projection lane."
  aliases: ["plugins/cli/commands/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - command-harness-mounting
    - plugin-file-placement
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - plugin-lane-selection
  notes: ""

- id: core.surface.web-app
  label: web app surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Browser/web app projection lane."
  aliases: ["plugins/web/app/<capability>"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - web-harness-mounting
    - plugin-file-placement
  classifier_readiness:
    status: locked
    consequence:
      - generator-target
      - plugin-lane-selection
  notes: ""

- id: core.surface.agent-channel
  label: agent channel surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Human-facing ingress/egress channel projection lane."
  aliases: ["plugins/agent/channels/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.6 Agent subsystem nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - agent-channel-mounting
    - shell-gateway-boundary
  classifier_readiness:
    status: tbd
    consequence:
      - auth-posture
      - reserved-boundary
  notes: ""

- id: core.surface.agent-shell
  label: agent shell surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Session-level shell runtime projection lane."
  aliases: ["plugins/agent/shell/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.6 Agent subsystem nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - shell-runtime-mounting
    - shell-steward-separation
  classifier_readiness:
    status: tbd
    consequence:
      - governance-handoff
      - reserved-boundary
  notes: ""

- id: core.surface.agent-tool
  label: agent tool surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Machine-facing or capability-facing tool projection lane used by the shell."
  aliases: ["plugins/agent/tools/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.6 Agent subsystem nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - tool-surface-mounting
    - service-boundary-obedience
  classifier_readiness:
    status: tbd
    consequence:
      - auth-posture
      - governance-handoff
      - reserved-boundary
  notes: ""

- id: core.surface.desktop-menubar
  label: desktop menubar surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Desktop menu bar/tray projection lane."
  aliases: ["plugins/desktop/menubar/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.11 Desktop projection"
  operational_consequence:
    - desktop-harness-mounting
    - process-local-loop-boundary
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
  notes: ""

- id: core.surface.desktop-window
  label: desktop window surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Desktop window projection lane."
  aliases: ["plugins/desktop/windows/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.11 Desktop projection"
  operational_consequence:
    - desktop-harness-mounting
    - window-surface-mount
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - generator-target
  notes: ""

- id: core.surface.desktop-background
  label: desktop background surface
  type: ProjectionLane
  layer: core
  status: locked
  definition: "Desktop background projection lane for process-local behavior, not durable orchestration."
  aliases: ["plugins/desktop/background/<capability>"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.11 Desktop projection; 4.10 Ingress and execution law"
  operational_consequence:
    - process-local-loop-boundary
    - durable-work-rejection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - verification-gate
  notes: "Durable business workflows remain on async."

- id: core.resource.runtime-resource
  label: RuntimeResource
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Provisionable capability contract."
  aliases: ["resource descriptor"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - resource-contract
    - allowed-lifetime
    - runtime-compiler-provider-coverage
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - provider-coverage
      - schema-requirement
  notes: ""

- id: core.resource.resource-requirement
  label: ResourceRequirement
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Declaration that a boundary needs a resource."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - runtime-compiler-coverage
    - resource-binding
    - provider-selection-validation
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - runtime-compiler
  notes: ""

- id: core.resource.resource-lifetime
  label: ResourceLifetime
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Process or role lifetime for a runtime resource."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - process-vs-role-lifetime
    - provisioning-scope
    - finalization
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: core.resource.runtime-provider
  label: RuntimeProvider
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Cold implementation plan for a resource contract."
  aliases: ["provider"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - provider-implementation
    - cold-acquisition-plan
    - provisioning
  classifier_readiness:
    status: locked
    consequence:
      - provider-selection
      - runtime-compiler
      - provider-coverage
  notes: ""

- id: core.resource.process-resource
  label: process resource
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Resource acquired once per started process."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - process-lifetime
    - provisioning
    - finalization
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: core.resource.role-resource
  label: role resource
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Resource acquired once per mounted role in a process."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - role-lifetime
    - provisioning
    - finalization
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: core.context.invocation-context
  label: invocation context
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Per-request, per-call, or per-execution values."
  aliases: ["invocation"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - per-call-schema
    - service-binding-cache-exclusion
  classifier_readiness:
    status: locked
    consequence:
      - schema-requirement
      - verification-gate
  notes: ""

- id: core.context.call-local-value
  label: call-local value
  type: ResourceProviderProfileConcept
  layer: core
  status: locked
  definition: "Temporary value created inside one handler or execution chain."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns"
  operational_consequence:
    - non-resource
    - non-construction-binding
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: runtime.phase.definition
  label: definition
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "Import-safe declaration phase for services, plugins, resources, providers, apps, and profiles."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - import-safety
    - sdk-derivation-input
  classifier_readiness:
    status: locked
    consequence:
      - generator-output
      - sdk-derivation
  notes: ""

- id: runtime.phase.selection
  label: selection
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "App membership, runtime profile, provider selections, process roles, and selected harnesses."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - app-selection
    - runtime-profile-selection
    - process-role-selection
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - runtime-profile
      - runtime-compiler
  notes: ""

- id: runtime.phase.derivation
  label: derivation
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "SDK phase that emits normalized authoring graph, service binding plans, surface runtime plans, workflow dispatcher descriptors, and portable plan artifacts."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - sdk-artifact-emission
    - runtime-compiler-input
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: ""

- id: runtime.phase.compilation
  label: compilation
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime compiler phase that emits compiled process plan, provider dependency graph, and compiled service/surface/harness plans."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - provider-coverage-validation
    - provider-dependency-closure
    - bootgraph-input
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - provider-coverage
      - diagnostic
  notes: ""

- id: runtime.phase.provisioning
  label: provisioning
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "Bootgraph/provisioning-kernel phase that produces provisioned process, live process access, live role access, and startup records."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - resource-acquisition
    - config-secret-validation
    - managed-runtime
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.phase.mounting
  label: mounting
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "Phase where services are bound, surfaces mounted, payloads adapter-lowered, and harness handles started."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - service-binding
    - adapter-lowering
    - harness-mounting
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - runtime-compiler
  notes: ""

- id: runtime.phase.observation
  label: observation
  type: RuntimePhase
  layer: runtime-realization-overlay
  status: locked
  definition: "Phase that emits runtime catalog, diagnostics, telemetry, topology records, and finalization records."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - runtime-catalog
    - diagnostics
    - telemetry
    - topology-records
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: runtime.machine.sdk-derivation
  label: SDK derivation
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "@rawr/sdk normalization and plan derivation."
  aliases: ["@rawr/sdk derivation"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns; 10.4 SDK derivation"
  operational_consequence:
    - normalized-authoring-graph
    - service-binding-plan
    - surface-runtime-plan
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: ""

- id: runtime.machine.runtime-compiler
  label: runtime compiler
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Compiler that turns selected app composition into one compiled process plan."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - compiled-process-plan
    - provider-coverage-validation
    - provider-dependency-closure
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - provider-coverage
      - verification-gate
  notes: ""

- id: runtime.machine.bootgraph
  label: bootgraph
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "RAWR-owned lifecycle graph above provider acquisition."
  aliases: ["Bootgraph"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns; bootgraph definition"
  operational_consequence:
    - lifecycle-ordering
    - rollback
    - reverse-finalization
    - provisioning-input
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.machine.provisioning-kernel
  label: provisioning kernel
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Effect-backed process-local acquisition and release substrate."
  aliases: ["Effect provisioning kernel"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - resource-acquisition
    - provider-acquisition
    - config-secret-validation
    - managed-runtime
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: "Effect-backed but not a peer public ontology layer."

- id: runtime.machine.process-runtime
  label: process runtime
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Process-local binding, projection, adapter coordination, and harness handoff layer."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns; process runtime definition"
  operational_consequence:
    - service-binding
    - binding-cache
    - workflow-dispatcher-materialization
    - mounted-surface-records
    - harness-handoff
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.machine.surface-adapter
  label: surface adapter
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime adapter that lowers compiled surface plans to harness-facing payloads."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - adapter-lowering
    - harness-facing-payload
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.machine.harness
  label: harness
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Native host or execution backend for one surface family."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - native-mounting
    - host-boundary
    - finalization
  classifier_readiness:
    status: locked
    consequence:
      - harness-selection
      - diagnostic
  notes: "Harnesses do not define ontology."

- id: runtime.machine.diagnostics
  label: diagnostics
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "Observation machinery that records and explains selected, derived, provisioned, bound, projected, mounted, and finalized runtime state."
  aliases: ["runtime diagnostics"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 10.2 Runtime realization lifecycle"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - runtime-catalog
    - telemetry
    - drift-detection
    - diagnostic-read-model
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: runtime.machine.process
  label: process
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "One running program."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - runtime-assembly-boundary
    - managed-runtime
    - placement-separation
  classifier_readiness:
    status: locked
    consequence:
      - entrypoint-process-shape
      - diagnostic
  notes: ""

- id: runtime.machine.machine
  label: machine
  type: RuntimeMachinery
  layer: runtime-realization-overlay
  status: locked
  definition: "The computer or node running one or more processes."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - placement-separation
    - non-semantic-layer
  classifier_readiness:
    status: not-applicable
    consequence:
      - none
  notes: "Placement fact; not a core semantic owner."

- id: runtime.artifact.normalized-authoring-graph
  label: NormalizedAuthoringGraph
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "SDK-derived normalized graph of app authoring declarations."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle; 10.4 SDK derivation"
  operational_consequence:
    - runtime-compiler-input
    - sdk-derivation-output
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: ""

- id: runtime.artifact.service-binding-plan
  label: ServiceBindingPlan
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "SDK-derived plan for service binding."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle; 10.4 SDK derivation"
  operational_consequence:
    - service-binding
    - process-runtime-input
  classifier_readiness:
    status: locked
    consequence:
      - service-binding
      - runtime-compiler
  notes: ""

- id: runtime.artifact.surface-runtime-plan
  label: SurfaceRuntimePlan
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "SDK-derived plan descriptor for surface runtime assembly."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle; 10.4 SDK derivation"
  operational_consequence:
    - compiled-surface-plan-input
    - adapter-lowering
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - harness-selection
  notes: ""

- id: runtime.artifact.workflow-dispatcher-descriptor
  label: WorkflowDispatcherDescriptor
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "SDK-derived descriptor for workflow dispatcher materialization."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - dispatcher-materialization
    - server-internal-or-async-handoff
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.artifact.portable-plan-artifact
  label: PortableRuntimePlanArtifact
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Portable plan artifact emitted by SDK derivation."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle; 10.4 SDK derivation"
  operational_consequence:
    - runtime-compiler-input
    - diagnostic-inspection
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - runtime-compiler
  notes: ""

- id: runtime.artifact.compiled-process-plan
  label: CompiledProcessPlan
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Compiled plan for one selected process shape."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - bootgraph-input
    - process-runtime-input
    - provider-dependency-validation
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - provider-coverage
      - verification-gate
  notes: ""

- id: runtime.artifact.provider-dependency-graph
  label: ProviderDependencyGraph
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime compiler output describing provider dependency closure."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - provider-dependency-closure
    - bootgraph-ordering
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - runtime-compiler
  notes: ""

- id: runtime.artifact.managed-runtime-handle
  label: ManagedRuntimeHandle
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Live process managed runtime/disposal handle produced by provisioning."
  aliases: ["root managed runtime"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture; 26.5 Runtime/provisioning violations"
  operational_consequence:
    - one-root-managed-runtime-per-process
    - deterministic-disposal
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - finalization
  notes: ""

- id: runtime.artifact.runtime-access
  label: RuntimeAccess
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Live process-plus-role runtime access wrapper."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - service-binding
    - runtime-access-boundary
    - plugin-projection
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: runtime.artifact.process-runtime-access
  label: ProcessRuntimeAccess
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Live process runtime access."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - process-scope-access
    - binding-boundary
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
  notes: ""

- id: runtime.artifact.role-runtime-access
  label: RoleRuntimeAccess
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Live role runtime access."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
  operational_consequence:
    - role-scope-access
    - plugin-binding
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
  notes: ""

- id: runtime.artifact.service-binding-cache
  label: ServiceBindingCache
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Process-runtime service binding cache."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 26.6 Service binding violations"
  operational_consequence:
    - binding-cache
    - invocation-exclusion
    - collision-diagnostics
  classifier_readiness:
    status: locked
    consequence:
      - verification-gate
      - diagnostic
  notes: ""

- id: runtime.artifact.service-binding-cache-key
  label: ServiceBindingCacheKey
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Cache key for construction-time service binding; excludes invocation."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - binding-cache-validation
    - invocation-exclusion
  classifier_readiness:
    status: locked
    consequence:
      - verification-gate
      - diagnostic
  notes: ""

- id: runtime.artifact.workflow-dispatcher
  label: WorkflowDispatcher
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Process-runtime materialized workflow dispatcher for server/internal and async harness integration."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - dispatch-status-cancel-diagnostics
    - async-server-handoff
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - runtime-compiler
  notes: ""

- id: runtime.artifact.mounted-surface-runtime-record
  label: MountedSurfaceRuntimeRecord
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Mounted surface runtime record assembled by process runtime."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - surface-mount-record
    - harness-catalog-input
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: runtime.artifact.function-bundle
  label: FunctionBundle
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Async adapter/harness artifact containing lowered workflow, schedule, and consumer plans."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - async-lowering
    - inngest-harness-input
  classifier_readiness:
    status: locked
    consequence:
      - async-projection
      - runtime-compiler
      - verification-gate
  notes: ""

- id: runtime.artifact.started-harness
  label: StartedHarness
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Native host handle returned by harness mount."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - harness-finalization
    - catalog-record
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - finalization
  notes: ""

- id: runtime.artifact.runtime-catalog
  label: RuntimeCatalog
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Diagnostic read model of runtime state."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - observation
    - diagnostics
    - control-plane-touchpoint
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - runtime-preflight
  notes: ""

- id: runtime.artifact.runtime-diagnostic
  label: RuntimeDiagnostic
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Boundary, phase, and finalization finding emitted by runtime diagnostics."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - diagnostic-coverage
    - invalid-path-reporting
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: runtime.artifact.runtime-telemetry
  label: RuntimeTelemetry
  type: RuntimeArtifact
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime spans, events, annotations, and correlation records."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - telemetry-correlation
    - observation
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
  notes: ""

- id: law.ownership.services-own-truth
  label: Services own truth
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Services own semantic capability truth."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law"
  operational_consequence:
    - ownership
    - semantic-drift-detection
    - classifier-narrowing
  classifier_readiness:
    status: locked
    consequence:
      - truth-owner
      - generator-target
      - verification-gate
  notes: ""

- id: law.ownership.plugins-project
  label: Plugins project
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Plugins project service truth or host capability into runtime surfaces."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 8.12 Plugin authoring invariants"
  operational_consequence:
    - projection-classification
    - non-truth-owner
    - app-selection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - verification-gate
  notes: ""

- id: law.ownership.apps-select
  label: Apps select
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Apps select plugins, profiles, provider selections, and entrypoints."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
  operational_consequence:
    - app-membership
    - runtime-profile-selection
    - entrypoint-selection
  classifier_readiness:
    status: locked
    consequence:
      - app-membership
      - runtime-profile
      - generator-target
  notes: ""

- id: law.ownership.resources-declare
  label: Resources declare capability contracts
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Resources declare provisionable capability contracts but do not implement or acquire themselves."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
  operational_consequence:
    - resource-contract
    - provider-separation
    - provider-coverage
  classifier_readiness:
    status: locked
    consequence:
      - resource-requirement
      - runtime-compiler
  notes: ""

- id: law.ownership.providers-implement
  label: Providers implement capability contracts
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Providers implement resource contracts but do not become service truth or select themselves."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - provider-implementation
    - provider-selection-validation
    - semantic-truth-separation
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - runtime-compiler
  notes: ""

- id: law.ownership.sdk-derives
  label: The SDK derives
  type: ConstructionLaw
  layer: runtime-realization-overlay
  status: locked
  definition: "The SDK derives normalized authoring graphs and plan artifacts without acquiring live values."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law; 10.4 SDK derivation"
  operational_consequence:
    - sdk-derivation
    - no-resource-acquisition
    - runtime-compiler-input
  classifier_readiness:
    status: locked
    consequence:
      - sdk-derivation
      - verification-gate
  notes: ""

- id: law.ownership.runtime-realizes
  label: The runtime realizes
  type: ConstructionLaw
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime realization owns the bridge from selected declarations to one running process."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.1 Runtime realization stance"
  operational_consequence:
    - runtime-compiler
    - provisioning
    - mounting
    - diagnostics
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: law.ownership.harnesses-mount
  label: Harnesses mount
  type: ConstructionLaw
  layer: runtime-realization-overlay
  status: locked
  definition: "Harnesses mount native hosts after runtime adapter handoff; they do not define ontology or acquire providers."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
  operational_consequence:
    - harness-boundary
    - native-host-separation
    - finalization
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - harness-selection
  notes: ""

- id: law.ownership.diagnostics-observe
  label: Diagnostics observe
  type: ConstructionLaw
  layer: runtime-realization-overlay
  status: locked
  definition: "Diagnostics record and explain; they do not compose, acquire, or mutate."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
  operational_consequence:
    - observation
    - runtime-catalog
    - drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - verification-gate
  notes: ""

- id: law.direction.semantic-direction
  label: packages -> services -> plugins -> apps
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Canonical semantic direction: support matter below service truth, service truth below projection, projection below app selection."
  aliases: ["semantic direction"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.2 Semantic direction"
  operational_consequence:
    - legal-dependency-direction
    - import-boundary
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - import-boundary
      - generator-target
      - verification-gate
  notes: "resources/* participates in runtime realization without becoming semantic capability truth."

- id: law.separation.stable-architecture-runtime-realization
  label: stable architecture != runtime realization
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Stable architecture is app -> app composition -> role -> surface; runtime realization follows definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.3 Stable architecture versus runtime realization"
  operational_consequence:
    - ontology-layer-separation
    - runtime-overlay-boundary
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - app-membership
      - diagnostic
  notes: ""

- id: law.construction.service-boundary-first
  label: service boundary first
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Service boundary first; projection second; composition third; runtime realization fourth; placement fifth; transport and native host details downstream."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.4 Service boundary first"
  operational_consequence:
    - construction-order
    - classifier-narrowing
    - false-ownership-rejection
  classifier_readiness:
    status: locked
    consequence:
      - truth-owner
      - generator-target
      - verification-gate
  notes: ""

- id: law.construction.bind-project-compose-realize-observe
  label: bind -> project -> compose -> realize -> observe
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Capability becomes running software by binding service truth, projecting into lanes, composing into app identity, realizing process shape, and observing state."
  aliases: ["platform chain"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.5 Bind, project, compose, realize, observe law"
  operational_consequence:
    - construction-order
    - runtime-handoff
    - diagnostics
  classifier_readiness:
    status: locked
    consequence:
      - generator-output
      - runtime-compiler
      - diagnostic
  notes: ""

- id: law.shared-infrastructure-not-ownership
  label: shared infrastructure is not shared semantic ownership
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Shared process, machine, database instance, pool, telemetry, cache, or host runtime does not imply shared semantic truth, write authority, migration authority, repository ownership, or service identity."
  aliases: ["shared infrastructure != shared semantic ownership"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.7 Shared infrastructure is not shared semantic ownership"
  operational_consequence:
    - ownership-drift-detection
    - repository-boundary
    - migration-authority
  classifier_readiness:
    status: locked
    consequence:
      - ownership-check
      - verification-gate
  notes: ""

- id: law.namespace-not-ownership
  label: namespace is not ownership
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Namespace layers may improve navigation but do not create authority; services/<family>/... leaves leaf service as owner."
  aliases: ["namespace != owner"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.8 Namespace is not ownership"
  operational_consequence:
    - service-family-validation
    - ownership-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - file-placement
      - ownership-check
  notes: ""

- id: law.harness-substrate-downstream
  label: harness and substrate choice are downstream
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "Harness and substrate choices are downstream of semantic meaning and are not peer semantic owners."
  aliases: ["harness choice != semantic meaning", "substrate choice != semantic meaning"]
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.9 Harness and substrate choice are downstream"
  operational_consequence:
    - native-framework-boundary
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - harness-selection
      - diagnostic
  notes: ""

- id: law.ingress-execution-split
  label: ingress and execution law
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "External product ingress enters through server; external conversational ingress enters through agent; durable system work runs on async."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - role-selection
    - projection-lane-selection
    - durable-work-placement
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - runtime-compiler
      - verification-gate
  notes: ""

- id: law.shell-steward-authority
  label: shell versus steward authority law
  type: ConstructionLaw
  layer: core
  status: locked
  definition: "The shell drives what; stewards drive how; governance decides whether."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.11 Shell versus steward authority law"
  operational_consequence:
    - agent-async-handoff
    - governed-repo-mutation-boundary
    - authority-drift-detection
  classifier_readiness:
    status: tbd
    consequence:
      - governance-handoff
      - reserved-boundary
  notes: "Locked principle; detailed governance rules remain reserved."

- id: forbidden.pattern.root-core-authoring-root
  label: root-level core/ authoring root
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "A root-level core/ authoring root is invalid; platform machinery lives under packages/core/*."
  aliases: ["core/ root"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - file-placement-rejection
    - document-drift-repair
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - generator-target
      - verification-gate
  notes: ""

- id: forbidden.pattern.root-runtime-authoring-root
  label: root-level runtime/ authoring root
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "A root-level runtime/ authoring root is invalid; runtime machinery lives under packages/core/runtime/* and authored resource contracts live under resources/*."
  aliases: ["runtime/ root"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - file-placement-rejection
    - document-drift-repair
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - generator-target
      - verification-gate
  notes: ""

- id: forbidden.pattern.superseded-sdk-package-name
  label: superseded SDK package name
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Superseded SDK package names are invalid target names; @rawr/sdk is the public SDK."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - import-boundary
    - document-drift-repair
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - import-boundary
  notes: ""

- id: forbidden.pattern.role-specific-public-start-verb
  label: role-specific public start verb
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Role-specific public start verbs are invalid; startApp(...) is the canonical start verb."
  aliases: ["startServer(...)", "startAsync(...)", "startWeb(...)", "startAgent(...)", "startDesktop(...)"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - entrypoint-validation
    - app-start-canonicalization
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - generator-output
      - verification-gate
  notes: ""

- id: forbidden.pattern.plugin-projection-reclassification-field
  label: plugin projection reclassification field
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Plugin fields named exposure, visibility, publication, public, internal, kind, or adapter.kind are invalid when used to declare or reclassify projection status."
  aliases: ["exposure", "visibility", "publication", "public/internal projection fields"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"
  operational_consequence:
    - projection-classification-rejection
    - topology-builder-agreement
    - semantic-drift-detection
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - verification-gate
  notes: "A kind field remains valid only for non-projection discriminants such as kind: plugin.definition."

- id: forbidden.pattern.plugin-app-import-service-internals
  label: plugin/app import of service internals
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Plugins and apps must not import service repositories, migrations, module routers, module schemas, service-private middleware, or service-private providers."
  aliases: ["service-private import"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
  operational_consequence:
    - import-boundary
    - service-truth-protection
    - schema-ownership
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - import-boundary
      - verification-gate
  notes: ""

- id: forbidden.pattern.shared-table-write-authority-by-accident
  label: shared table write authority by accident
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Multiple services may share a database instance or pool, but they do not share table write authority or migration authority by accident."
  aliases: ["shared repository across unrelated services", "shared migration authority"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.7 Shared infrastructure is not shared semantic ownership"
  operational_consequence:
    - write-authority
    - migration-authority
    - repository-ownership
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - ownership-check
      - verification-gate
  notes: ""

- id: forbidden.pattern.profile-field-resources-for-provider-selection
  label: profile field resources for provider selection
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "A runtime profile field named resources is not the provider-selection field."
  aliases: ["resources profile field"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - provider-selection-validation
    - runtime-profile-schema
    - runtime-compiler
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - schema-requirement
      - verification-gate
  notes: "Use providers or providerSelections."

- id: forbidden.pattern.pre-provisioning-live-value-acquisition
  label: pre-provisioning live value acquisition
  type: ForbiddenPattern
  layer: runtime-realization-overlay
  status: forbidden
  definition: "No component acquires live runtime values before provisioning."
  aliases: ["import-time acquisition", "cold declaration violation"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.5 Runtime/provisioning violations"
  operational_consequence:
    - import-safety
    - provisioning-boundary
    - runtime-compiler
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - verification-gate
      - diagnostic
  notes: ""

- id: forbidden.pattern.local-http-self-call-same-process
  label: local HTTP self-call for same-process trusted caller
  type: ForbiddenPattern
  layer: runtime-realization-overlay
  status: forbidden
  definition: "Local HTTP self-calls are not the canonical path for trusted same-process callers; same-process trusted callers use service clients."
  aliases: ["same-process HTTP self-call"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-binding
    - process-runtime-access
    - internal-projection-selection
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - verification-gate
  notes: "First-party remote callers use selected server internal projections; external callers use server API projections."

- id: forbidden.pattern.async-plugin-public-product-api
  label: async plugin exposing public product API directly
  type: ForbiddenPattern
  layer: core
  status: forbidden
  definition: "Workflow, schedule, and consumer plugins do not expose public product APIs directly."
  aliases: ["workflow as public API"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.7 Async violations"
  operational_consequence:
    - ingress-role-selection
    - async-surface-boundary
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - plugin-lane-selection
      - verification-gate
  notes: ""

- id: gate.source-ref-required
  label: source reference required gate
  type: ValidationGate
  layer: authority-and-document-overlay
  status: locked
  definition: "Canonical facts must have source references."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Validation Rules"
  operational_consequence:
    - source-backed-review
    - semantic-diff-baseline
  classifier_readiness:
    status: not-applicable
    consequence:
      - none
  notes: ""

- id: gate.relation-endpoint-resolution
  label: relation endpoint resolution gate
  type: ValidationGate
  layer: authority-and-document-overlay
  status: locked
  definition: "Canonical relations must connect canonical entities or explicit overlay entities."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Validation Rules"
  operational_consequence:
    - graph-validation
    - semantic-diff-baseline
  classifier_readiness:
    status: not-applicable
    consequence:
      - none
  notes: ""

- id: gate.controlled-predicate
  label: controlled predicate gate
  type: ValidationGate
  layer: authority-and-document-overlay
  status: locked
  definition: "Canonical relations must use predicates from the approved registry."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Validation Rules"
  operational_consequence:
    - predicate-validation
    - graph-query-stability
  classifier_readiness:
    status: not-applicable
    consequence:
      - none
  notes: ""

- id: gate.forbidden-term-not-canonical
  label: forbidden term not canonical gate
  type: ValidationGate
  layer: authority-and-document-overlay
  status: locked
  definition: "Forbidden or deprecated terms must not appear as accepted target architecture without replacement or review."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Validation Rules"
  operational_consequence:
    - document-drift-detection
    - target-architecture-rejection
  classifier_readiness:
    status: locked
    consequence:
      - forbidden-move
      - verification-gate
  notes: ""

- id: gate.review-promotion-required
  label: review promotion required gate
  type: ValidationGate
  layer: authority-and-document-overlay
  status: locked
  definition: "Evidence-only and candidate facts cannot appear in canonical views without promotion."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Validation Rules"
  operational_consequence:
    - evidence-truth-separation
    - semantic-diff-baseline
  classifier_readiness:
    status: not-applicable
    consequence:
      - none
  notes: ""

- id: gate.import-safety
  label: import safety gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "Declarations must remain import-safe and cannot acquire resources, read secrets, start processes, mutate app composition, or mount native hosts on import."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.3 Import safety and declaration discipline"
  operational_consequence:
    - import-boundary
    - pre-provisioning-acquisition-rejection
  classifier_readiness:
    status: locked
    consequence:
      - verification-gate
      - forbidden-move
  notes: ""

- id: gate.public-sdk-import-surface
  label: public SDK import surface gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "Ordinary services, plugins, apps, and entrypoints import public SDK surfaces and must not import Effect internals, process runtime internals, harness mount code, raw provider acquisition, or unredacted provider config."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "4 Canonical topology and package authority"
  operational_consequence:
    - import-boundary
    - internal-runtime-protection
  classifier_readiness:
    status: locked
    consequence:
      - import-boundary
      - verification-gate
  notes: ""

- id: gate.provider-coverage
  label: provider coverage gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime compiler validates provider coverage for selected resources and profiles."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.4 Runtime profiles and process defaults; 10.2 Runtime realization lifecycle"
  operational_consequence:
    - runtime-compiler
    - provider-selection
    - provisioning-readiness
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - runtime-compiler
  notes: ""

- id: gate.provider-dependency-closure
  label: provider dependency closure gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime compiler validates provider dependency closure."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.4 Runtime profiles and process defaults; 10.2 Runtime realization lifecycle"
  operational_consequence:
    - runtime-compiler
    - bootgraph-ordering
  classifier_readiness:
    status: locked
    consequence:
      - provider-coverage
      - diagnostic
  notes: ""

- id: gate.runtime-access-boundary
  label: runtime access boundary gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "Runtime access scoping, service binding, mounted surface records, and harness handoff must remain inside process runtime boundaries."
  aliases: []
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "process runtime definition"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - service-binding
    - adapter-lowering
    - harness-handoff
  classifier_readiness:
    status: locked
    consequence:
      - runtime-compiler
      - diagnostic
  notes: ""

- id: gate.binding-cache
  label: binding cache gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "ServiceBindingCacheKey must exclude invocation and binding collisions must be diagnosable."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-binding-cache
    - invocation-separation
  classifier_readiness:
    status: locked
    consequence:
      - verification-gate
      - diagnostic
  notes: ""

- id: gate.projection-classification
  label: projection classification gate
  type: ValidationGate
  layer: core
  status: locked
  definition: "Plugin projection identity must agree between topology and lane-specific builder; app selection and publication policy cannot reclassify it."
  aliases: ["topology-builder agreement gate"]
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"
  operational_consequence:
    - plugin-file-placement
    - lane-builder-selection
    - forbidden-field-rejection
  classifier_readiness:
    status: locked
    consequence:
      - plugin-lane-selection
      - verification-gate
  notes: ""

- id: gate.catalog-emission
  label: catalog emission gate
  type: ValidationGate
  layer: runtime-realization-overlay
  status: locked
  definition: "RuntimeCatalog and diagnostics must emit redacted read models of runtime state."
  aliases: []
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - observation
    - diagnostics
    - topology-records
  classifier_readiness:
    status: locked
    consequence:
      - diagnostic
      - runtime-preflight
  notes: ""

- id: gate.classifier-operational-consequence
  label: classifier operational consequence gate
  type: ValidationGate
  layer: classifier-readiness-overlay
  status: locked
  definition: "A classifier category must change enforcement consequences or remain a label, not a classifier category."
  aliases: []
  source_refs:
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "2 Canonical thesis; core invariant"
    - path: ontology-system-design.md
      section: "Future Classifier Link"
  operational_consequence:
    - classifier-readiness
    - rule-pack-rejection
  classifier_readiness:
    status: locked
    consequence:
      - required-gate
      - forbidden-move
      - generator-output
  notes: ""
```

---

## 5. Canonical Relation Seed

```yaml
- id: rel.packages-support-kinds
  subject: core.kind.package
  predicate: supports
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.6 Projection and assembly law"
  operational_consequence:
    - legal-dependency-direction
    - non-truth-owner
    - import-boundary

- id: rel.packages-support-resources
  subject: core.kind.package
  predicate: supports
  object: core.kind.resource
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.6 Projection and assembly law"
  operational_consequence:
    - support-boundary
    - non-resource-owner

- id: rel.services-own-truth
  subject: core.kind.service
  predicate: owns_truth
  object: core.boundary.service-boundary
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law"
  operational_consequence:
    - ownership
    - semantic-drift-detection
    - classifier-narrowing

- id: rel.services-own-schema
  subject: core.kind.service
  predicate: owns_schema
  object: core.kind.repository
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.1 Service ownership"
  operational_consequence:
    - schema-ownership
    - migration-authority
    - write-authority

- id: rel.repository-under-service
  subject: core.kind.repository
  predicate: depends_on
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns"
  operational_consequence:
    - service-internal-file-placement
    - import-boundary
    - ownership-drift-detection

- id: rel.service-family-not-owner
  subject: core.kind.service-family
  predicate: does_not_own
  object: core.boundary.service-boundary
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.8 Namespace is not ownership"
  operational_consequence:
    - ownership-drift-detection
    - file-placement-review

- id: rel.plugins-project-service-truth
  subject: core.kind.plugin
  predicate: projects
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 8.12 Plugin authoring invariants"
  operational_consequence:
    - projection
    - non-truth-owner
    - app-selection

- id: rel.plugins-own-projection
  subject: core.kind.plugin
  predicate: owns_projection
  object: core.projection.role-surface-capability-lane
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "3 Ownership laws"
  operational_consequence:
    - lane-classification
    - topology-builder-agreement
    - classifier-narrowing

- id: rel.plugins-use-service
  subject: core.kind.plugin
  predicate: declares
  object: core.plugin.use-service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
  operational_consequence:
    - service-use-declaration
    - service-binding-plan
    - import-boundary

- id: rel.apps-select-plugins
  subject: core.kind.app
  predicate: selects
  object: core.kind.plugin
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.2 App composition posture; 9.3 App authoring law"
  operational_consequence:
    - app-membership
    - sdk-derivation
    - semantic-drift-detection

- id: rel.apps-own-selection
  subject: core.kind.app
  predicate: owns_selection
  object: core.kind.app-composition
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.2 App composition posture"
  operational_consequence:
    - app-composition-authority
    - app-membership
    - sdk-derivation

- id: rel.app-composition-alias-manifest
  subject: core.kind.app-composition
  predicate: replaces
  object: core.kind.manifest
  layer: authority-and-document-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "1 Scope; 3.2 Stable semantic nouns"
  operational_consequence:
    - alias-resolution
    - document-drift-detection
    - semantic-diff

- id: rel.define-app-produces-app-definition
  subject: core.app.define-app
  predicate: produces
  object: core.app.app-definition
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "1 Scope; 9.3 App authoring law"
  operational_consequence:
    - app-authoring
    - sdk-derivation-input

- id: rel.runtime-profile-selects-provider-selection
  subject: core.app.runtime-profile
  predicate: selects
  object: core.app.provider-selection
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.4 Runtime profiles and process defaults"
  operational_consequence:
    - provider-selection
    - provider-coverage
    - runtime-compiler

- id: rel.entrypoint-selects-process-shape
  subject: core.kind.entrypoint
  predicate: selects
  object: core.app.process-shape
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints"
  operational_consequence:
    - process-shape
    - runtime-compiler-input
    - placement-separation

- id: rel.start-app-starts-one-process
  subject: core.app.start-app
  predicate: produces
  object: runtime.machine.process
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints"
  operational_consequence:
    - process-runtime-assembly
    - runtime-compiler
    - diagnostic

- id: rel.entrypoint-not-app-membership-owner
  subject: core.kind.entrypoint
  predicate: does_not_own
  object: core.kind.app-composition
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints; 9.6 App selection, process shape, and surface remain distinct"
  operational_consequence:
    - app-membership-protection
    - semantic-drift-detection

- id: rel.resource-declares-contract
  subject: core.kind.resource
  predicate: declares
  object: core.resource.runtime-resource
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.4 Resource and boundary nouns; 4.6 Projection and assembly law"
  operational_consequence:
    - resource-contract
    - provider-coverage
    - runtime-compiler

- id: rel.provider-implements-resource
  subject: core.kind.provider
  predicate: implements
  object: core.kind.resource
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.1 Ownership law; 4.6 Projection and assembly law"
  operational_consequence:
    - provider-implementation
    - provider-selection-validation

- id: rel.provider-does-not-select-itself
  subject: core.kind.provider
  predicate: does_not_own
  object: core.app.provider-selection
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - provider-selection-validation
    - forbidden-path-rejection

- id: rel.resource-does-not-acquire-itself
  subject: core.kind.resource
  predicate: does_not_own
  object: runtime.phase.provisioning
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - provisioning-boundary
    - runtime-compiler

- id: rel.services-declare-resource-requirements
  subject: core.kind.service
  predicate: declares
  object: core.resource.resource-requirement
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - resource-requirement
    - provider-coverage
    - runtime-compiler

- id: rel.plugins-declare-resource-requirements
  subject: core.kind.plugin
  predicate: declares
  object: core.resource.resource-requirement
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - resource-requirement
    - provider-coverage
    - runtime-compiler

- id: rel.service-lane-deps-binding
  subject: core.lane.deps
  predicate: requires
  object: runtime.artifact.service-binding-plan
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.5 Service-boundary lanes"
  operational_consequence:
    - construction-time-binding
    - service-binding-plan

- id: rel.service-lane-scope-cache-key
  subject: core.lane.scope
  predicate: requires
  object: runtime.artifact.service-binding-cache-key
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.3 Context lanes; 26.6 Service binding violations"
  operational_consequence:
    - construction-time-binding
    - binding-cache

- id: rel.service-lane-config-cache-key
  subject: core.lane.config
  predicate: requires
  object: runtime.artifact.service-binding-cache-key
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "10.3 Context lanes; 26.6 Service binding violations"
  operational_consequence:
    - construction-time-binding
    - binding-cache

- id: rel.invocation-excluded-from-cache-key
  subject: core.lane.invocation
  predicate: separate_from
  object: runtime.artifact.service-binding-cache-key
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-binding-cache-validation
    - per-call-boundary

- id: rel.provided-service-middleware-output
  subject: core.lane.provided
  predicate: produced_by
  object: core.kind.service
  layer: core
  status: candidate
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-pipeline-validation
    - runtime-seeding-rejection
```

Note: `produced_by` is not in the controlled predicate set above, so this candidate relation should either be rewritten as `core.kind.service produces core.lane.provided` or the predicate should remain candidate. Canonical rewrite follows:

```yaml
- id: rel.service-produces-provided
  subject: core.kind.service
  predicate: produces
  object: core.lane.provided
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-pipeline-validation
    - runtime-seeding-rejection
```

```yaml
- id: rel.runtime-not-seed-provided
  subject: runtime.machine.process-runtime
  predicate: does_not_own
  object: core.lane.provided
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - runtime-boundary
    - binding-validation
    - diagnostic

- id: rel.server-api-projection-topology
  subject: core.surface.server-api
  predicate: requires
  object: gate.projection-classification
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"
  operational_consequence:
    - plugin-file-placement
    - builder-agreement
    - forbidden-field-rejection

- id: rel.server-internal-projection-topology
  subject: core.surface.server-internal
  predicate: requires
  object: gate.projection-classification
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"
  operational_consequence:
    - plugin-file-placement
    - builder-agreement
    - trusted-surface-classification

- id: rel.async-workflow-projects-service-truth
  subject: core.surface.async-workflow
  predicate: projects
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape; 4.10 Ingress and execution law"
  operational_consequence:
    - durable-execution
    - async-harness-mounting

- id: rel.async-schedule-projects-service-or-host-capability
  subject: core.surface.async-schedule
  predicate: projects
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape; 4.10 Ingress and execution law"
  operational_consequence:
    - scheduled-durable-work
    - async-harness-mounting

- id: rel.async-consumer-projects-service-or-host-capability
  subject: core.surface.async-consumer
  predicate: projects
  object: core.kind.service
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape"
  operational_consequence:
    - event-consumption
    - async-harness-mounting

- id: rel.desktop-background-not-async
  subject: core.surface.desktop-background
  predicate: separate_from
  object: core.role.async
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "8.11 Desktop projection; 4.10 Ingress and execution law"
  operational_consequence:
    - process-local-loop-boundary
    - durable-work-rejection

- id: rel.agent-durable-work-on-async
  subject: core.role.agent
  predicate: depends_on
  object: core.role.async
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law; 4.11 Shell versus steward authority law"
  operational_consequence:
    - durable-steward-execution-boundary
    - governed-work-handoff

- id: rel.sdk-derives-normalized-authoring-graph
  subject: runtime.machine.sdk-derivation
  predicate: derives
  object: runtime.artifact.normalized-authoring-graph
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.4 SDK derivation"
  operational_consequence:
    - sdk-output
    - runtime-compiler-input

- id: rel.sdk-derives-service-binding-plan
  subject: runtime.machine.sdk-derivation
  predicate: derives
  object: runtime.artifact.service-binding-plan
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.4 SDK derivation"
  operational_consequence:
    - sdk-output
    - process-runtime-binding

- id: rel.sdk-derives-surface-runtime-plan
  subject: runtime.machine.sdk-derivation
  predicate: derives
  object: runtime.artifact.surface-runtime-plan
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.4 SDK derivation"
  operational_consequence:
    - sdk-output
    - runtime-compiler-input
    - adapter-lowering-input

- id: rel.runtime-compiler-compiles-process-plan
  subject: runtime.machine.runtime-compiler
  predicate: compiles_to
  object: runtime.artifact.compiled-process-plan
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - bootgraph-input
    - process-runtime-input
    - runtime-compiler-gate

- id: rel.runtime-compiler-produces-provider-dependency-graph
  subject: runtime.machine.runtime-compiler
  predicate: produces
  object: runtime.artifact.provider-dependency-graph
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.2 Runtime realization lifecycle"
  operational_consequence:
    - provider-dependency-closure
    - bootgraph-ordering

- id: rel.runtime-compiler-validates-provider-coverage
  subject: runtime.machine.runtime-compiler
  predicate: validated_by
  object: gate.provider-coverage
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.4 Runtime profiles and process defaults"
  operational_consequence:
    - provider-coverage
    - runtime-preflight
    - diagnostic

- id: rel.bootgraph-orders-provider-acquisition
  subject: runtime.machine.bootgraph
  predicate: orders
  object: runtime.artifact.provider-dependency-graph
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - lifecycle-ordering
    - rollback
    - finalization

- id: rel.provisioning-kernel-provisions-runtime-access
  subject: runtime.machine.provisioning-kernel
  predicate: provisions
  object: runtime.artifact.runtime-access
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - resource-acquisition
    - live-access
    - process-role-scope

- id: rel.provisioning-produces-managed-runtime
  subject: runtime.machine.provisioning-kernel
  predicate: produces
  object: runtime.artifact.managed-runtime-handle
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.5 Runtime/provisioning violations; 28 Canonical runtime realization picture"
  operational_consequence:
    - one-root-managed-runtime
    - deterministic-disposal

- id: rel.process-runtime-binds-services
  subject: runtime.machine.process-runtime
  predicate: binds
  object: core.kind.service
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - service-binding
    - service-binding-cache
    - live-client-creation

- id: rel.process-runtime-produces-binding-cache
  subject: runtime.machine.process-runtime
  predicate: produces
  object: runtime.artifact.service-binding-cache
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - binding-cache
    - cache-collision-diagnostics

- id: rel.process-runtime-materializes-dispatcher
  subject: runtime.machine.process-runtime
  predicate: produces
  object: runtime.artifact.workflow-dispatcher
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - workflow-dispatcher-materialization
    - async-server-handoff

- id: rel.process-runtime-produces-mounted-surface-record
  subject: runtime.machine.process-runtime
  predicate: produces
  object: runtime.artifact.mounted-surface-runtime-record
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - surface-mount-record
    - runtime-catalog-input

- id: rel.surface-adapter-lowers-to-mounted-record
  subject: runtime.machine.surface-adapter
  predicate: lowers_to
  object: runtime.artifact.mounted-surface-runtime-record
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "28 Canonical runtime realization picture"
  operational_consequence:
    - adapter-lowering
    - harness-facing-payload

- id: rel.async-adapter-produces-function-bundle
  subject: core.surface.async-workflow
  predicate: produces
  object: runtime.artifact.function-bundle
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - async-lowering
    - function-bundle-gate

- id: rel.harness-mounts-started-harness
  subject: runtime.machine.harness
  predicate: mounts
  object: runtime.artifact.started-harness
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - native-host-mounting
    - harness-finalization

- id: rel.diagnostics-observes-runtime-catalog
  subject: runtime.machine.diagnostics
  predicate: observes
  object: runtime.artifact.runtime-catalog
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table; 28 Canonical runtime realization picture"
  operational_consequence:
    - observation
    - diagnostic-read-model
    - control-plane-touchpoints

- id: rel.diagnostics-produce-runtime-diagnostic
  subject: runtime.machine.diagnostics
  predicate: produces
  object: runtime.artifact.runtime-diagnostic
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - diagnostic-coverage
    - invalid-path-reporting

- id: rel.runtime-telemetry-observes-all-phases
  subject: runtime.artifact.runtime-telemetry
  predicate: observes
  object: runtime.phase.observation
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Runtime artifact table"
  operational_consequence:
    - telemetry-correlation
    - runtime-observation

- id: rel.runtime-finalization-not-eighth-phase
  subject: runtime.machine.process-runtime
  predicate: finalizes
  object: runtime.phase.observation
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.1 Runtime realization stance"
  operational_consequence:
    - finalization-observation
    - lifecycle-phase-integrity

- id: rel.root-core-forbidden
  subject: law.direction.semantic-direction
  predicate: forbids
  object: forbidden.pattern.root-core-authoring-root
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - file-placement-rejection
    - generator-target-rejection

- id: rel.root-runtime-forbidden
  subject: law.direction.semantic-direction
  predicate: forbids
  object: forbidden.pattern.root-runtime-authoring-root
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - file-placement-rejection
    - generator-target-rejection

- id: rel.start-app-replaces-role-start-verbs
  subject: core.app.start-app
  predicate: replaces
  object: forbidden.pattern.role-specific-public-start-verb
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
  operational_consequence:
    - entrypoint-authoring
    - forbidden-term-repair

- id: rel.projection-fields-forbidden
  subject: gate.projection-classification
  predicate: forbids
  object: forbidden.pattern.plugin-projection-reclassification-field
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"
  operational_consequence:
    - projection-classification
    - topology-builder-agreement
    - diagnostic

- id: rel.plugins-apps-forbidden-service-internals
  subject: gate.public-sdk-import-surface
  predicate: forbids
  object: forbidden.pattern.plugin-app-import-service-internals
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
  operational_consequence:
    - import-boundary
    - service-truth-protection

- id: rel.shared-table-write-authority-forbidden
  subject: law.shared-infrastructure-not-ownership
  predicate: forbids
  object: forbidden.pattern.shared-table-write-authority-by-accident
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"
  operational_consequence:
    - write-authority
    - migration-authority
    - ownership-drift-detection

- id: rel.profile-resources-field-forbidden
  subject: core.app.runtime-profile
  predicate: forbids
  object: forbidden.pattern.profile-field-resources-for-provider-selection
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.4 Resource/provider/profile violations"
  operational_consequence:
    - runtime-profile-schema
    - provider-selection-validation

- id: rel.import-safety-forbids-preprovisioning-acquisition
  subject: gate.import-safety
  predicate: forbids
  object: forbidden.pattern.pre-provisioning-live-value-acquisition
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "10.3 Import safety and declaration discipline"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.5 Runtime/provisioning violations"
  operational_consequence:
    - import-safety
    - provisioning-boundary
    - diagnostic

- id: rel.same-process-service-client-replaces-http-self-call
  subject: runtime.machine.process-runtime
  predicate: replaces
  object: forbidden.pattern.local-http-self-call-same-process
  layer: runtime-realization-overlay
  status: locked
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.6 Service binding violations"
  operational_consequence:
    - service-binding
    - trusted-caller-path
    - diagnostic

- id: rel.server-role-own-product-ingress
  subject: core.role.server
  predicate: owns_projection
  object: core.surface.server-api
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - ingress-role-selection
    - plugin-lane-selection

- id: rel.agent-role-own-conversational-ingress
  subject: core.role.agent
  predicate: owns_projection
  object: core.surface.agent-channel
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - conversational-ingress
    - shell-gateway-boundary

- id: rel.async-role-own-durable-work
  subject: core.role.async
  predicate: owns_projection
  object: core.surface.async-workflow
  layer: core
  status: locked
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.10 Ingress and execution law"
  operational_consequence:
    - durable-system-work
    - async-harness-mounting

- id: rel.classifier-readiness-consequence-required
  subject: gate.classifier-operational-consequence
  predicate: requires
  object: gate.review-promotion-required
  layer: classifier-readiness-overlay
  status: locked
  source_refs:
    - path: ontology-system-design.md
      section: "Future Classifier Link"
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "2 Canonical thesis"
  operational_consequence:
    - classifier-rule-pack-safety
    - no-label-only-category

- id: rel.canonical-spec-authority-core
  subject: authority.doc.canonical-architecture-spec
  predicate: is_authority_for
  object: core.root.services
  layer: authority-and-document-overlay
  status: locked
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - source-of-truth-baseline
    - semantic-diff

- id: rel.runtime-spec-authority-runtime-overlay
  subject: authority.doc.effect-runtime-realization-spec
  predicate: is_authority_for
  object: runtime.phase.compilation
  layer: authority-and-document-overlay
  status: locked
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - source-of-truth-baseline
    - runtime-diff

- id: rel.classifier-spec-not-core-authority
  subject: authority.doc.authoring-classifier-spec
  predicate: separate_from
  object: authority.doc.canonical-architecture-spec
  layer: authority-and-document-overlay
  status: locked
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - authority-scope
    - classifier-readiness-conservatism
```

The three authority document entities referenced above should be added to the authority overlay seed if the next step stores ontology files:

```yaml
- id: authority.doc.canonical-architecture-spec
  label: RAWR_Canonical_Architecture_Spec.md
  type: DocumentAuthority
  layer: authority-and-document-overlay
  status: locked
  definition: "Primary authority for durable core ontology, repository roots, semantic nouns, ownership laws, semantic direction, and stable architecture versus runtime realization."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - source-of-truth-baseline
    - semantic-diff
  classifier_readiness:
    status: not-applicable
    consequence: []
  notes: ""

- id: authority.doc.effect-runtime-realization-spec
  label: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
  type: DocumentAuthority
  layer: authority-and-document-overlay
  status: locked
  definition: "Primary authority for runtime realization ownership, lifecycle, runtime artifacts, producer/consumer handoffs, and forbidden runtime patterns."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - source-of-truth-baseline
    - runtime-diff
  classifier_readiness:
    status: not-applicable
    consequence: []
  notes: ""

- id: authority.doc.authoring-classifier-spec
  label: RAWR_Authoring_Classifier_System_Canonical_Spec.md
  type: DocumentAuthority
  layer: classifier-readiness-overlay
  status: candidate
  definition: "Future-goal reference for operational/classifier pressure, not a current source-of-truth authority for core architecture."
  aliases: []
  source_refs:
    - path: ontology-design.md
      section: "Source Map"
  operational_consequence:
    - classifier-readiness
    - rule-pack-design-pressure
  classifier_readiness:
    status: candidate
    consequence:
      - operational-consequence
      - rule-pack-candidate
  notes: "Must not override finalized architecture/runtime specs."
```

---

## 6. Candidate Queue

```yaml
- id: candidate.reserved.auth-posture
  label: "auth posture"
  owner: "Dedicated auth subsystem or app/runtime profile policy once specified."
  hook: "Classifier operational classification may need trust boundary, caller kind, actor kind, credential kind, verifier requirement, and service authorization owner."
  required_input_output: "Input: intent/surface/caller/trust facts. Output: required verifier/resource/profile/plugin policy and service authorization owner."
  diagnostic_expectation: "Missing verifier, mismatched public ingress, ambiguous actor, or service authorization owner unclear."
  enforcement_placeholder: "classifier_readiness.status=tbd; require auth-specific spec before locked rule-pack emission."
  promotion_trigger: "Canonical auth subsystem spec defines ownership, schema, gates, and runtime compiler expectations."
  why_it_might_matter: "Classifier spec makes auth posture operationally relevant, but the core architecture/runtime specs do not fully settle auth rules."
  source_span_suggests_it:
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "Operational classification nouns and failure modes"
  classifier_relevance: true

- id: candidate.reserved.semantic-dep-adapter
  label: "semanticDep adapter plan"
  owner: "SDK service derivation and process runtime binding."
  hook: "semanticDep(...)"
  required_input_output: "Input: adapter declaration, service boundary refs, runtime access. Output: bound semantic adapter value."
  diagnostic_expectation: "Adapter missing, cycle, incompatible scope."
  enforcement_placeholder: "Allow explicit placeholder adapters only; deeper adapter support requires dedicated spec."
  promotion_trigger: "Dedicated semantic dependency adapter spec defines supported adapter semantics and validation."
  why_it_might_matter: "semanticDep is named in service helper rules, but deeper support is reserved."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table; 10.4 Dependency helper rules"
  classifier_relevance: true

- id: candidate.reserved.agent-governance
  label: "Agent/OpenShell governance"
  owner: "Agent harness, OpenShell resource boundary, app policy hooks."
  hook: "Agent harness policy hook and runtime resource access."
  required_input_output: "Input: agent surfaces, shell policy, process access. Output: mounted shell/channel/tool payloads."
  diagnostic_expectation: "Policy violation, tool denied, governance handoff failure."
  enforcement_placeholder: "Agent plugins do not bypass services or own runtime access broadly."
  promotion_trigger: "Dedicated agent governance spec defines policy primitives beyond diagnostics."
  why_it_might_matter: "Agent role is locked, but governance details are operational and not fully settled in the requested source pair."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table"
  classifier_relevance: true

- id: candidate.reserved.key-kms-resources
  label: "Key/KMS resources"
  owner: "Resource catalog and providers."
  hook: "resources/key-* or resources/kms-* descriptors."
  required_input_output: "Input: Key/KMS provider config and resource requirement. Output: provisioned key-management client/value."
  diagnostic_expectation: "Secret exposure, provider mismatch, key policy failure."
  enforcement_placeholder: "KMS provider does not own domain truth."
  promotion_trigger: "Dedicated key rotation or crypto policy spec."
  why_it_might_matter: "Security-sensitive runtime resources need strong schema/diagnostic boundaries."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table"
  classifier_relevance: true

- id: candidate.reserved.multi-process-placement-policy
  label: "multi-process placement policy"
  owner: "Deployment/control-plane architecture."
  hook: "Runtime catalog/control-plane touchpoints."
  required_input_output: "Input: process plan metadata, topology records, health records. Output: placement decision outside runtime realization."
  diagnostic_expectation: "Placement mismatch or unsupported topology."
  enforcement_placeholder: "Runtime realization owns one process only."
  promotion_trigger: "Deployment/control-plane policy spec is accepted for placement."
  why_it_might_matter: "Core/runtime specs separate process shape from placement; deployment is downstream and not in this core ontology except as separation."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table"
  classifier_relevance: true

- id: candidate.reserved.desktop-native-interiors
  label: "desktop native interiors"
  owner: "Desktop harness."
  hook: "Desktop surface adapter payloads."
  required_input_output: "Input: menubar/window/background compiled plans. Output: native desktop mount payloads."
  diagnostic_expectation: "IPC, bridge, lifecycle, or permission diagnostics."
  enforcement_placeholder: "Desktop native internals do not become RAWR roles."
  promotion_trigger: "Desktop native APIs, IPC, or security policy are standardized."
  why_it_might_matter: "Desktop role/surfaces are locked, but detailed native interior policy is reserved."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table"
  classifier_relevance: true

- id: candidate.reserved.lane-native-implementation-details
  label: "lane-specific native implementation details"
  owner: "Owning plugin package and harness."
  hook: "Lane-specific adapter interface."
  required_input_output: "Input: compiled surface plan and bound clients. Output: native route/function/command/window/tool payload."
  diagnostic_expectation: "Adapter-specific lowering diagnostics."
  enforcement_placeholder: "Native details do not classify projection status."
  promotion_trigger: "A lane needs deeper public authoring rules."
  why_it_might_matter: "Projection lanes are locked; native builder detail may become operational but should not reclassify projection identity."
  source_span_suggests_it:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "Reserved boundaries table"
  classifier_relevance: true

- id: candidate.classifier.ontology-rule-pack
  label: "ontology rule pack"
  why_it_might_matter: "Future classifier uses deterministic rules derived from canonical specs."
  source_span_suggests_it:
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "Classifier lifecycle and rule-pack posture"
  decision_required_before_promotion: "Define concrete rule-pack schema, derivation source, gate linkage, and rejection trace format."
  classifier_relevance: true
  status: candidate

- id: candidate.classifier.constraint-graph
  label: "constraint graph"
  why_it_might_matter: "Future classifier needs a legal-space graph derived from canonical ontology, intent, repo facts, and rule packs."
  source_span_suggests_it:
    - path: ontology-system-design.md
      section: "Future Classifier Link"
  decision_required_before_promotion: "Define graph inputs, narrowing semantics, rejected alternative trace, and reclassification rules."
  classifier_relevance: true
  status: candidate

- id: candidate.deployment.platform-service
  label: "platform service"
  why_it_might_matter: "Canonical architecture names platform service as service-centric operational unit, but deployment realization is downstream and not part of current core source pair."
  source_span_suggests_it:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.3 Runtime realization nouns; operational mapping"
  decision_required_before_promotion: "Deployment ontology overlay accepted; otherwise keep as runtime/placement separation evidence."
  classifier_relevance: true
  status: candidate

- id: candidate.export.capability-bundle
  label: "CapabilityBundle"
  why_it_might_matter: "Export/foundry docs may need future overlay, but export is outside current core architecture ontology."
  source_span_suggests_it:
    - path: RAWR_Capability_Bundle_and_Retargeting_Spec.md
      section: "Scope and canonical nouns"
  decision_required_before_promotion: "Decide whether export-mode ontology is an overlay and which gates connect it to core."
  classifier_relevance: false
  status: candidate

- id: candidate.workstream.workstream
  label: "workstream"
  why_it_might_matter: "Workstreams are durable coordination objects in adjacent RAWR specs but not core architecture truth for this draft."
  source_span_suggests_it:
    - path: RAWR_Workstream_System_Canonical_Spec.md
      section: "Canonical claim"
  decision_required_before_promotion: "Decide if workstream belongs to a separate subsystem ontology or authority overlay, not core architecture."
  classifier_relevance: possible
  status: candidate

- id: candidate.term.dashboard-service
  label: "dashboard-service"
  why_it_might_matter: "A dashboard request may imply a service, but dashboard UI code alone is not service truth."
  source_span_suggests_it:
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "Failure modes"
  decision_required_before_promotion: "Only promote if it owns durable semantic truth, contracts, schemas, invariants, and write authority."
  classifier_relevance: true
  status: candidate

- id: candidate.term.workflow-service
  label: "workflow-service"
  why_it_might_matter: "A workflow projection may need service truth, but workflow registration alone is an async projection, not a service."
  source_span_suggests_it:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape"
  decision_required_before_promotion: "Promote only if it identifies a real semantic service boundary, not a durable execution projection."
  classifier_relevance: true
  status: candidate
```

---

## 7. Explicit Exclusions

```yaml
- id: exclusion.dashboard-service-ui-only
  example: "dashboard-service when it only means UI code"
  reason: "Dashboard UI is a web projection unless it owns service truth, schemas, invariants, and write authority. A dashboard request may imply a service, but does not automatically create one."
  replacement_or_review_path: "Classify service truth first, then project into web/server/agent/etc. lanes as needed."
  source_refs:
    - path: RAWR_Authoring_Classifier_System_Canonical_Spec.md
      section: "Failure modes"
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.2 Truth, surfaces, and selection"

- id: exclusion.workflow-service-projection-only
  example: "workflow-service when it only registers a durable execution projection"
  reason: "Durable workflows are async projections. Service truth remains in services. Workflow, schedule, and consumer plugins do not expose public product APIs directly."
  replacement_or_review_path: "Use service + async workflow projection; server API/internal projection handles callable ingress where needed."
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "2.1 Universal shape; 4.10 Ingress and execution law"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.7 Async violations"

- id: exclusion.shared-repository-root
  example: "shared-repository across unrelated services"
  reason: "Repositories are service-internal persistence mechanics. Shared infrastructure is allowed; shared semantic write authority, migration authority, and repository ownership by accident are not."
  replacement_or_review_path: "Use service-owned repositories/migrations; extract lower-level SQL utilities to packages/ if they are support matter."
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "3.2 Stable semantic nouns; 4.7 Shared infrastructure is not shared semantic ownership"
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"

- id: exclusion.plugin-exposure-visibility-reclassification
  example: "plugin exposure/visibility/public/internal fields that reclassify projection status"
  reason: "Plugin projection identity is classified by topology plus lane-specific builder. App selection and harness publication policy may select or publish already-classified projections, not reclassify them."
  replacement_or_review_path: "Use correct topology and lane builder: e.g. plugins/server/api/* or plugins/server/internal/*."
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.2 Projection classification violations"

- id: exclusion.role-specific-public-start-verbs
  example: "startServer(...), startAsync(...), startWeb(...), startAgent(...), startDesktop(...)"
  reason: "startApp(...) is the canonical app start operation. Role-specific public start verbs are invalid because the entrypoint selects role slices through one app start operation."
  replacement_or_review_path: "Use startApp(appDefinition, { entrypointId, profile, roles })."
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.5 Entrypoints"

- id: exclusion.root-core-runtime-roots
  example: "root-level core/ or runtime/ authoring roots"
  reason: "The current locked physical topology places platform machinery under packages/core/* and authored provisionable capability contracts under resources/*."
  replacement_or_review_path: "Use packages/core/runtime/* and resources/*."
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.1 Topology and naming violations"

- id: exclusion.app-composition-as-bootgraph
  example: "rawr.<app>.ts treated as bootgraph, process, provider acquisition plan, or second runtime artifact"
  reason: "The app composition file declares app identity and selected plugin membership. It is not bootgraph, process, platform service definition, provider acquisition plan, control plane, or second runtime artifact above AppDefinition."
  replacement_or_review_path: "Keep app composition as AppDefinition source; runtime compiler/bootgraph/provisioning/process runtime handle realization."
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "9.2 App composition posture; 9.3 App authoring law"

- id: exclusion.service-client-as-runtime-resource
  example: "service-to-service client selected through RuntimeProfile"
  reason: "Service-to-service clients are not runtime resources. They are service dependencies materialized by service binding."
  replacement_or_review_path: "Use serviceDep(...) and process runtime service binding."
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "26.3 Service boundary violations"

- id: exclusion.runtime-schema-transfers-service-truth
  example: "RuntimeSchema treated as owner of service procedure payload semantics"
  reason: "RuntimeSchema is for runtime-owned and runtime-carried boundary schema declarations; service procedure payloads and plugin contracts remain owned by their service or plugin boundary."
  replacement_or_review_path: "Use RuntimeSchema for resource/provider/profile/service lanes and diagnostics; use service/plugin-owned schemas for callable payloads."
  source_refs:
    - path: RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
      section: "8 Schema ownership and RuntimeSchema"

- id: exclusion.native-framework-as-semantic-owner
  example: "Effect, oRPC, Elysia, Inngest, OCLIF, OpenShell, web host, or desktop host modeled as peer semantic owner"
  reason: "Harness and substrate choices are downstream of semantic meaning. Native interiors own native execution semantics after RAWR handoff, not RAWR ontology."
  replacement_or_review_path: "Model as harness/substrate/boundary machinery only where needed."
  source_refs:
    - path: RAWR_Canonical_Architecture_Spec.md
      section: "4.9 Harness and substrate choice are downstream"

- id: exclusion.generated-implementation-details
  example: "every generated file, every import alias, every example capability"
  reason: "Ontology design requires curated canonical entities, not every extracted noun phrase, file path, package import, or example capability."
  replacement_or_review_path: "Store in evidence ledger or generator metadata unless it changes ownership, construction, validation, or realization."
  source_refs:
    - path: ontology-design.md
      section: "Entity Design Rules"
```

---

## 8. Review Checklist

```yaml
- check: "Canonical graph has roughly 50-150 entities."
  expected: true
  notes: "This draft has 101 canonical/canonical-overlay entities before candidate queue."

- check: "Every canonical entity has source refs."
  expected: true
  notes: "Each entity seed includes path and section."

- check: "Every canonical relation uses a controlled predicate."
  expected: true
  notes: "One intentionally shown candidate relation used produced_by and was immediately rewritten; do not store produced_by as canonical."

- check: "Every relation direction matters."
  expected: true
  notes: "Direction encodes owner -> owned, producer -> artifact, selector -> selected item, or law/gate -> forbidden pattern."

- check: "Uncertainty is marked as candidate/tbd/evidence-only."
  expected: true
  notes: "semanticDep deeper support, auth posture, agent governance, and reserved operational seams are not locked classifier facts."

- check: "Classifier-readiness annotations have operational consequences."
  expected: true
  notes: "Each classifier-ready entity uses consequences such as file placement, import boundary, generator target, provider coverage, runtime compiler, diagnostic, or verification gate."

- check: "No source-authority claim is confused with certainty."
  expected: true
  notes: "Authority overlay separates document authority from locked/candidate/tbd status."

- check: "No evidence-only term is silently promoted."
  expected: true
  notes: "Workstream, export, deployment, dashboard-service, and workflow-service are candidate/exclusion items, not core truth."

- check: "Every classifier-relevant category has an enforcement consequence."
  expected: true
  notes: "Architecture kinds, projection lanes, resource/profile/provider concepts, forbidden patterns, and gates all list consequences."

- check: "Any unresolved classifier implication is labeled candidate, tbd, or reserved, not locked."
  expected: true
  notes: "Auth posture, detailed agent governance, semanticDep adapter depth, deployment placement, and desktop native internals remain reserved or candidate."

- check: "Runtime realization is overlay, not peer public architecture."
  expected: true
  notes: "Runtime phases/artifacts/machinery are subordinate to core architecture and modeled under runtime-realization-overlay."

- check: "Document overlay remains minimal."
  expected: true
  notes: "Only source document identity, authority scope, source refs, supersession/replacement, and review findings are modeled."

- check: "Forbidden/deprecated patterns have replacement or rejection path."
  expected: true
  notes: "Each forbidden pattern includes replacement/review route or operational rejection consequence."

- check: "No `mentions` predicate appears in decision graph."
  expected: true
  notes: "Mentions belong only in evidence metadata."

- check: "No deployment/control-plane ontology is silently merged into core."
  expected: true
  notes: "Platform service and multi-process placement remain candidate/downstream unless deployment overlay is approved."
```
