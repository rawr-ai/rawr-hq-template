# Architecture Document Intelligence Next Stage Draft

Status: implemented through developer-capability acceptance
Date: 2026-04-29
Branch: `codex/semantica-first-pipeline-implementation`

## Artifact Roles And Reading Order

Read this document first for the work-to-be-done plan. Then read `architecture-document-intelligence-execution-workflow.md` for the phase control loop, review teams, verification gates, and handoff expectations.

## Current Execution Baseline

Latest submitted implementation baseline before final acceptance:

- Commit sequence through Phase 6:
  - `767d1b6c feat(semantica): add sweep evidence index`
  - `9de38e6d feat(semantica): add corpus evidence queries`
  - `50e43d6a feat(semantica): add corpus evidence html report`
  - `008fe235 feat(semantica): project corpus evidence index to rdf`
  - `493fcd6e feat(semantica): add agent evidence query manifest`
  - `2fea15f2 feat(semantica): add llm evidence augmentation sidecar`
- PR: `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/251`
- Acceptance generated sweep run: `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep`
- Current index artifacts:
  - `.semantica/current/sweep-evidence-index.json`
  - `.semantica/current/sweep-evidence-index.jsonl`
  - `.semantica/current/sweep-evidence-index-summary.json`
- Current index counts: `46` indexed documents, `4247` claims, `4795` findings, `0` warnings

These counts are a snapshot from the named generated sweep run, not durable corpus facts. Regenerate with `bun run semantica:doc:sweep` and `bun run semantica:doc:index -- --run latest`.

`sweep-evidence-index.json` is now the generated evidence substrate for this next stage. It is not RAWR truth; reviewed RAWR ontology/source-authority inputs remain authoritative.

## Current Status

| Status | Work |
| --- | --- |
| Implemented | Global JSON/JSONL sweep evidence index |
| Implemented | Index contract, counts, source spans, and claim/finding links |
| Implemented | Index-backed `core:query` evidence queries |
| Implemented | Evidence HTML audit view |
| Implemented | RDF projection and evidence SPARQL examples |
| Implemented | Agent-facing evidence query manifest |
| Implemented | Optional fail-closed LLM evidence augmentation sidecar |
| Finalized | Developer capability acceptance handoff |

Final acceptance is recorded in `architecture-document-intelligence-acceptance-handoff.md`.

## Thesis

The next useful stage is not to make the graph "smarter" in the abstract. The next useful stage is to build a global, source-backed sweep evidence index over every per-document `semantic-compare.json` artifact, then expose stable review queries and report affordances over that index.

This should let a developer ask architecture-evolution questions from structured evidence first:

- Which docs need review, and why?
- Which claims are candidate-only, unresolved, weakly scoped, deprecated, prohibited, aligned, or decision-grade?
- Which source-authority docs contain parser-regression signals?
- Which concepts recur across documents but are not yet governed ontology facts?
- Which exact source lines explain a verdict or repair action?

Direct document reading remains necessary for final judgment. The index should stop direct document reading from being the discovery mechanism.

## Current Reality

Observed capabilities:

- `doc:sweep` analyzes active docs and writes a sweep summary, review queue, CSV, TTL, HTML dashboard, and per-document artifacts.
- Each analyzed document gets `semantic-compare.json`, evidence claims, resolved evidence, suppressed lines, `semantic-evidence.ttl`, Markdown report, and HTML detail report.
- `doc:compare` and `doc:proposal-compare` can produce source-backed document and proposal review artifacts.
- `core:query` has named query families for graph summary, sweep queues, single-run semantic findings, proposal review, source coverage, and SPARQL examples.
- Semantica LLM extraction is wired as an explicit, fail-closed evidence mode. It is provider/model/credential gated and cannot become RAWR truth.

Current sweep snapshot:

- Documents analyzed: `46`
- Documents skipped: `580`
- Claims: `4247`
- Findings: `4795`
- Decision-grade findings: `10`
- Ambiguous findings: `3511`
- Candidate-new findings: `10`
- Source-authority recommendations: `2`
- Update-needed recommendations: `20`
- Review-needed recommendations: `20`

