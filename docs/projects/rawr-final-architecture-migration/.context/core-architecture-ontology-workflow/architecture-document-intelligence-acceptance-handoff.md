# Architecture Document Intelligence Acceptance Handoff

Status: accepted local implementation slice
Date: 2026-04-29
Branch: `codex/semantica-first-pipeline-implementation`
PR: `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/251`

## Purpose

This handoff records the end-to-end acceptance state for the corpus evidence intelligence slice:

```text
doc sweep -> corpus evidence index -> index-backed queries -> HTML evidence navigation -> RDF projection -> agent manifest -> optional LLM sidecar
```

The pipeline is useful as a generated review-evidence system. It is not an automatic architecture authority. RAWR reviewed ontology, source-authority policy, candidate promotion, prohibited/deprecated semantics, and deterministic verdict policy remain authoritative.

## Implemented Capability

The workbench can now produce and query a corpus-level evidence index from a full document sweep.

Implemented surfaces:

- `semantica:doc:sweep` generates per-document semantic comparison artifacts plus the corpus evidence index.
- `semantica:doc:index` rebuilds the corpus evidence index for an existing sweep run.
- `semantica:core:query` exposes stable evidence queries over `sweep-evidence-index.json`.
- `sweep-evidence-index.html` provides a human audit view over the same JSON index.
- `sweep-evidence-index.ttl` projects the JSON index into RDF for evidence SPARQL examples.
- `sweep-evidence-agent-manifest.json` gives agents stable commands/artifacts and explicitly says RAWR evidence MCP access is not wired.
- `semantica:doc:augment-llm` writes an optional `sweep-llm-evidence-augmentation.json` sidecar over selected ambiguous, unresolved, and candidate evidence rows.

The developer-facing improvement is that source reading is no longer the discovery mechanism. A reviewer can ask a structured cross-document question first, then open exact source spans and per-document reports for judgment.

## Acceptance Run

Fresh acceptance sweep:

- Run: `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep`
- Documents analyzed: `46`
- Documents skipped: `583`
- Claims indexed: `4247`
- Findings indexed: `4795`
- Index warnings: `0`
- Decision-grade findings: `10`
- Ambiguous findings: `3511`
- Candidate-new findings: `10`
- Recommendations:
  - `source-authority`: `2`
  - `update-needed`: `20`
  - `review-needed`: `20`
  - `outside-scope`: `4`

Primary generated artifacts:

- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/doc-sweep-report.html`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-evidence-index.html`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-evidence-index.json`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-evidence-index.jsonl`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-evidence-index.ttl`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-evidence-agent-manifest.json`
- `.semantica/runs/20260429T042659Z-2fea15f29143-doc-sweep/sweep-llm-evidence-augmentation.json`

Generated artifacts remain local ignored state under `.semantica/`.

## What This Lets A Developer Do

A developer can now answer corpus-level architecture review questions from structured artifacts:

- Which documents need review or update, and why?
- Which claims are candidate-only, unresolved, weakly scoped, aligned, outside-scope, or decision-grade?
- Which source-authority documents show parser-regression or source-authority signals?
- Which exact source lines explain a finding or review action?
- Which candidate concepts recur and may deserve human ontology review?
- Which prohibited-pattern mentions are already aligned rejections rather than conflicts?

The answer format is intentionally review-oriented: query result -> source span -> report link -> human decision. The system does not claim that generated evidence is architecture truth.

Recommended first reviewer entrypoints:

- Start with `evidence-summary` for run health and counts.
- Use `evidence-by-document` for triage by document.
- Use `evidence-candidate-new` for ontology-review candidates.
- Use `evidence-prohibited-pattern-mentions` for prohibited-construction review.
- Use decision-grade SPARQL examples or JSON query output for high-risk findings.

Do not use `evidence-review-queue` as the first human review surface on large sweeps. It is intentionally broad and can contain thousands of ambiguity rows.

## Useful Commands

Regenerate the core acceptance path:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:semantic:capability
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:doc:index -- --run latest
```

Query corpus evidence:

```bash
bun run semantica:core:query -- --named evidence-summary --format text
bun run semantica:core:query -- --named evidence-review-queue --format text
bun run semantica:core:query -- --named evidence-candidate-new --format json
bun run semantica:core:query -- --named evidence-unresolved-targets --format json
bun run semantica:core:query -- --named evidence-agent-manifest --format json
```

Query RDF projection:

```bash
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-candidate-new.rq --format json
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-prohibited-patterns.rq --format json
```

Run optional LLM sidecar modes:

```bash
bun run semantica:doc:augment-llm -- --run latest --llm-provider openai --limit 3
bun run semantica:doc:augment-llm -- --run latest --llm-provider mock --llm-model mock-model --limit 2
```

Open generated review views:

```text
.semantica/current/doc-sweep-report.html
.semantica/current/sweep-evidence-index.html
```

## Verification Completed

Executed gates:

- Full workbench unit suite: `75` tests passed.
- `bun run semantica:semantic:capability`
- `bun run semantica:doc:compare -- --fixture`
- `bun run semantica:doc:proposal-compare -- --fixture`
- `bun run semantica:doc:sweep`
- `bun run semantica:doc:index -- --run latest`
- `bun run semantica:core:query -- --named evidence-summary --format text`
- `bun run semantica:core:query -- --named evidence-review-queue --format text`
- `bun run semantica:core:query -- --named evidence-agent-manifest --format text`
- `bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-candidate-new.rq --format json`
- `bun run semantica:doc:augment-llm -- --run latest --llm-provider openai --limit 3`
- `bun run semantica:doc:augment-llm -- --run latest --llm-provider mock --llm-model mock-model --limit 2`
- HTML/report artifact link check for the acceptance run.

Observed LLM sidecar behavior:

- OpenAI mode without a model is blocked with `blocked-requires-model`, selects rows, and writes no suggestions.
- Mock mode writes schema-valid evidence-only suggestions for selected rows.
- The deterministic index and query outputs remain unchanged by augmentation.

## Boundaries And Residual Uncertainty

- Generated evidence is not RAWR truth.
- Candidate rows do not promote themselves into the reviewed ontology.
- The RDF projection is useful for graph/SPARQL access, but JSON remains the generated-evidence contract.
- The agent manifest is useful for tool-facing handoff, but RAWR evidence is not yet wired through a live Semantica MCP server.
- Real provider LLM quality is not accepted yet because the local acceptance run used blocked/no-provider and mock paths only.
- The current deterministic extraction still creates many ambiguous and weak-modality rows; that is useful for review triage but should not be mistaken for semantic certainty.
- RDF resolved-target IRIs can still be overread if exposed broadly. Before making RDF/MCP a decision interface, add explicit target authority/status or a distinct evidence-target namespace.
- Evidence named queries currently run in normal sweep runs because `layered-graph.json` is present. If the index becomes a portable standalone artifact, remove the query-layer dependency on `layered-graph.json`.
- The LLM augmentation sidecar is one file per run and later provider/mode attempts overwrite it. That is acceptable for the current sandbox, but not for audited comparison of blocked, mock, and real-provider attempts.

## Next Reasonable Work

The next slice should not rebuild the substrate. It should use this pipeline to answer real reviewer questions and reduce noise:

- Tune deterministic evidence selection for high-noise ambiguity buckets.
- Add reviewer workflows around the highest-value queries: decision-grade, candidate-new, unresolved-targets, and source-authority signals.
- Wire a real Semantica MCP access path only if it can expose the stable query/index contract without scraping `.semantica/current`.
- Run a credentialed LLM provider pilot against a small sampled queue and evaluate output quality as evidence augmentation only.
