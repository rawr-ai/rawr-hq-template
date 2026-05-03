# Semantica Underutilization Session Review

Status: draft review artifact
Date: 2026-04-27
Scope: RAWR final architecture ontology, semantic evidence comparison, document drift review, and future classifier/code-generation grounding

## Purpose

This document captures the current state of the RAWR Semantica workbench effort and the main correction that emerged during the session:

We have built useful RAWR-specific ontology governance infrastructure, but we have underused Semantica itself. In several places, we rebuilt Semantica-adjacent capabilities locally instead of first using Semantica's native extraction, provenance, conflict, reasoning, graph, decision, MCP/server, export, and visualization surfaces.

This is not a detailed implementation plan. It is a handoff-quality diagnosis and feature inventory: what the session was trying to accomplish, what we built, where the approach drifted, which Semantica features we are missing, and how that underutilization likely caused extra work.

## Original Objective

The original objective was to evaluate and potentially use Semantica for the RAWR architecture migration workflow:

- Generate or curate an authoritative ontology from the finalized runtime realization spec and canonical architecture spec.
- Identify shared concepts/entities across partially superseded architecture documents.
- Compare old/new documents against the source-of-truth ontology to detect drift.
- Preserve provenance so every finding can be traced to source docs/spans.
- Support decision intelligence and future migration planning.
- Eventually support an operational classifier/pre-classifier system for deterministic software production: user intent -> capability construction -> allowed/not-allowed moves -> realization pipeline.

The critical constraint throughout the session was epistemic:

- Semantica output is evidence unless reviewed.
- The reviewed RAWR ontology governs RAWR truth.
- Extracted terms, candidates, and findings must not be promoted silently into canonical architecture.
- Generated artifacts are review surfaces, not source-of-truth architecture.

That constraint remains correct. The problem is that we let the RAWR-specific policy layer expand into a custom semantic platform.

## Session Arc

### 1. Semantica Fit Investigation

The session began by investigating whether Semantica could help with ontology generation, semantic diffing, decision intelligence, and operational integration. The initial conclusion was that Semantica looked relevant as a framework for context graphs, provenance, reasoning, conflict detection, decision intelligence, and MCP/server access.

The early useful insight was that Semantica should not be treated as an automatic architecture-authority generator. It could help process documents and build evidence, but RAWR still needed reviewed ontology governance.

### 2. Single-Repo Workbench Setup

We set up a repo-local workbench under:

```text
tools/semantica-workbench/
```

Generated state goes under ignored `.semantica/`. The workbench lives inside `rawr-hq-template`; no separate RAWR-specific MCP repository was introduced.

This was the right repo placement decision.

### 3. Packet-Scoped Extraction Hardening

We narrowed extraction scope to the real architecture packet and excluded task scaffolding. We added seeded canonical entities, split prompts, controlled predicates, source authority rankings, and stronger normalization. This corrected the first major failure mode: broad extraction producing thousands of terms and then looking like architecture.

### 4. Curated Core Ontology Workflow

We created docs for a more principled ontology process:

- Ontology design principles.
- Ontology workflow/system design.
- CloudPro prompt to draft a curated core ontology.

This moved the work from "LLM extracts everything" toward "reviewed ontology plus evidence ledger."

### 5. Core Ontology Operationalization

The CloudPro draft was copied into the repo as a tracked snapshot, then normalized into layered ontology inputs under:

```text
tools/semantica-workbench/ontologies/rawr-core-architecture/
```

The durable model became:

- `core-architecture-ontology`
- `runtime-realization-overlay`
- `authority-document-overlay`
- `classifier-readiness-overlay`
- `candidate-queue`

This was directionally sound: one logical ontology with overlays, not several unrelated graphs.

### 6. Cytoscape Viewer And Queries

The first HTML output was basically a list, so we added a Cytoscape.js graph viewer, named JSON queries, RDF/Turtle export, SPARQL querying, and local serve support.