Judgment:

- The workbench is already useful as a review and triage surface.
- It is not yet a dependable arbitrary architecture QA engine.
- The current query surface is fragmented: sweep queries answer document-level questions, while full claim/finding detail lives inside per-document artifacts.
- RDF/SPARQL exists, but it is not the right first dependency for corpus-level evidence questions. The current sweep run does not reliably expose a root Semantica data graph for all sweep evidence, and the sweep TTL is not the full evidence corpus.

## Layered Usefulness Iterations

### Layer 0: Direct Source Reading

Question: What can this do?

It answers what a specific paragraph says. It is the final authority for human review, but it does not scale to cross-document architecture questions.

Reliability:

- High for local interpretation.
- Low for discovery across dozens of documents.

Decision:

Keep source reading as final verification, not as the primary discovery layer.

### Layer 1: Current Sweep Dashboard

Question: What can this do that direct reading cannot?

It ranks documents by review need and points to per-document reports. It answers "where should I start?"

Reliability:

- Good for triage.
- Too coarse for corpus-level claim questions because it mostly exposes document summaries and top findings.

Decision:

Keep the dashboard. Do not pretend it is a full evidence index.

### Layer 2: Global Sweep Evidence Index

Question: What can this do that the dashboard cannot?

It should aggregate every claim and finding from every per-document `semantic-compare.json` into one run-level artifact. It answers "what exactly was found across the corpus?"

Reliability:

- Strong if it preserves source path, heading path, line/char spans, claim IDs, finding IDs, rules, review actions, confidence, extraction method, and artifact links.
- Brittle if it indexes only `top_findings`, parses HTML, or drops source-span provenance.

Decision:

This is now the implemented substrate. Stable review queries over this index are implemented.

### Layer 3: Stable Review Queries

Question: What can this do that a flat index cannot?

It turns the index into repeatable architecture-review affordances:

- all decision-grade findings
- all candidate-new findings
- all unresolved targets
- all weak-modality hotspots
- all prohibited-pattern mentions split by polarity/modality
- all source-authority candidate or parser-regression signals
- all findings for a canonical entity or candidate concept

Reliability:

- Strong if queries are stable filters over normalized fields.
- Brittle if a bespoke query is added for every one-off question.

Decision:

Implemented as a small query vocabulary for durable reviewer workflows, not a long tail of hard-coded report cases.

### Layer 4: Human Evidence Navigation

Question: What can this do for real developer capability?

It should let a reviewer move from a question to a ranked result set, then into the exact per-document HTML report and source line span.

Reliability:

- Strong if the rendered view is produced from the same JSON index as the CLI queries.
- Brittle if the UI becomes an independent interpretation layer.

Decision:

Implemented as an "Evidence Index" HTML view separate from the sweep dashboard. The sweep dashboard answers "where should I look?" The evidence index answers "what exactly was found?"

### Layer 5: RDF, Semantica KG, MCP, And Graph Projection

Question: What can graph infrastructure add once the index exists?

It can project the same evidence into graph and protocol surfaces for tools that need graph traversal, SPARQL, or MCP-style access.

Reliability:

- Strong if graph projection round-trips counts and preserves RAWR IDs/source spans.
- Brittle if RDF becomes the only source of query truth before the JSON evidence contract is stable.

Decision:

Implemented RDF and SPARQL as projections from the evidence index, not as the primary generated-evidence substrate. MCP-facing RAWR evidence access remains honestly recorded as not wired in the agent manifest.

### Layer 6: LLM-Assisted Expansion

Question: What can LLM extraction add after deterministic indexing is stable?

It can propose candidate mappings, cluster ambiguous claims, suggest query expansion terms, and identify likely ontology gaps.

Reliability:

- Useful as evidence augmentation.
- Unsafe as verdict authority or ontology promotion.

Decision:

Implemented as an optional sidecar over selected ambiguous, unresolved, and candidate evidence rows. LLM-derived output is evidence-only, fail-closed, source-row anchored, non-promotional, and does not alter deterministic RAWR policy output.

