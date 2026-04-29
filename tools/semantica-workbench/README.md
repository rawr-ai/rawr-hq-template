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
bun run semantica:core:serve
bun run semantica:core:query -- --named forbidden-terms
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/runtime-artifacts.rq
bun run semantica:semantic:capability
bun run semantica:doc:triage -- --document docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:frame -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:doc:index -- --run latest
bun run semantica:doc:diff -- --mode semantic --document docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md
bun run semantica:core:query -- --named proposal-review-summary
bun run semantica:core:query -- --named proposal-repair-queue
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
- `semantica:core:visualize` writes a self-contained Cytoscape HTML graph viewer for canonical entities, overlays, throughline presets, and the latest lexical triage or semantic evidence comparison.
- `semantica:core:serve` serves the current graph viewer locally for browser inspection.
- `semantica:core:query` gives agents a stable query surface for named JSON graph questions and SPARQL files over the generated Turtle data graph.
- `semantica:semantic:capability` records which pinned Semantica surfaces are available locally and which are only substrate-level helpers.
- `semantica:doc:triage` runs the legacy lexical term matcher. It is useful for hints, but it is not decision-grade semantic validation.
- `semantica:doc:extract` parses a comparison document into source-backed evidence claims with polarity, modality, assertion scope, resolved IDs, and review state.
- `semantica:doc:compare` resolves those evidence claims against the ontology baseline and emits `aligned`, `conflict`, `deprecated-use`, `candidate-new`, `ambiguous`, `outside-scope`, and `informational` findings.
- `semantica:doc:frame` maps source-backed evidence into an evidence-only `ArchitectureChangeFrame` and validation artifact. Extraction-only frames carry `not-evaluated` claim verdicts and no review actions.
- `semantica:doc:proposal-compare` runs RAWR-owned deterministic comparison over the frame and writes noun mappings, proposal graph TTL, claim comparisons, verdict/repair JSON, provenance, and a review report.
- `semantica:doc:sweep` analyzes active Markdown docs, writes per-document semantic comparison artifacts, and emits a corpus-level sweep evidence index.
- `semantica:doc:index` rebuilds the corpus-level `sweep-evidence-index.json`, JSONL, and summary artifacts for an existing sweep run.
- `semantica:doc:diff -- --mode semantic` is the compatibility command for the semantic evidence path. The default mode remains lexical for compatibility.

The reviewed source files live under:

```text
tools/semantica-workbench/ontologies/rawr-core-architecture/
```

The CloudPro draft is snapshotted in the ontology workflow context packet for provenance, but the machine-readable YAML files are the normalized ingestion source.

## Graph Inspection And Agent Queries

The graph viewer is an inspection surface, not a source of truth. It is generated from the reviewed YAML ontology and ignored run artifacts.

For human review:

```bash
bun run semantica:core:visualize
bun run semantica:core:serve
```

For agent-facing semantic questions:

```bash
bun run semantica:core:query -- --list
bun run semantica:core:query -- --named underrepresented-gates
bun run semantica:core:query -- --named semantic-conflicts
bun run semantica:core:query -- --named aligned-rejections
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/relation-samples.rq
```

Named queries use the richer JSON graph and diff outputs. Core SPARQL examples run against `semantica-data-graph.ttl`, which is produced by `semantica:core:export`. Evidence-specific SPARQL examples named `evidence-*.rq` run against the generated `sweep-evidence-index.ttl` projection from `semantica:doc:sweep` / `semantica:doc:index`; that projection is review evidence, not canonical RAWR truth.

## Extraction Modes

The legacy manifest command family (`semantica:extract`, `semantica:run`) keeps its existing `--mode auto|heuristic|llm` behavior for packet-source ontology extraction.

The architecture proposal/document comparison commands default to deterministic RAWR evidence extraction:

```bash
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
```

They also expose explicit Semantica modes:

```bash
bun run semantica:doc:extract -- --fixture --extraction-mode semantica-pattern
bun run semantica:doc:extract -- --fixture --extraction-mode semantica-llm --llm-provider openai --llm-model <model>
```

- `deterministic` is the safe default and produces decision-grade evidence for RAWR-owned comparison policy.
- `semantica-pattern` records Semantica non-LLM extraction as an evidence sidecar while deterministic RAWR extraction remains the oracle.
- `semantica-llm` is explicit and fail-closed. It requires the provider dependency, credentials, and `--llm-model`; blocked LLM output is recorded separately and deterministic evidence is not relabeled as LLM evidence.
- Any Semantica/LLM output remains evidence-only with exact source re-anchoring, confidence, review state, and `promotion_allowed: false`.

Prompts live under `tools/semantica-workbench/prompts/`:

- `authority-claim-extraction.md`
- `entity-resolution.md`
- `relation-edge-extraction.md`
- `quality-review.md`

The architecture-source extraction pipeline uses the claim extraction prompt with schema-backed JSON, then resolves seeded entities and controlled relation edges deterministically.

The document-comparison pipeline is separate. It treats comparison documents as evidence sources, not ontology truth:

```text
document
  -> evidence claims with source spans, polarity, modality, and assertion scope
  -> resolution against canonical entities, deprecated vocabulary, prohibited construction patterns, and candidates
  -> claim-aware constraint findings
```

A phrase match alone must not create a decision-grade finding. For example, `There is no root-level core/ authoring root` is an aligned rejection of a prohibited construction, not a conflict.

## Architecture Change Frame Pilot

The frame pipeline schema lives at:

```text
tools/semantica-workbench/schemas/architecture-change-frame.schema.json
```

It adapts the external `ArchitectureChangeFrame` vocabulary as an intermediate extraction target for semantica/LLM pilots. The schema keeps RAWR ownership explicit: semantica output is evidence, the reviewed ontology remains truth authority, reference geometry is comparison-only, and every claim or noun mapping must carry structured evidence refs with source path, heading context, line span, char span, extraction method, confidence, review state, and `promotion_allowed: false`.

The first executable path is deterministic and evidence-backed:

```text
RAWR evidence claims
  -> ArchitectureChangeFrame
  -> noun mappings
  -> proposal graph TTL
  -> claim comparisons
  -> verdict/repair package
  -> review report
```

`doc:frame` stops at an extraction-only frame. `doc:proposal-compare` applies RAWR-owned verdict policy and review-action generation. Generated artifacts are review aids; they do not promote ontology truth.

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
