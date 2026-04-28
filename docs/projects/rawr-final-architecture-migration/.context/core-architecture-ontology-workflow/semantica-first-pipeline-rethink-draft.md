# semantica-First Architecture Document Comparison Draft

Status: draft synthesis
Date: 2026-04-27
Scope: RAWR architecture-document semantic comparison, core ontology governance, evidence extraction, and future semantic-intelligence workflow design

## Purpose

This draft reframes the RAWR architecture-document comparison workflow around semantica as the primary semantic substrate. The current workbench has useful RAWR-specific governance, ontology, evidence, and review conventions, but too much of the actual semantic work still happens in local heuristics and custom Python control flow.

The intended direction is:

```text
RAWR owns truth, authority policy, ontology promotion, and review semantics.
semantica owns as much of the semantic substrate as the pinned package can prove: ingest, split, extraction, provenance, graph, conflicts, reasoning, pipeline, MCP/server, export, and visualization.
```

This is not an implementation plan. It is a standalone overview and draft workflow shape for the next implementation-planning stage.

## Current State

The repo-local workbench lives under `tools/semantica-workbench/`. Tracked source, prompts, ontology definitions, tests, and manifests live in the repo; generated runs, reports, viewers, and the virtual environment live under ignored `.semantica/`.

The workbench currently exposes two broad paths.

The older packet extraction path is manifest-driven:

```text
semantic-source-manifest.yaml
  -> chunk_markdown
  -> seed graph
  -> heuristic or direct-OpenAI extraction
  -> normalized ontology/evidence artifacts
  -> custom semantic-diff report
```

The newer reviewed-core path is seed-first:

```text
reviewed YAML ontology layers
  -> validation
  -> canonical/layered graph JSON
  -> semantica OntologyEngine export probes
  -> custom graph/query/viewer artifacts
  -> document evidence extraction and comparison
  -> document sweep recommendations
```

The important correction from the earlier semantic-diff reframe remains valid: raw phrase hits are not semantic findings. A sentence such as `There is no root-level core/ authoring root` rejects a prohibited construction; it should not be treated as a violation merely because it contains the phrase.

The current workbench has improved this by adding source-backed evidence claims with polarity, modality, assertion scope, resolution state, and review findings. That is useful. But the comparison path is still primarily local heuristic machinery. It uses regex-style detection, local table/scaffold suppression, local term matching, local polarity/modality/scope classification, and Python verdict rules. semantica is still mostly used for package status, shallow ontology export/validation probes, a pattern `TripletExtractor` capability proof, and RDF/SPARQL compatibility.

That means the current state is better labeled as:

```text
RAWR-governed semantic evidence scaffolding with limited semantica substrate usage.
```

It should not be represented as a semantica-native semantic intelligence pipeline yet.

## Ontology State

The current ontology inputs under `tools/semantica-workbench/ontologies/rawr-core-architecture/` define one logical ontology with overlays:

- `core-architecture-ontology-v1.yaml`
- `runtime-realization-overlay-v1.yaml`
- `authority-document-overlay-v1.yaml`
- `verification-policy-overlay-v1.yaml`
- `classifier-readiness-overlay-v1.yaml`
- `candidate-queue-v1.yaml`
- `ontology-contract-v1.yaml`

The contract defines five layers, seven statuses, twenty-two entity types, and forty controlled predicates. The target architecture view is locked-only; candidates, evidence, findings, and deprecated/prohibited review machinery are not supposed to become target architecture truth.

The active ontology layer files contain a reviewed core plus overlays, not an exhaustive extraction graph. The core layer includes architecture roots, semantic kinds, app structure, service lanes, projection lanes, resource/provider/profile concepts, construction laws, forbidden patterns, and validation gates. The runtime overlay adds lifecycle phases, runtime machinery, runtime artifacts, runtime construction laws, forbidden runtime patterns, and validation gates. Authority and verification overlays carry document authority and subordinate testing-policy evidence. The candidate queue keeps plausible future concepts and reserved boundaries outside the canonical graph.

This shape is directionally sound because it separates:

- locked target architecture facts;
- forbidden/deprecated constraints and vocabulary;
- subordinate runtime and verification overlays;
- extracted evidence claims;
- review findings;
- candidate concepts that need promotion review.

The main uncertainty is not whether this separation is useful. It is whether the manually curated core is the right core. It may be too narrow, too shaped by the current human reading, or missing operational concepts that semantica extraction and graph analysis could reveal. Absence from the locked core should mean “needs review,” not automatically “invalid.”

The ontology should remain small and locked down, but not brittle. Its job is to define durable concepts and constraints that enable inference and gap-filling. It should not enumerate every claim, phrase, table row, or transient document fact. Extracted breadth belongs in the evidence ledger and candidate queue.

## semantica Capability Fit

The pinned workbench dependency currently installs `semantica 0.4.0` from `Hawksight-AI/semantica` at commit `ca5f08179374dcb8326046249d919717f2769a04`.

Local package inspection shows relevant modules are present for:

- `semantica.ingest`
- `semantica.parse`
- `semantica.split`
- `semantica.semantic_extract`
- `semantica.llms`
- `semantica.provenance`
- `semantica.kg`
- `semantica.conflicts`
- `semantica.reasoning`
- `semantica.pipeline`
- `semantica.mcp_server`
- `semantica.explorer`
- `semantica.export`
- `semantica.visualization`
- `semantica.change_management`
- `semantica.normalize`
- `semantica.deduplication`
- `semantica.vector_store`
- `semantica.graph_store`
- `semantica.triplet_store`
- `semantica.context`

The installed extraction module exposes classes such as `NERExtractor`, `RelationExtractor`, `TripletExtractor`, `SemanticNetworkExtractor`, `LLMExtraction`, `CoreferenceResolver`, `EventDetector`, and `ExtractionValidator`.

The installed MCP server exposes tools for entity extraction, relation extraction, decision recording/querying, precedent search, causal-chain tracing, entity/relationship insertion, reasoning, graph analytics, graph export, and graph summary. It also exposes resources such as `semantica://graph/summary`, `semantica://decisions/list`, and `semantica://schema/info`.

The caveat is optional dependencies. In the current venv, `openai`, `anthropic`, `litellm`, `ollama`, `pyshacl`, `fastapi`, and `uvicorn` are not installed. That means semantica LLM extraction and server surfaces are not ready merely because the modules exist. The workbench also reports that `openai` is unavailable, so the current semantic-evidence comparison is not secretly doing GPT extraction through semantica.

The practical conclusion is:

```text
semantica has enough relevant surface area to be the intended substrate,
but each surface must be proven against the pinned package and installed extras before local code is replaced.
```

## Requirements To semantica Mapping

The architecture-document comparison workflow needs these capabilities.

| Workflow need | semantica surface to evaluate first | RAWR-owned boundary |
| --- | --- | --- |
| Document intake and source selection | `ingest`, `parse` | packet scope, authority roots, quarantine/archive exclusions |
| Chunking with provenance | `split` structural/entity-aware/ontology-aware chunkers | exact Markdown line-span requirements and source authority metadata |
| Entity/relation/claim extraction | `semantic_extract`, especially LLM extraction and semantic network extraction | architecture claim schema, target-architecture assertion semantics |
| Coreference and implicit references | `CoreferenceResolver`, semantic extraction chain | promotion rules and review state |
| Entity normalization and deduplication | `normalize`, `deduplication`, KG entity resolution | stable RAWR IDs, accepted aliases, candidate promotion |
| Evidence lineage | `provenance` | source-span discipline and review evidence requirements |
| Graph construction and analytics | `kg`, `graph_store`, `triplet_store` | canonical/candidate/evidence separation |
| Conflict detection | `conflicts` | authority rank, document status, decision-grade policy |
| Rule reasoning and explanations | `reasoning` | explicit RAWR rules and operational consequences |
| Batch orchestration | `pipeline` | command surface, report shape, and review recommendations |
| Agent-facing graph access | `mcp_server`, server APIs where available | which questions are allowed to affect architecture truth |
| Human review surfaces | `explorer`, `visualization`, `export` | portable static artifacts and RAWR-specific review queues |
| Ontology evolution | `ontology`, `change_management`, export/diff/versioning | reviewed baseline and promotion decisions |
| Decision intelligence | `context` decision APIs, MCP decision tools | architecture decision categories and causal semantics |

