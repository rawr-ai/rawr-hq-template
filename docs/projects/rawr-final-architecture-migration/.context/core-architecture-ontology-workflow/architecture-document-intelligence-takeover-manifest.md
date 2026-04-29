# Architecture Document Intelligence Takeover Manifest

Status: active handoff context
Date: 2026-04-28

## Purpose

This manifest is for a new agent taking over the next stage of RAWR Semantica document intelligence work.

The goal is to continue from the existing Semantica-first workbench and implement a global evidence index/query layer for architecture-document comparison. The new work should make structured lookup materially better than manually opening documents, while preserving RAWR ontology and source-authority boundaries.

## Repo And Branch State

Target worktree:

```text
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs
```

Target branch:

```text
codex/semantica-first-pipeline-implementation
```

Observed target state before this handoff draft:

- Clean.
- Up to date with `origin/codex/semantica-first-pipeline-implementation`.
- Latest local/remote commit before this draft: `3c4cae04 fix(semantica): link sweep reports to html detail views`.

Relevant recent commits:

- `64922b11 feat(semantica): finalize proposal intelligence extraction`
- `339312f6 feat(semantica): add polished report html views`
- `3c4cae04 fix(semantica): link sweep reports to html detail views`

Sibling worktree note:

- The primary worktree at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` may contain unrelated work owned by another agent or user.
- A review agent observed a modified file there: `plugins/cli/plugins/src/lib/agent-config-sync-resources/resources.ts`.
- Do not clean, revert, fold, or submit sibling-worktree changes unless the user explicitly assigns that work.

## Current Capability Manifest

### Stable Commands

Run from the target worktree root:

```bash
bun run semantica:setup
bun run semantica:check
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
bun run semantica:core:visualize
bun run semantica:core:serve
bun run semantica:core:query -- --list
bun run semantica:semantic:capability
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:frame -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:sweep
```

### Generated Report Surfaces

Generated state is ignored and non-authoritative:

```text
.semantica/current/
.semantica/runs/
```

Useful current surfaces:

- `.semantica/current/doc-sweep-report.html`
- `.semantica/current/doc-sweep.json`
- `.semantica/current/doc-sweep-review-queue.json`
- `.semantica/current/doc-sweep.csv`
- `.semantica/current/graph-viewer.html`
- per-document `semantic-compare-report.html`
- per-document `semantic-compare.json`
- proposal-review HTML under proposal run directories

### Current Sweep Snapshot

Latest inspected current sweep:

```text
run_id: 20260428T055214Z-339312f69102-doc-sweep
documents_analyzed: 46
documents_skipped: 580
claims: 4247
findings: 4795
decision_grade_findings: 10
ambiguous_findings: 3511
candidate_new_findings: 10
source_authority_recommendations: 2
update_needed_recommendations: 20
review_needed_recommendations: 20
```

Example source-authority detail:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `1167` extracted claims
- `1393` findings
- `414` aligned findings
- `972` ambiguous findings
- `5` candidate-new findings
- `2` decision-grade findings
- The decision-grade findings are aligned rejections of prohibited root-level authoring roots at line `712`, not conflicts.

### Named Query Families

`bun run semantica:core:query -- --list` currently exposes:

- graph/source coverage queries
- sweep summary and review queue queries
- single-run semantic comparison queries
- proposal review and repair queue queries
- SPARQL examples

Important limitation:

- Sweep-level named queries work against `doc-sweep.json` and review-queue artifacts.
- Semantic named queries expect a run-root `semantic-compare.json`.
- In a sweep run, full semantic details are under `documents/<slug>/semantic-compare.json`, so there is no global claim/finding query corpus yet.

### LLM Reality

Semantica LLM extraction is wired but optional and fail-closed:

- `--extraction-mode semantica-llm`
- requires `--llm-provider`
- requires `--llm-model`
- requires provider dependencies and credentials
- output remains evidence-only
- deterministic RAWR policy remains the decision-grade verdict path

Do not relabel deterministic output as LLM output.

## Authority And Safety Invariants

- RAWR reviewed ontology YAML remains authority.
- Candidate queues, deprecated terms, prohibited patterns, authority overlays, source refs, and promotion gates remain RAWR-owned.
- `.semantica/current` and `.semantica/runs` are generated review state, not source truth.
- Semantica and LLM outputs are evidence/proof metadata only.
- A graph or query answer is not decision-grade unless it preserves source path, heading/context, line/char span, rule/verdict, confidence, and review state.
- Direct document reading remains required for final judgment on a specific claim.
- Do not edit finalized architecture/runtime source specs unless explicitly asked.
- Do not introduce service scaffolding for this next stage. Stay inside the workbench, CLI, generated artifacts, and report/query surfaces.

## What Exists In Code

Primary modules:

- `tools/semantica-workbench/src/semantica_workbench/document_sweep.py`
  - discovers docs
  - writes sweep outputs
  - writes per-document semantic compare artifacts
  - writes per-document HTML report links
- `tools/semantica-workbench/src/semantica_workbench/semantic_evidence.py`
  - extracts evidence claims
  - compares claims to ontology/candidates/prohibited/deprecated sets
  - writes finding kinds and explanation chains
- `tools/semantica-workbench/src/semantica_workbench/core_query.py`
  - hosts named queries and SPARQL execution
  - currently lacks a global sweep evidence index query target
- `tools/semantica-workbench/src/semantica_workbench/report_html.py`
  - writes sweep, proposal, and per-document compare HTML views
- `tools/semantica-workbench/src/semantica_workbench/architecture_change_frame.py`
  - builds evidence-backed `ArchitectureChangeFrame`, noun mappings, proposal graph, comparisons, and verdict/repair package
- `tools/semantica-workbench/src/semantica_workbench/semantica_llm_extraction.py`
  - explicit LLM extraction adapter with fail-closed provider/model gating

Primary tests:

- `tools/semantica-workbench/tests/test_workbench.py`

Primary docs:

- `tools/semantica-workbench/README.md`
- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantica-architecture-proposal-intelligence-finalization-workflow.md`
- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/architecture-change-frame-pipeline-workflow.md`
- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/architecture-document-intelligence-next-stage-draft.md`

