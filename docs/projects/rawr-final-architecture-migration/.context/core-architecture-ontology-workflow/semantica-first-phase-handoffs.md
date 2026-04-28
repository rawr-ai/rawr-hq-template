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