This made inspection better, but it also duplicated Semantica visualization/export/query surfaces instead of first evaluating Semantica Explorer and graph/query APIs.

### 7. Semantic Diff Reframe

The user correctly flagged that "forbidden phrase" matching was not semantic reasoning. A final spec saying "there is no root-level `core/` authoring root" should not be treated as a violation just because it contains a forbidden construction string.

We captured a reframe:

- Raw phrase hits are lexical triage only.
- Decision-grade findings require parsed claims with polarity, modality, scope, provenance, resolution, and rule explanation.
- A comparison doc should be semantically parsed into evidence claims, then compared to the ontology/constraints.

This reframe is correct and should remain active.

### 8. Semantic Evidence Pipeline And Sweep

We added a deterministic local semantic evidence path:

- Claim extraction with line spans.
- Polarity/modality/assertion-scope classification.
- Resolution to canonical/deprecated/prohibited/verification-policy/candidate targets.
- Semantic compare reports.
- Triage hardening.
- Repo-wide document sweep with advisory recommendations.

This is useful infrastructure, but it is the clearest underutilization point: the current extraction and comparison behavior is mostly local Python logic, not Semantica-native extraction/reasoning/conflict/provenance.

## Current Workbench Reality

The current workbench has several valuable pieces:

- Reviewed ontology YAML/seed files.
- Strict validation of layers, predicates, endpoints, source refs, candidates, and overlays.
- Generated JSON/RDF/OWL/SHACL-like artifacts.
- Cytoscape graph viewer.
- Named JSON queries and SPARQL.
- Deterministic single-doc semantic compare.
- Batch document sweep with advisory categories.
- Good epistemic labeling: canonical vs candidate vs evidence vs review findings.

It also has hard limits:

- It does not yet run Semantica LLM extraction over comparison docs.
- It does not use OpenAI through Semantica yet. `OPENAI_API_KEY` is present in the environment, but the repo-local venv currently lacks the `openai` package. Semantica reports that `semantica[llm-openai]` is not installed.
- It does not use local Codex as a Semantica provider. Semantica exposes OpenAI, Anthropic, Gemini, Groq, Ollama, LiteLLM, HuggingFace, and related provider extras, but local Codex is not a named provider in the installed package surface.
- It uses Semantica mainly through `OntologyEngine.from_data`, validation/export methods, a pattern `TripletExtractor` capability proof, and RDF/SPARQL compatibility.
- It does not make Semantica's MCP server, REST API, Explorer, provenance manager, context graph, conflict detector, graph store, pipeline builder, or semantic extraction stack central to the workflow.

## Current Semantica Usage

Observed local usage:

- `semantica.ontology.OntologyEngine.from_data`
- `OntologyEngine.validate`
- `OntologyEngine.evaluate`
- `OntologyEngine.validate_graph`
- `OntologyEngine.to_owl`
- `OntologyEngine.to_shacl`
- `semantica.semantic_extract.TripletExtractor(method="pattern")` as a capability proof
- RDFLib SPARQL over generated Turtle
- Semantica status/version/package inspection

Observed local package modules available in the pinned venv include:

```text
change_management
cli
conflicts
context
core
deduplication
embeddings
evals
explorer
export
graph_store
ingest
kg
llms
mcp_server
normalize
ontology
parse
pipeline
provenance
reasoning
seed
semantic_extract
server
split
triplet_store
utils
vector_store
visualization
worker
```

That module list alone shows the mismatch: we are using a small fraction of the installed package.

## Official Semantica Surfaces Relevant To RAWR

The official Semantica docs and README describe Semantica as a context graph and decision intelligence framework with provenance, conflict detection, reasoning, and validation. The docs also describe it as modular and end-to-end, from ingestion to reasoning.

Primary references:

- Semantica README: https://github.com/Hawksight-AI/semantica
- Semantica docs home: https://hawksight-ai.github.io/semantica/
- Semantic Extract: https://hawksight-ai.github.io/semantica/reference/semantic_extract/
- Ontology: https://hawksight-ai.github.io/semantica/reference/ontology/
- Ingest: https://hawksight-ai.github.io/semantica/reference/ingest/
- Split: https://hawksight-ai.github.io/semantica/reference/split/
- Reasoning: https://hawksight-ai.github.io/semantica/reference/reasoning/
- Conflicts: https://hawksight-ai.github.io/semantica/reference/conflicts/
- Provenance: https://hawksight-ai.github.io/semantica/reference/provenance/
- Export: https://hawksight-ai.github.io/semantica/reference/export/
- Knowledge Graph: https://hawksight-ai.github.io/semantica/reference/kg/
- Context: https://hawksight-ai.github.io/semantica/reference/context/
- Visualization: https://hawksight-ai.github.io/semantica/reference/visualization/
- Pipeline: https://hawksight-ai.github.io/semantica/reference/pipeline/

Version caveat:

The docs and GitHub are actively moving. Our workbench pins Semantica by Git SHA. Any adoption must start with a pinned capability proof against the exact installed revision, not broad trust in docs. The docs describe some surfaces that may require extras such as `semantica[llm-openai]`, `semantica[explorer]`, `semantica[viz]`, `semantica[graph-*]`, `semantica[split-*]`, or `semantica[all]`.

## Underused Semantica Features We Should Be Using

### 1. Semantica MCP Server

Semantica ships an MCP server module:

```bash
python -m semantica.mcp_server
```

The installed server exposes tools for:

- Entity extraction.
- Relation/triplet extraction.
- Decision recording.
- Decision querying.
- Precedent search.
- Causal chain tracing.
- Adding entities.
- Adding relationships.
- Running reasoning.
- Graph analytics.
- Graph export.
- Graph summary.

It also exposes resources:

- `semantica://graph/summary`
- `semantica://decisions/list`
- `semantica://schema/info`

It supports `SEMANTICA_KG_PATH` for loading a persisted graph on startup.

What we did instead:

- Built repo-local CLI commands.
- Built named JSON query commands.
- Built custom current-run artifacts for agents to inspect.
- Did not expose a Semantica graph service to agents.

Why that matters:

Agents should be able to ask graph/decision/provenance/reasoning questions through a semantic service. Instead, they currently read static `.semantica/current` artifacts or run our custom commands. That makes every new agent-facing question a local feature request.

### 2. Semantica REST API And Explorer

The installed package has `semantica.server`, `semantica.explorer`, and FastAPI/Explorer support behind optional dependencies. The public docs describe Explorer-style surfaces for graph exploration, ontology browsing, analytics, provenance, timeline, decisions, and SPARQL.

What we did instead:

- Built a custom Cytoscape viewer.
- Built local serve support.
- Added custom viewer payloads for sweep summaries and ontology overlays.

What should change conceptually:

- Keep Cytoscape as a portable static artifact.
- Evaluate Semantica Explorer before extending Cytoscape further.
- Use Explorer or Semantica server APIs for interactive graph/debug/review workflows where practical.

### 3. Ingest And Parse

Semantica's ingest module claims support for files, directories, repositories, web, feeds, databases, email, and MCP sources. The parse module includes document parsing surfaces and optional Docling support.

What we did instead:

- Built our own Markdown traversal and filtering.
- Built our own document sweep discovery.
- Built our own chunk artifact format.
- Built our own Markdown line handling, code fence suppression, table suppression, heading context, and path/classification logic.

What should change conceptually:

- RAWR can still own document scope policy: which roots, quarantine exclusions, source-authority paths, and repo-specific filters matter.
- Semantica should be evaluated for file/repo ingestion, standardized metadata, and parse outputs before we keep expanding local traversal/parsing.
- If Semantica ingestion loses exact Markdown line spans, RAWR may need a small line-span adapter. But ingestion itself should be squeezed first.

### 4. Split And Chunking

Semantica's split module advertises recursive, semantic, structural, entity-aware, relation-aware, graph-based, and ontology-aware chunking, with provenance tracking and quality validation.