## Next Stage To Implement

Implement a global sweep evidence index first.

Recommended tracked module:

```text
tools/semantica-workbench/src/semantica_workbench/evidence_index.py
```

Recommended generated artifacts:

```text
sweep-evidence-index.json
sweep-evidence-index.jsonl
sweep-evidence-index-summary.json
sweep-evidence-index.html
sweep-evidence-index.ttl
```

Recommended CLI:

```bash
bun run semantica:doc:index -- --run latest
bun run semantica:core:query -- --named evidence-summary --format text
bun run semantica:core:query -- --named evidence-candidate-new --format json
bun run semantica:core:query -- --named evidence-by-entity --format json
```

Recommended behavior:

- `doc:sweep` writes the index automatically.
- `doc:index` rebuilds the index for existing sweep runs.
- `core:query` uses the index for cross-document evidence queries.
- HTML report surfaces render from the index, not from HTML scraping.
- RDF/TTL projection follows the JSON index, not the other way around.

## Review Questions The Next Stage Must Answer

The implementation should prove it can answer these from structured artifacts:

- Show all candidate-new findings across the sweep with source spans.
- Show all decision-grade source-authority findings and distinguish aligned rejections from conflicts.
- Show all prohibited-pattern mentions by polarity/modality.
- Show unresolved targets grouped by ambiguity bucket and sorted by document contribution.
- Show all findings for a canonical entity across all documents.
- Show repeated candidate concepts that may need ontology review.
- Show high-ambiguity docs that likely represent parser noise versus real architecture gaps.
- Show the source lines behind a proposal verdict or repair action.

## What To Avoid

- Do not frame the next stage as a general semantic QA engine.
- Do not make RDF/SPARQL the first mandatory query substrate.
- Do not parse generated HTML as data.
- Do not index only `top_findings`.
- Do not create a bespoke named query for every one-off question.
- Do not use raw entity counts as proof of architecture understanding.
- Do not let evidence/candidate/reference geometry leak into canonical architecture truth.
- Do not commit generated `.semantica/` files.

## Verification Baseline

Use this gate while implementing:

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

When the global index exists, add:

```bash
bun run semantica:doc:index -- --run latest
bun run semantica:core:query -- --named evidence-summary --format text
bun run semantica:core:query -- --named evidence-candidate-new --format json
```

## Handoff Summary

The current pipeline is meaningful, but fragmented. It is already better than direct document lookup for document triage and per-document review. The missing capability is a corpus-level evidence index that lets agents and developers query the full sweep without opening each document artifact manually.

Build that index first. Then layer query affordances, HTML navigation, RDF projection, MCP access, and optional LLM expansion in that order.