The mapping is not “let semantica decide everything.” It is “use semantica for the semantic infrastructure, then layer RAWR authority and review policy on top.”

## Proposed Workflow Reframe

The target workflow should be semantica-first, with RAWR policy as adapters and guardrails.

```text
Reviewed RAWR ontology and policy inputs
  -> semantica ontology ingestion/export/validation/versioning
  -> semantica ingest/parse over scoped architecture documents
  -> semantica split/chunking with provenance
  -> semantica semantic extraction and LLM extraction where installed/proven
  -> RAWR evidence adapter for polarity, modality, assertion scope, authority context, and review state
  -> semantica provenance, KG construction, normalization, deduplication, and graph analytics
  -> semantica conflict detection and reasoning with RAWR rules/authority ranks
  -> semantica MCP/server/Explorer/query/export surfaces
  -> RAWR review reports, candidate queues, and migration-planning handoffs
```

The reviewed YAML ontology can remain the human authoring surface. YAML is not the core problem. The problem is using YAML plus local Python as the whole semantic substrate. The YAML should compile into semantica-native graph/provenance/reasoning/export surfaces wherever practical.

The existing deterministic extractor and Python verdict logic should not vanish immediately. They are useful as fallback behavior, fixture scaffolding, and regression oracles. But they should stop being the main semantic engine once semantica extraction, provenance, conflict, and reasoning paths are proven.

## Custom Logic Boundary

Keep RAWR-specific logic for:

- source authority hierarchy and document scope;
- reviewed ontology authoring and promotion;
- stable RAWR IDs and controlled predicates;
- canonical versus candidate versus evidence-only separation;
- forbidden construction semantics and deprecated vocabulary policy;
- polarity, modality, assertion-scope, and authority-context meanings;
- decision-grade versus advisory finding rules;
- source-span requirements;
- human review gates;
- migration-specific recommendations and handoff reports;
- classifier-readiness consequences.

Move toward semantica for:

- file/repo ingestion and parse normalization;
- structural, semantic, entity-aware, relation-aware, or ontology-aware chunking;
- NER, relation extraction, triplet extraction, semantic-network extraction, coreference, events, and LLM extraction;
- provenance storage and lineage queries;
- KG construction, entity resolution, deduplication, normalization, analytics, and graph storage;
- conflict detection and investigation guides;
- reasoning and explanation generation;
- pipeline orchestration, retries, checkpoints, and batch sweeps;
- MCP/server graph access and decision-intelligence surfaces;
- RDF/JSON-LD/GraphML/Cytoscape/CSV/OWL exports;
- Explorer and visualization where they satisfy review needs.

Reduce or demote:

- bespoke Markdown traversal as the core intake mechanism;
- custom line/heading chunking as the only chunk model;
- regex-based semantic parsing as the primary parser;
- local alias matching as the main entity-resolution strategy;
- Python `if/else` verdict rules as the whole reasoning engine;
- hand-written Turtle/GraphML/Cytoscape serializers where semantica exporters preserve the same data;
- `.semantica/current` artifact scraping as the main agent interface;
- custom named queries for every new graph question.

## Draft Adoption Path

The next implementation plan should be staged around capability proofs, not a broad rewrite.

### Stage 1: Pinned Capability Proof

Run a narrow local proof against the current pinned semantica package and explicitly record installed extras. The proof should test:

- semantica ingestion or parsing of a small Markdown fixture;
- semantica split output and whether it can preserve or be mapped back to line spans;
- semantica extraction over adversarial claims;
- semantica provenance for document -> chunk -> claim -> finding;
- semantica conflict/reasoning for one or two RAWR verdict rules;
- MCP graph summary/export/reasoning against a persisted graph;
- export parity for RDF/JSON-LD/GraphML/Cytoscape where relevant.