What we did instead:

- Built a simplistic line/heading-oriented claim extraction pass.
- Created `document-chunks.jsonl` as lines or line-bound claims.
- Wrote custom suppression logic for scaffolding, tables, code fences, and path-only lines.

Why this is probably extra work:

The exact RAWR claim schema is custom, but chunking should likely start from Semantica structural or ontology-aware chunkers. We should not keep inventing chunk boundaries by hand if Semantica already has structural and KG-aware chunking.

### 5. Semantic Extract

Semantica's semantic extraction module includes:

- `NamedEntityRecognizer`
- `NERExtractor`
- `RelationExtractor`
- `TripletExtractor`
- `SemanticNetworkExtractor`
- `EventDetector`
- `CoreferenceResolver`
- `LLMExtraction`
- Batch processing and provenance metadata
- Robust fallback chains

What we did instead:

- Built custom deterministic claim extraction in Python.
- Used regex-like cues for polarity/modality/scope.
- Used local term resolution against canonical/deprecated/prohibited/candidate indexes.
- Used direct OpenAI Chat Completions in one older extraction path rather than Semantica's LLM extraction/provider layer.
- Did not use `NERExtractor`, `RelationExtractor`, `SemanticNetworkExtractor`, `CoreferenceResolver`, `EventDetector`, or `LLMExtraction` as the comparison-document parser.

This is the largest underutilization.

RAWR-specific fields are still necessary:

- Polarity.
- Modality.
- Assertion scope.
- Authority context.
- Review state.
- Decision-grade status.
- Source line spans.

But the raw semantic parse should be Semantica-first, with RAWR policy layered on top. The current deterministic extractor should become fallback/triage/test oracle, not the core semantic parser.

### 6. LLM Provider Integrations

The installed Semantica package declares optional extras for:

- `llm-openai`
- `llm-anthropic`
- `llm-gemini`
- `llm-groq`
- `llm-ollama`
- `llm-deepseek`
- `llm-litellm`
- `llm-instructor`
- `llm-all`

What we did instead:

- Did not install the OpenAI extra.
- Did not use OpenAI through Semantica.
- Did not use Ollama/local model support.
- Did not use LiteLLM as a possible route to a local or OpenAI-compatible provider.

Practical consequence:

The user's OpenAI key is present, but the current comparison/sweep path cannot use it because `openai` is not installed in the workbench venv. The current pipeline is not secretly doing GPT extraction. It is deterministic and local.

### 7. Knowledge Graph Construction And Analytics

Semantica's KG module provides graph construction, entity resolution, temporal support, graph analytics, provenance, centrality, community detection, path finding, and link prediction.

What we did instead:

- Built our own canonical graph JSON.
- Built our own layered graph JSON.
- Built our own candidate queue.
- Built custom graph exports and viewer transforms.
- Built no serious graph analytics beyond counts and presets.

What should change conceptually:

- RAWR reviewed ontology can remain the authority input.
- Semantica should own more of graph construction, entity resolution, provenance-aware graph management, and graph analytics.
- RAWR should retain policy: which nodes count as canonical, which are candidate/evidence, which documents outrank others.

### 8. Provenance

Semantica's provenance module provides W3C PROV-O compliant tracking, source tracking, persistent SQLite storage, chunk/entity/relationship tracking, property-level provenance, lineage queries, checksums, and bridge axiom support.

What we did instead:

- Built our own provenance fields in JSON artifacts.
- Built our own `source_refs`.
- Built our own line-span fields.
- Built our own evidence TTL output.
- Built our own report links.

This is another major duplication.

RAWR should preserve its exact line span/source reference requirements, but map them into Semantica provenance. This would make evidence traceable through Semantica graph/query/MCP/Explorer instead of only through local files.

### 9. Conflicts

Semantica's conflicts module provides:

- Conflict detection across values, types, relationships, temporal data, and logical consistency.
- Resolution strategies such as voting, credibility, recency, confidence, and manual review.
- Source tracking and credibility.
- Investigation guides.
- Traceability chains.

What we did instead:

- Built local Python `if/else` verdict rules for `aligned`, `conflict`, `deprecated-use`, `candidate-new`, `ambiguous`, and `informational`.
- Built local review actions and ambiguity buckets.
- Built sweep recommendation policies.

Some of this must remain RAWR policy. But conflict detection itself should be tested against Semantica's conflict primitives. RAWR should supply:

- Authority ranks.
- Source credibility.
- Document status.
- Predicate/constraint meaning.
- What counts as decision-grade.

Semantica should be evaluated for:

- Multi-source conflict detection.
- Relationship conflict detection.
- Temporal/source credibility conflict handling.
- Investigation report generation.

### 10. Reasoning

Semantica's reasoning module supports forward-chaining rules, SPARQL reasoning, Rete networks, and explanation generation.

What we did instead:

- Encoded reasoning as local Python control flow.
- Added RDF/SPARQL query support using RDFLib.
- Did not use Semantica's `Reasoner`, `ReteEngine`, `DatalogReasoner`, `SPARQLReasoner`, or explanation generator as the primary rule/explanation substrate.

What should change conceptually:

- RAWR rule semantics can remain explicit.
- But rules should be represented as graph/rule artifacts where feasible, not buried in Python branches.
- A finding should be explainable as: source claim -> resolved ontology target -> rule/constraint -> inferred verdict.
- Semantica reasoning/explanation should be squeezed before continuing to expand local rule code.

### 11. Ontology Generation, Ingestion, Alignment, Evaluation, And Versioning

Semantica's ontology module supports:

- `OntologyEngine.from_data`
- `OntologyEngine.from_text`
- `OntologyEngine.validate`
- `OntologyEngine.infer_classes`
- `OntologyEngine.infer_properties`
- `OntologyEngine.evaluate`
- OWL export.
- Ontology ingestion.
- LLM-based ontology generation.
- Reuse/alignment.
- SKOS vocabulary management.

What we did:

- Used `from_data`, validation/evaluation, OWL/SHACL export shallowly.
- Did not use `from_text` for ontology generation experiments.
- Did not use ontology ingestion to make Turtle/OWL first-class inputs.
- Did not use ontology alignment/version/diff surfaces as the main source-of-truth drift mechanism.
- Did not use SKOS vocabulary support for deprecated/accepted aliases and vocabulary management.

Important nuance:

The reviewed YAML ontology is not inherently wrong. Semantica's own ontology docs describe a YAML-to-definition stage in its generation pipeline. YAML is acceptable as a human-reviewed authoring surface if it compiles into typed graph/RDF/OWL/SHACL and does not force string-blob reasoning.

The issue is not "YAML vs Turtle." The issue is that RAWR used YAML plus custom Python as the main semantic substrate instead of compiling YAML into Semantica-native graph/provenance/reasoning surfaces.

### 12. Change Management And Ontology Diff

The installed package includes `change_management`. Public changelog/docs mention ontology/version diff and change reports.

What we did instead:

- Built our own semantic diff/reporting concepts.
- Built sweep recommendations and update/quarantine candidates.
- Did not make Semantica ontology version comparison the backbone for source-of-truth evolution.

Why this matters:

The original objective included:

- "What changed?"
- "Which docs drifted?"
- "Which migration plan sections need update?"
- "Which source-of-truth ontology facts should be updated because new decisions emerged?"

That is change management. We should verify and use Semantica's version/change/diff surfaces before building more local diff machinery.

### 13. Pipeline Orchestration

Semantica's pipeline module supports DAGs, parallel execution, validation, retry/fallback, resource management, checkpointing, templates, and delta-aware pipelines.

What we did instead:

- Wrote local CLI command sequences.
- Wrote custom sweep loops.
- Wrote our own run directory layout and current symlink/copying behavior.
- Wrote our own progress lines and artifact preservation.