## Proposed Implementation Phases

### Phase 1: Global Evidence Index

Status: implemented and submitted in `767d1b6c`.

Implemented `tools/semantica-workbench/src/semantica_workbench/evidence_index.py`.

Implemented responsibilities:

- Read `doc-sweep.json`.
- Resolve each document's `artifact_paths.semantic_compare`.
- Load every per-document `semantic-compare.json`.
- Normalize the corpus into flat queryable collections:
  - `documents`
  - `claims`
  - `findings`
- Preserve per-document artifact links.
- Validate missing artifacts explicitly.

Generated artifacts:

- `sweep-evidence-index.json`
- `sweep-evidence-index.jsonl`
- `sweep-evidence-index-summary.json`

Implemented behavior:

- `doc:sweep` writes the index automatically after successful sweep generation.
- `doc:index` rebuilds the index for an existing run.

Acceptance:

- Index totals match the sum of every per-document `semantic-compare.json`.
- Every finding references an indexed claim.
- Every indexed row preserves source path, line span, heading path, rule/verdict, confidence, and review action where available.

### Phase 2: Index-Backed Query Layer

Status: implemented in `9de38e6d`.

Extended `core:query` with index-backed named queries.

Implemented named queries:

- `evidence-summary`
- `evidence-review-queue`
- `evidence-candidate-new`
- `evidence-unresolved-targets`
- `evidence-source-authority-signals`
- `evidence-prohibited-pattern-mentions`
- `evidence-weak-modality-hotspots`
- `evidence-by-document`
- `evidence-by-entity`
- `evidence-agent-manifest`

Acceptance:

- Queries run from the index without reading source Markdown or scraping HTML.
- Queries return JSON by default and text summaries for humans.
- Each result row includes the per-document HTML report link and source span.

### Phase 3: Evidence Index HTML View

Status: implemented in `50e43d6a`.

Added a human-readable `sweep-evidence-index.html` generated from the same index.

Recommended structure:

- Corpus summary and confidence boundary.
- Decision-grade queue.
- Candidate-new queue.
- Source-authority signals.
- Ambiguity buckets and hotspots.
- Entity/candidate mention table.
- Links into per-document HTML reports.

Acceptance:

- The view is navigable on desktop and small screens.
- It does not duplicate the full source documents.
- It renders from JSON/index artifacts only.

### Phase 4: RDF And Semantica Projection

Status: implemented in `008fe235`.

Generated `sweep-evidence-index.ttl` from the index after the JSON contract stabilized.

Changes:

- RDF projection should include all indexed findings, not only top findings.
- SPARQL should be able to run against evidence index TTL alone when Semantica core export is absent.
- If `semantica-data-graph.ttl` is present, SPARQL can merge canonical graph and evidence index projections.

Acceptance:

- RDF row counts match JSON/JSONL index counts.
- Evidence/candidate records do not leak into target architecture canonical views.
- SPARQL examples answer at least candidate-new, decision-grade, and prohibited-pattern mention questions.

### Phase 5: MCP And Agent-Facing Access

Status: implemented as agent-facing manifest in `493fcd6e`; live RAWR evidence MCP access remains not wired.

Exposes the same stable index through an agent-facing manifest.

Preferred posture:

- Keep `core:query` as the stable local CLI contract.
- Use MCP only if it exposes the same index and avoids forcing agents to scrape `.semantica/current`.
- Keep generated state non-authoritative.

Acceptance:

- A new agent can answer cross-document review questions from the query surface and cite source spans.
- MCP/query output includes the same authority boundary metadata as CLI output.

### Phase 6: LLM-Assisted Evidence Augmentation

Status: implemented in `2fea15f2`.

Added optional LLM evidence sidecars to the index after deterministic indexing and query behavior stabilized.

Scope:

- Candidate mapping proposals.
- Ambiguity clustering.
- Query expansion suggestions.
- Possible ontology-gap hypotheses.

Out of scope:

- Automatic ontology promotion.
- LLM-generated verdict authority.
- Replacing deterministic RAWR rules for decision-grade findings.

Acceptance:

- Blocked provider/model/credential states are explicit.
- LLM evidence rows carry extractor, model, prompt/config reference, confidence, source span, review state, and `promotion_allowed: false`.
- LLM-derived evidence cannot become decision-grade without RAWR deterministic policy.

### Phase 7: Developer Capability Acceptance

Status: recorded in `architecture-document-intelligence-acceptance-handoff.md`.

Accepted the end-to-end corpus evidence workflow over a fresh full sweep:

- `doc:sweep`
- `doc:index`
- evidence named queries
- evidence HTML
- RDF/SPARQL projection
- agent manifest
- optional LLM sidecar blocked/mock modes

Acceptance:

- A developer can start from structured evidence queries rather than direct source reading.
- Every review path still points back to source spans and per-document reports.
- Generated evidence remains non-authoritative.

## Data Contract Draft

### Document Row

- `document_path`
- `path_class`
- `recommendation`
- `confidence`
- `reason_codes`
- `counts`
- `artifact_paths`
- `source_authority`
- `included_by`
- `excluded_segments_applied`

### Claim Row

- `claim_id`
- `document_path`
- `line_start`
- `line_end`
- `char_start`
- `char_end`
- `char_span_kind`
- `heading_path`
- `text`
- `subject`
- `predicate`
- `object`
- `polarity`
- `modality`
- `assertion_scope`
- `authority_context`
- `claim_kind`
- `resolution_state`
- `resolved_ids`
- `extractor`
- `model`
- `confidence`
- `review_state`

### Finding Row

- `finding_id`
- `claim_id`
- `document_path`
- `line_start`
- `line_end`
- `kind`
- `rule`
- `entity_id`
- `label`
- `reason`
- `review_action`
- `decision_grade`
- `ambiguity_bucket`
- `confidence`
- `explanation_chain`

### Index Metadata

- `schema_version`
- `run_id`
- `git_sha`
- `created_at`
- `ontology_metadata`
- `source_sweep_artifact`
- `source_document_count`
- `source_artifact_count`
- `warnings`
- `authority_boundary`

## Validation Questions

These questions should be used as behavioral acceptance tests:

- Show all candidate-new findings across the sweep with source line spans.
- Show all decision-grade findings in source-authority docs and explain whether they are conflicts, aligned rejections, or parser-regression review cases.
- Show all prohibited-pattern mentions split by positive, negative, and prohibitive polarity.
- Show unresolved target claims grouped by ambiguity bucket and sorted by document contribution.
- Show all findings for one canonical entity across all documents.
- Show which repeated candidate concepts may need ontology review.
- Show which high-ambiguity docs are likely parser noise versus real architecture gaps.
- Show the source lines that explain a proposal verdict or repair action.

The result passes only if the answer comes from the structured index first and then points to exact source spans for review.

## Reliability Guardrails

- Do not index HTML.
- Do not index only `top_findings`.
- Do not use entity count as evidence of architecture understanding.
- Do not make RDF or SPARQL required for the first useful query layer.
- Do not add a named query for every one-off question.
- Do not mutate reviewed ontology YAML from evidence rows.
- Do not let candidate/reference geometry appear in canonical target views.
- Do not weaken deterministic RAWR verdict policy.

## Standard Verification Gate

Run the relevant subset after each phase and the full gate before handoff:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:semantic:capability
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:core:query -- --list
bun run semantica:core:query -- --named sweep-review-queue --format text
git diff --check
git check-ignore .semantica/current .semantica/runs
gt status
```

After Phase 1, add:

```bash
bun run semantica:doc:index -- --run latest
```

After Phase 2, add:

```bash
bun run semantica:core:query -- --named evidence-summary --format text
```

After Phase 4, add:

```bash
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-candidate-new.rq --format json
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-prohibited-patterns.rq --format json
```

## Definition Of Done

This stage is done when a developer can ask a cross-document architecture review question, receive a structured answer with source spans and review actions, open the relevant per-document report, and understand whether the result is aligned, conflicting, candidate-only, unresolved, or outside-scope.

The system should still say, clearly: this is evidence-backed review output, not RAWR truth.