The adversarial fixture should include:

- “There is no root-level `core/` authoring root.”
- “Create a root-level `core/` authoring root.”
- historical mention of a forbidden pattern;
- deprecated vocabulary in a replacement table;
- ambiguous reference with unclear scope;
- candidate concept with operational consequence but no authority.

### Stage 2: semantica Extraction Pilot

Use semantica extraction as the first parser for comparison documents, with the current deterministic extractor retained as fallback and fixture oracle. The pilot should not attempt all docs at once. One final spec, one testing-policy doc, and the adversarial fixture are enough.

Success means semantica can produce or support claims that preserve source spans, resolved targets, polarity/modality/scope, and no auto-promotion into canonical truth.

### Stage 3: Provenance And Graph Substrate

Map the RAWR evidence model into semantica provenance and KG structures. The review report should be able to answer:

- which document span produced this claim;
- which extraction run produced it;
- which canonical/candidate/prohibited target it resolved to;
- which rule or conflict detector produced the finding;
- what evidence would need review before promotion.

If semantica provenance cannot represent exact line spans directly, keep a small RAWR span adapter. Do not rebuild the whole provenance system locally.

### Stage 4: Conflict And Reasoning Proof

Move a small number of existing verdict rules into semantica conflict/reasoning surfaces, or use semantica to produce the explanation substrate around RAWR-authored rules.

The minimum useful explanation is:

```text
source claim
  -> resolved ontology/candidate/prohibited target
  -> source authority and assertion context
  -> RAWR rule or semantica conflict/reasoning result
  -> finding kind and review action
```

### Stage 5: Agent And Review Surfaces

Expose the graph through semantica MCP/server surfaces where proven. Keep the existing CLI as the RAWR command wrapper, but stop making every new agent-facing graph question a bespoke JSON query.

Evaluate Explorer and visualization before extending the custom Cytoscape viewer further. Keep Cytoscape as a portable static artifact if it remains useful for offline review.

### Stage 6: Batch Sweep Rebuild

Treat document sweep orchestration as a RAWR policy wrapper over semantica pipeline primitives. RAWR should still own recommendations such as `update-needed`, `review-needed`, or `quarantine-candidate`, but semantica should be evaluated for the DAG, checkpoint, retry, and run-state mechanics.

## Uncertainties And Validation Needs

Several points remain deliberately uncertain.

The pinned package and the public docs may not fully match. The local venv currently has `semantica 0.4.0`, but important server and LLM paths require extras that are not installed. Any implementation plan must prove package reality first.

Line spans are non-negotiable for RAWR review. If semantica extraction, chunking, or provenance loses exact source spans, the RAWR adapter must restore them before findings become decision-grade.

LLM extraction may improve semantic quality, but it can also manufacture structure. LLM output should enter as evidence with confidence, source, and review state. It must not promote facts into the locked core.

The current manual core ontology may be incomplete. semantica extraction and graph analytics should be used to find under-modeled concepts, but those discoveries should become candidates or evidence-only findings until reviewed.

The current forbidden-pattern model is better than phrase matching, but still needs pressure testing. A prohibited construction is not the same as a deprecated term, and both are different from historical or migration-context mentions.

MCP/server/Explorer may not be immediately usable without extras such as FastAPI/Uvicorn or a persisted graph format accepted by the server. The first proof should prefer the MCP stdio server because it is present locally.

## Bottom Line

The current workbench effort should not be discarded. It created useful RAWR governance assets: reviewed ontology inputs, source authority discipline, evidence/candidate separation, semantic-diff fixtures, conservative recommendations, and portable review artifacts.

But the semantic engine should be re-centered.

The next version should make semantica the default substrate for ingestion, extraction, provenance, graph construction, conflict detection, reasoning, pipeline orchestration, MCP/server access, and exports wherever the pinned package can prove those surfaces. RAWR should become the policy and review layer that constrains semantica output, not a parallel semantic platform that happens to import semantica occasionally.