RAWR still needs repo-specific workflow commands, but Semantica pipeline should be considered for:

- Ingest -> split -> extract -> normalize -> resolve -> conflict -> reason -> export.
- Batch doc sweeps.
- Failure/retry handling.
- Checkpointing and resuming.

### 14. Export

Semantica export supports RDF, JSON-LD, GraphML, CSV, YAML, OWL, Cytoscape.js, D3.js, Graphviz, Neo4j/Cypher, ArangoDB, and more.

What we did instead:

- Wrote our own Turtle serialization.
- Wrote our own GraphML.
- Wrote our own Cytoscape element transform and HTML bundle.
- Wrote our own CSV.

This is likely avoidable work. RAWR-specific report summaries can remain custom, but graph serialization should prefer Semantica exporters where they support the target format and preserve IDs/provenance.

### 15. Visualization

Semantica visualization supports knowledge graph visualization, ontology hierarchy/property visualization, embedding projection, temporal visualization, analytics dashboards, and export to interactive HTML/images/JSON.

What we did instead:

- Built a bespoke Cytoscape viewer.
- Added view presets, filters, details panels, throughlines, and sweep summaries.

This was useful because the first HTML was not workable. But before adding more viewer features, we should evaluate Semantica visualization and Explorer. Cytoscape can remain a portable static report artifact, not the primary graph product.

### 16. Graph Stores And Triplet Stores

Semantica includes graph-store and triplet-store modules with support for backends such as Neo4j/FalkorDB/Neptune and RDF/SPARQL stores such as Blazegraph/Jena/RDF4J in the docs/package metadata.

What we did instead:

- Stored generated artifacts under `.semantica/current` and `.semantica/runs`.
- Queried static TTL with RDFLib.
- Did not evaluate persistent graph/triple store backends.

For now, local artifact storage is acceptable. But if agents need to ask many graph questions over time, Semantica-backed graph/triple storage is a better fit than hand-rolled JSON artifact lookup.

### 17. Vector Stores And Embeddings

Semantica supports vector stores and embeddings for hybrid search, metadata-filtered retrieval, and graph/vector combinations.

What we did instead:

- No serious semantic similarity or hybrid retrieval layer.
- Mostly exact/normalized term matching plus local aliases.

This likely contributes to high ambiguity and weak entity resolution. For document drift detection, vector/hybrid retrieval could help locate related-but-different concepts without pretending exact string matches are semantics.

### 18. Deduplication And Normalization

Semantica includes deduplication and normalization modules for entity merging, text normalization, dates, numbers, quantities, and languages.

What we did instead:

- Built local normalization and alias matching.
- Built manual candidate queue logic.
- Did not use Semantica entity dedup/entity resolution as the substrate.

RAWR's promotion rules should stay custom, but duplicate/candidate detection should be Semantica-first where possible.

### 19. Decision Intelligence

Semantica's context module and MCP server expose decision recording, decision querying, precedent search, causal chains, influence analysis, and policy checks.

What we did instead:

- Wrote architecture decision context into Markdown docs.
- Built graph evidence and reports.
- Did not record architecture decisions as first-class Semantica decisions.
- Did not use precedent search or causal chains for migration planning.

This is a direct miss against the original objective. RAWR architecture decisions, supersessions, migration gates, and classifier-readiness decisions should likely become Semantica decision objects with provenance and causal links.

## How Underutilization Created Extra Work

We likely did extra work in these areas:

### Custom Extraction Instead Of Semantica Extraction

We wrote:

- Claim filtering.
- Scaffold suppression.
- Path-only suppression.
- Table/header parsing.
- Polarity detection.
- Modality detection.
- Assertion-scope detection.
- Candidate and ontology resolution.

Some RAWR-specific classification is necessary, but raw entity/relation/triplet/network extraction should have started from Semantica extractors plus LLM enhancement. This probably cost time and produced lower-quality semantics.

### Custom Chunking Instead Of Semantica Split

