# Semantica Workbench Modernization Baseline

Status: Phase 0 baseline contract
Date: 2026-04-29
Branch: `codex/semantica-first-pipeline-implementation`

## Purpose

This baseline freezes the behavior and authority boundaries that the `tools/semantica-workbench` modernization must preserve. The modernization is a contract-preserving cleanup of Python tooling, tests, types, and module boundaries. It is not a rewrite of the architecture-document intelligence pipeline.

Generated Semantica and LLM outputs remain review evidence. They do not become RAWR truth, reviewed ontology facts, candidate promotions, source-authority decisions, or deterministic verdict authority.

## Public Command Contract

The repo-level Bun scripts are the stable public command surface:

- `semantica:setup`
- `semantica:check`
- `semantica:quality`
- `semantica:core:validate`
- `semantica:core:build`
- `semantica:core:export`
- `semantica:core:visualize`
- `semantica:core:serve`
- `semantica:core:query`
- `semantica:doc:diff`
- `semantica:doc:triage`
- `semantica:doc:extract`
- `semantica:doc:compare`
- `semantica:doc:frame`
- `semantica:doc:proposal-compare`
- `semantica:doc:sweep`
- `semantica:doc:index`
- `semantica:doc:augment-llm`
- `semantica:semantic:capability`
- `semantica:extract`
- `semantica:ontology`
- `semantica:diff`
- `semantica:report`
- `semantica:run`

Modernization phases must preserve these command names and safe defaults unless a later explicit migration plan changes the public contract.

## Generated Artifact Contract

Generated artifacts remain ignored local state under `.semantica/`. The current generated artifact universe is defined in `tools/semantica-workbench/src/semantica_workbench/core_config.py` as `CORE_GRAPH_FILENAMES`; modernization may change implementation internals, but it must not silently remove or rename these artifact names without an explicit migration note and compatibility decision:

- `metadata.json`
- `validation-report.json`
- `canonical-graph.json`
- `layered-graph.json`
- `candidate-queue.json`
- `core-ontology-summary.json`
- `report.md`
- `semantica-export.json`
- `semantica-ontology.json`
- `semantica-ontology.owl`
- `semantica-ontology.shacl.ttl`
- `semantica-data-graph.ttl`
- `core-ontology.graphml`
- `graph-viewer.html`
- `document-diff.json`
- `document-diff-report.md`
- `semantic-capability-report.json`
- `semantic-capability-report.md`
- `document-chunks.jsonl`
- `evidence-claims.jsonl`
- `evidence-claims.json`
- `suppressed-lines.json`
- `resolved-evidence.json`
- `semantic-compare.json`
- `semantic-compare-report.md`
- `semantic-compare-report.html`
- `semantic-evidence.ttl`
- `architecture-change-frame.json`
- `architecture-change-frame-validation.json`
- `noun-mappings.json`
- `proposal-graph.ttl`
- `claim-comparisons.json`
- `verdict-repair.json`
- `proposal-review-report.md`
- `proposal-review-report.html`
- `proposal-provenance.json`
- `doc-sweep.json`
- `doc-sweep-report.md`
- `doc-sweep-report.html`
- `doc-sweep-review-queue.json`
- `doc-sweep.csv`
- `doc-sweep.ttl`
- `sweep-evidence-index.json`
- `sweep-evidence-index.jsonl`
- `sweep-evidence-index-summary.json`
- `sweep-evidence-index.html`
- `sweep-evidence-index.ttl`
- `sweep-evidence-agent-manifest.json`
- `sweep-llm-evidence-augmentation.json`
- `quarantine-candidates.json`
- `update-candidates.json`
- `no-signal-documents.json`

The `.semantica/current/` snapshot may contain only the artifacts relevant to the most recent command family. The artifact contract is therefore name and compatibility oriented, not a guarantee that every file exists after every command.

## Fixture And Schema Inputs

Current fixture inputs:

- `tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md`
- `tools/semantica-workbench/fixtures/docs/architecture-change-proposal.md`
- `tools/semantica-workbench/fixtures/docs/migration-plan.md`
- `tools/semantica-workbench/fixtures/docs/runtime-target.md`
- `tools/semantica-workbench/fixtures/docs/sweep/active.md`
- `tools/semantica-workbench/fixtures/docs/sweep/no-signal.md`
- `tools/semantica-workbench/fixtures/docs/sweep/archive/skipped.md`
- `tools/semantica-workbench/fixtures/docs/sweep/quarantine/skipped.md`
- `tools/semantica-workbench/fixtures/semantic-evidence-expected.json`
- `tools/semantica-workbench/fixtures/semantic-source-manifest.yaml`

Current external schema surface:

- `tools/semantica-workbench/schemas/architecture-change-frame.schema.json`

Schema validation and typed model work should strengthen this contract without replacing RAWR authority semantics.

## Current Python Shape

Current package root:

- `tools/semantica-workbench/src/semantica_workbench/`

High-risk modernization targets observed in the baseline:

- `semantic_evidence.py`: extraction, comparison, Semantica capability probing, and policy logic are concentrated in one large module.
- `architecture_change_frame.py`: frame extraction, noun mapping, proposal graph, comparison, repair output, and report rendering are concentrated in one large module.
- `core_ontology.py`: ontology loading, validation, graph construction, and export-adjacent logic are tightly coupled.
- `core_query.py`: named query execution and rendering are large and mixed.
- `report_html.py`: HTML rendering is hand-built and broad.
- `tools/semantica-workbench/tests/test_workbench.py`: the test suite is one large `unittest` file.

The refactor order should remain tests and contracts first, then production module decomposition.

## Verification Baseline

Use the workbench-managed Python environment for tests:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
```

Do not use ambient `python -m unittest` as a baseline gate; it can resolve to an unrelated Python version and fail to import the local package.

Core smoke commands for later phases:

```bash
bun run semantica:semantic:capability
bun run semantica:quality
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:frame -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:doc:index -- --run latest
bun run semantica:core:query -- --named evidence-summary --format text
```

Hygiene gates:

```bash
git diff --check
git status --short --branch
gt status
```

## Authority Boundaries

The following remain RAWR-owned and deterministic:

- Reviewed core ontology and overlays.
- Source authority ranking and archive/quarantine exclusions.
- Candidate queue and promotion gates.
- Prohibited and deprecated vocabulary policy.
- Review states and review-action assignment.
- Verdict semantics for decision-grade findings.
- Human promotion of any generated evidence into accepted architecture truth.

Semantica, graph projections, RDF, MCP-facing manifests, and LLM sidecars are generated evidence/provenance surfaces. They support review and discovery; they do not decide architecture truth.

## Phase 0 Review Notes

- Docs/information: this baseline is intended as the first artifact future agents read before modernization work.
- Architecture: it separates current behavior, transition risk, and target cleanup shape.
- Objective alignment: it makes later cleanup measurable by preserving commands, artifacts, tests, and authority boundaries instead of optimizing for cosmetic file movement.
