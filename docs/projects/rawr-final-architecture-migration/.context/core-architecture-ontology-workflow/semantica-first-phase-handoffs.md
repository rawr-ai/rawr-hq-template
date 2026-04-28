# semantica-First Phase Handoffs

This file records implementation-phase checkpoints for the semantica-first migration. It is a tracked handoff ledger; generated `.semantica/` artifacts remain ignored.

## Phase 2: Ingest, Split, And Provenance Foundation

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_intake.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a semantica-backed intake probe using pinned `semantica.split.StructuralChunker`.
- Added a RAWR char-offset-to-line-span adapter for semantica chunks.
- Added semantica `SourceReference` provenance projection while preserving RAWR source id, path, authority rank, authority scope, heading path, and line span.
- Kept `chunk_markdown` as the decision-grade fallback and parity oracle.

Capability status:

- `semantica.split.StructuralChunker`: proven importable and usable for character-offset chunks.
- `semantica.provenance.SourceReference`: proven usable for source reference projection.
- `semantica.parse.MarkdownParser`: blocked/absent in the pinned package, so markdown intake remains `partial`.

Fallback and removal trigger:

- Decision-grade intake remains on `chunk_markdown` while semantica Markdown parsing is absent.
- Removal trigger: switch decision-grade intake only after semantica Markdown parsing and exact span parity are both proven.

Residual uncertainty:

- Structural chunking segmentation does not intentionally match current RAWR chunk boundaries.
- The current proof maps character offsets back to line spans but does not yet feed production extraction.

## Phase 3: semantica Extraction Pilot

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_extraction.py`
- `tools/semantica-workbench/src/semantica_workbench/semantic_evidence.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added an explicit semantica extraction pilot using pinned `semantica.semantic_extract.TripletExtractor`.
- Attached pilot output to semantic evidence artifacts under `semantica_pilot` only when pilot mode is explicitly enabled.
- Labeled the first slice as `semantica-triplet-proof-with-rawr-evidence-line-adapter` so it is not mistaken for direct semantica-derived claim extraction.
- Kept deterministic `rawr-semantic-heuristic-v1` extraction as the decision-grade source and regression oracle.
- Marked semantica pilot claims as `evidence-only` with `promotion_allowed: false`.

Capability status:

- Non-LLM semantica pattern extraction is available but low-confidence and evidence-only.
- LLM/provider extraction remains blocked unless OpenAI, Anthropic, LiteLLM, or Ollama dependencies are installed and proven.

Fallback and removal trigger:

- Decision-grade comparison remains on `rawr-semantic-heuristic-v1`.
- Removal trigger: use semantica extraction for decision-grade comparison only after fixture parity, provider gates, and span/source guarantees pass.

Residual uncertainty:

- Pattern triplets do not preserve RAWR claim semantics by themselves.
- Pilot evidence claims are still produced by RAWR line resolution and claim classification, not directly from semantica triplets.
- Default document extraction keeps semantica pilot disabled to avoid slow or noisy extraction in sweeps.

## Phase 4: Graph, Normalization, And Candidate Handling

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_graph.py`
- `tools/semantica-workbench/src/semantica_workbench/core_ontology.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a semantica graph proof around pinned KG, graph analyzer, normalization, and dedup surfaces.
- Attached `semantica_graph` proof metadata to graph payloads.
- Preserved RAWR-owned stable IDs, controlled predicates, target architecture view, and candidate queue boundaries.
- Added tests proving semantica graph proof does not promote candidates or leak evidence-like types into target architecture views.
- Fixed the predicate guard to use the ontology contract predicate allow-list rather than deriving allowed predicates from the graph under test.

Capability status:

- `semantica.kg.KnowledgeGraph` is constructible over reviewed RAWR graph data.
- `semantica.normalize` and `semantica.deduplication` surfaces are importable, but this phase uses them only as proof/metadata surfaces.

Fallback and removal trigger:

- RAWR remains authority for ID stability, predicate control, target view construction, candidate queue, and promotion gates.
- Removal trigger: allow semantica normalization/dedup to mutate graph outputs only after stable ID, controlled predicate, and target leakage tests pass.

Residual uncertainty:

- Semantica duplicate/normalization classes expose limited directly verified behavior in this pinned package.
- Graph analyzer output is treated as metadata and not as target architecture truth.

## Phase 5: Conflict, Reasoning, And Explanation

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_reasoning.py`
- `tools/semantica-workbench/src/semantica_workbench/semantic_evidence.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a semantica conflict/reasoning proof around current findings.
- Added explicit explanation chains to every finding: source claim, resolved target, authority context, rule result, finding kind, and review action.
- Kept RAWR verdict rules and review-action meanings authoritative.

Capability status:

- `semantica.conflicts.ConflictDetector` and `semantica.reasoning.GraphReasoner` are importable and probed.
- Semantica reasoning output is metadata/proof, not the verdict authority.

Fallback and removal trigger:

- RAWR rules remain authoritative for decision-grade finding semantics.
- Removal trigger: move verdict execution only after semantica reasoning preserves RAWR source claim, target, authority, rule, finding kind, and review action chain.

Residual uncertainty:

- Semantica conflict detector output is not yet mapped to RAWR-specific prohibited/deprecated/candidate review semantics.
- Explanation chains are deterministic RAWR-authored chains with semantica proof metadata attached.

## Phase 6: MCP, Query, Export, And Review Surfaces

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_review_surface.py`
- `tools/semantica-workbench/src/semantica_workbench/core_query.py`
- `tools/semantica-workbench/src/semantica_workbench/core_config.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a stable `semantica-review-surface` named query rather than requiring agents or developers to scrape `.semantica/current`.
- Added a semantica MCP/export/visualization review-surface probe that records MCP tools/resources, export modules, visualization modules, local output presence, and RAWR separation guarantees.
- Kept the existing RAWR CLI as the wrapper and kept Cytoscape as the static portable artifact while semantica visualization remains an evaluated-but-not-adopted surface.
- Recorded explicitly that semantica output is not RAWR truth and that candidate/evidence/review findings remain separate from the target architecture view.
- Fixed review-steward findings by distinguishing missing semantic compare artifacts from zero findings, reporting export preservation as validated only when local outputs exist, and strengthening candidate-like target leakage checks.

Capability status:

- `semantica.mcp_server` exposes the required review tools/resources for extraction, reasoning, export, and graph summary smoke use.
- `semantica.export` and `semantica.visualization` are importable and inventoried, but not yet used to replace the existing GraphML/Turtle/Cytoscape outputs.

Fallback and removal trigger:

- RAWR keeps named review affordances, CLI wrapping, export contracts, and static Cytoscape output.
- Removal trigger: reduce or replace Cytoscape/custom export surfaces only after semantica visualization/export preserve RAWR IDs, source lineage, candidate separation, and review-finding context.

Residual uncertainty:

- Semantica MCP exposes generic graph resources; RAWR-specific graph/evidence loading still needs an adapter before it can answer decision-grade review questions directly.
- Semantica visualization maturity has only been inventoried in this phase, not behaviorally accepted as a replacement for the static review artifact.

## Phase 7: Pipeline And Sweep Orchestration

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_pipeline.py`
- `tools/semantica-workbench/src/semantica_workbench/document_sweep.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a semantica pipeline proof for document sweep orchestration shape.
- Attached `semantica_pipeline` metadata to sweep outputs.
- Proved pinned semantica can construct and execute a simple DAG-like sweep skeleton while preserving the current RAWR loop as the operational orchestrator.
- Fixed review-steward findings by labeling this as a DAG execution proof rather than behavioral run-state proof and requiring semantica pipeline availability in tests.
- Kept recommendation categories, review queues, source-authority handling, and document policy as RAWR-owned semantics.

Capability status:

- `semantica.pipeline.PipelineBuilder` and `ExecutionEngine` are importable and can execute a no-op sweep skeleton.
- Run-state methods are present and sampled; retry API presence is recorded but retry behavior is not accepted.
- Durable checkpoint/resume persistence was not proven.

Fallback and removal trigger:

- Current `run_document_sweep` remains the operational sweep loop and parity oracle.
- Removal trigger: move orchestration mechanics only after semantica pipeline proves checkpoint/retry/run-state behavior without changing RAWR recommendation semantics.

Residual uncertainty:

- Semantica pipeline support is partial for this use case because checkpoint persistence was not accepted.
- The proof intentionally does not move RAWR recommendation semantics into semantica generic pipeline state.

## Phase 8: Developer Capability Acceptance

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantica-first-developer-capability-acceptance.md`
- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantica-first-phase-handoffs.md`

Implementation:

- Ran the full unit, fixture, smoke, query, visualization, and real-document acceptance gate.
- Added a tracked developer-capability acceptance handoff.
- Recorded which semantica surfaces are proven, which remain fallback, and which are blocked by missing extras or unproven behavior.

Capability status:

- Developers can compare docs, inspect explanation chains, query review surfaces, and see candidate/evidence separation through stable CLI wrappers.
- Real-doc compares completed over the active canonical architecture and runtime realization specs.
- The testing-policy compare completed over `resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md`; this is a quarantine/provenance smoke because no active testing-plan spec exists in `resources/spec/`.
- Final query smoke reported a present semantic compare artifact, `157` findings, `131` decision-review items, and `0` decision-grade findings for the quarantined testing-policy provenance compare.

Fallback and removal trigger:

- Fallbacks remain for deterministic extraction, local Markdown span handling, RAWR verdict rules, static Cytoscape, and local sweep orchestration.
- Each fallback has a removal trigger in the acceptance report.

Residual uncertainty:

- LLM/provider extraction remains blocked by missing extras.
- Multi-document compare UX still writes the latest semantic compare artifact into the active run; direct per-document addressing should be improved later.
- The locked-core ontology strategy remains accepted for governance, not proven as the only viable ontology model.