We hand-built line/heading chunking and suppression logic. Semantica already has structural, semantic, entity-aware, relation-aware, graph-based, and ontology-aware chunking. We may still need a line-span adapter, but not a whole independent chunking model.

### Custom Provenance Instead Of Semantica Provenance

We created provenance-like JSON fields and reports. Semantica has W3C PROV-O provenance, persistent SQLite storage, chunk/entity/relationship tracking, property-level source tracking, lineage, and checksums. Our local artifact format should map into that, not replace it.

### Custom Conflict/Compare Rules Instead Of Semantica Conflict And Reasoning

We encoded verdicts in Python branches. Semantica already has conflict detection, source tracking, reasoning, SPARQL, and explanation. RAWR policy must remain explicit, but the lower-level conflict/reasoning engine should be evaluated first.

### Custom Query Layer Instead Of MCP/Server/Explorer

We added named JSON queries and custom text output. That is convenient, but Semantica already has MCP/server surfaces for graph query, decision query, reasoning, analytics, and export. Agents should use a semantic interface where possible.

### Custom Viewer Instead Of Semantica Visualization/Explorer

We built Cytoscape because the first output was unusable. The result is useful, but Semantica has visualization and Explorer modules. We should not keep expanding Cytoscape before testing those surfaces.

### Custom Sweep Orchestration Instead Of Semantica Pipeline

We wrote a local batch sweep runner. This was practical, but Semantica's pipeline module provides DAG execution, validation, parallelism, retries, checkpoints, and templates. A mature version should likely use Semantica pipeline primitives underneath.

## What Was Still Worth Building

Not everything was wasted.

The following should survive:

- Single-repo placement under `rawr-hq-template`.
- Ignored `.semantica/` generated state.
- Reviewed YAML/source ontology as RAWR authority authoring surface.
- Strict separation of canonical graph, evidence ledger, candidate queue, and review findings.
- Authority model: canonical vs superseded vs subordinate/supporting docs.
- RAWR-specific claim fields: polarity, modality, assertion scope, authority context, confidence, review state.
- Human-review guardrails: extracted does not mean true.
- Source-span discipline.
- Conservative recommendation categories for doc sweeps.
- Portable static artifacts for review where helpful.

These are RAWR policy and workflow concerns. Semantica should support them, not replace them.

## What Should Be Demoted

The following should be treated as fallback, scaffolding, or temporary glue:

- Heuristic evidence extractor as the main semantic parser.
- Local Python verdict rules as the main reasoning engine.
- Custom Turtle serialization where Semantica exporters can preserve the same information.
- Cytoscape viewer as the primary inspection product.
- Named JSON queries as the primary agent interface.
- Static `.semantica/current` artifact scraping as the main integration path.
- Broad entity extraction as ontology generation.

## Recommended Product Shape

The target shape should be:

```text
Reviewed RAWR ontology/policy inputs
  -> Semantica ontology ingestion/export/validation/versioning
  -> Semantica ingest/parse/split for documents
  -> Semantica semantic extraction + LLM enhancement
  -> RAWR evidence adapter for polarity/modality/scope/authority
  -> Semantica provenance + KG + conflict/reasoning
  -> Semantica MCP/server/Explorer/query surfaces
  -> RAWR review reports and migration-planning handoff artifacts
```

RAWR should own:

- What counts as architecture truth.
- Which source docs are authoritative.
- Which ontology facts are locked.
- Which claims are candidates.
- Which changes require human review.
- Which operational consequences matter for classifier/codegen.

Semantica should own, where practical:

- Ingestion.
- Parsing.
- Chunking.
- Extraction.
- Entity/relation/triplet/network construction.
- Provenance storage.
- Knowledge graph construction/analytics.
- Conflict detection.
- Reasoning/explanation.
- Ontology import/export/version/diff/evaluation.
- MCP/server access.
- Explorer/visualization.
- Pipeline orchestration.

## Draft Missing Capability List

