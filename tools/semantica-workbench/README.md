# Semantica Workbench

Repository-local workbench for using Semantica against RAWR HQ-Template architecture and migration documents.

The workbench is intentionally single-repo:

- tracked tool source, prompts, ontology definitions, tests, and source manifests live in this repository;
- generated entities, intermediate runs, reports, indexes, and the Python virtual environment live under ignored `.semantica/`;
- the Semantica source repository is not cloned into this repository.

## Commands

Run from the repository root:

```bash
bun run semantica:setup
bun run semantica:check
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
bun run semantica:core:visualize
bun run semantica:doc:diff -- --document docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md
bun run semantica:run -- --fixture
bun run semantica:extract -- --manifest docs/projects/rawr-final-architecture-migration/semantic-source-manifest.yaml --limit-chunks 2
bun run semantica:ontology -- --run latest
bun run semantica:diff -- --run latest
bun run semantica:report -- --run latest
```

`semantica:setup` creates `.semantica/venv` using `uv` and Python 3.12. Other commands run through that environment.

## Core Ontology Path

The core ontology commands are seed-first and treat reviewed YAML as the authority:

- `semantica:core:validate` checks the layered ontology contract, source refs, relation signatures, controlled predicates, and canonical-view leakage.
- `semantica:core:build` writes canonical/layered graph JSON, candidate queue JSON, validation report, and a Markdown graph report under ignored `.semantica/runs/...`.
- `semantica:core:export` runs the Semantica adapter and writes Semantica status, GraphML, and available OWL/SHACL-style outputs for the current graph.
- `semantica:core:visualize` writes a simple local HTML graph viewer for canonical entities and decision relations.
- `semantica:doc:diff` compares a document against the canonical graph and writes both ignored run outputs and the tracked Phase 4 verification summary.

The reviewed source files live under:

```text
tools/semantica-workbench/ontologies/rawr-core-architecture/
```

The CloudPro draft is snapshotted in the ontology workflow context packet for provenance, but the machine-readable YAML files are the normalized ingestion source.

## Extraction Modes

The default extraction mode is `auto`.

- With `OPENAI_API_KEY` set, real document extraction attempts a schema-backed LLM claim extraction pass first and records any fallback.
- Without `OPENAI_API_KEY`, or with `--fixture`, extraction uses the deterministic heuristic extractor.
- Use `--mode heuristic` to force deterministic extraction.
- Use `SEMANTICA_WORKBENCH_MODEL` to override the default LLM model.

The default model is `gpt-5.4-mini`. `gpt-5.5` can be used with `--model gpt-5.5`.

Prompts live under `tools/semantica-workbench/prompts/`:

- `authority-claim-extraction.md`
- `entity-resolution.md`
- `relation-edge-extraction.md`
- `quality-review.md`

The current pipeline uses the claim extraction prompt with schema-backed JSON, then resolves seeded entities and controlled relation edges deterministically.

## Source Scope

The default manifest is packet-scoped to:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integrated-architecture-alignment-cloud-pro-inputs
```

It includes `01`, `02`, and `03`. It intentionally excludes `00-cloud-pro-task-prompt.md` because that file is task scaffolding, not graph source truth.

## Generated State

Generated files are ignored and written here:

```text
.semantica/venv/
.semantica/runs/<timestamp>-<git-sha>/
.semantica/current/
```

The tracked ontology definitions are schema-like guardrails for normalization. They are not generated runtime state. Generated seed catalogs are written under each ignored run directory as `seeds.json`.