This is the concrete draft list of Semantica-related capabilities we are missing or underusing:

1. Install Semantica extras needed for the actual intended workflow:
   - `llm-openai`
   - possibly `llm-ollama` or `llm-litellm`
   - `explorer`
   - `viz`
   - `split-all` or targeted split extras
   - graph/triplet store extras if we choose a persistent backend

2. Use Semantica LLM extraction for comparison documents.

3. Use Semantica NER/relation/triplet/semantic-network extraction before local heuristic claim classification.

4. Use Semantica coreference resolution for docs where pronouns or "this/it/that" matter.

5. Use Semantica structural/entity-aware/ontology-aware chunking.

6. Use Semantica provenance manager for document -> chunk -> entity -> relation -> finding lineage.

7. Use Semantica conflict detection for multi-source contradiction and source credibility analysis.

8. Use Semantica reasoning engines for explicit RAWR rules where possible.

9. Use Semantica ontology ingestion for Turtle/OWL/RDF inputs and exports.

10. Use Semantica ontology evaluation and alignment to test core ontology quality.

11. Use Semantica ontology version/change/diff surfaces for source-of-truth evolution.

12. Use Semantica SKOS/vocabulary support for aliases, deprecated vocabulary, replacements, and accepted terms.

13. Use Semantica knowledge graph construction/entity resolution instead of only custom graph JSON.

14. Use Semantica graph analytics for centrality, communities, pathfinding, and impact exploration.

15. Use Semantica decision intelligence to record architecture decisions, supersession decisions, migration gates, and classifier-readiness decisions.

16. Use Semantica precedent search to find similar prior architecture decisions or doc conflicts.

17. Use Semantica causal chain/impact analysis for migration planning.

18. Use Semantica MCP server as an agent-facing interface.

19. Use `SEMANTICA_KG_PATH` or an equivalent persisted graph path so agents can load/query the same graph state.

20. Use Semantica REST API/Explorer before extending custom local UIs.

21. Use Semantica exporters for RDF/JSON-LD/GraphML/Cytoscape/Neo4j/CSV where possible.

22. Use Semantica pipeline orchestration for batch document sweeps and retry/checkpoint behavior.

23. Use Semantica vector store/embedding support for semantic similarity and related-but-different concept detection.

24. Use Semantica deduplication/normalization for entity merge/candidate detection.

25. Use Semantica change-management/audit surfaces for ontology and evidence graph history.

## Important Caveats

### Docs May Exceed Installed Reality

Semantica appears to be moving quickly. The installed pinned package exposes many modules, but some documented examples may require optional extras or may not match the exact pinned API. Every adoption should start with a local capability probe.

### Semantica Should Not Decide RAWR Truth

Using Semantica more deeply does not mean letting Semantica auto-promote extracted facts. The reviewed RAWR ontology and authority policy remain the source of truth.

### YAML Is Not The Core Problem

YAML is acceptable as a reviewed authoring surface. It becomes a problem only if it stays a string/blob layer instead of compiling into typed graph/RDF/OWL/SHACL/provenance/reasoning artifacts.

### Custom RAWR Policy Still Matters

Semantica will not know RAWR's document authority hierarchy, operational classifier-readiness semantics, or migration-specific allowed/not-allowed moves unless we encode them. The custom layer should become policy/adapters, not the whole semantic substrate.

## Bottom Line

We did not waste the whole effort. We built useful repo-local governance, ontology discipline, evidence/reporting conventions, and review surfaces.

But we did duplicate too much of the tool we were trying to adopt.

The corrected mental model is:

```text
RAWR workbench = policy + source authority + review workflow
Semantica = semantic substrate + graph/provenance/reasoning/decision infrastructure
```

The next agent should not keep adding local semantic machinery until Semantica's native surfaces have been squeezed hard. The most important future work is a Semantica-first capability pass that proves, with the pinned package, which native modules can replace or shrink the custom extractor, provenance artifacts, conflict rules, graph queries, visualization, and sweep orchestration.
