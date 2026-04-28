# Semantic Evidence Document Sweep Plan

## Summary

Build the repo-wide batch capability on top of the existing single-document semantic evidence comparison pipeline. The new capability answers: "Given a set of Markdown documents, which ones look aligned, need updates, need human review, or may belong in quarantine?" It preserves per-document artifacts, aggregates results into reviewable reports, and stays advisory: it does not edit, move, or quarantine documents.

This is not a rewrite of the ontology/evidence model. The reviewed ontology YAML remains authoritative, generated evidence remains evidence, and sweep recommendations are triage outputs grounded in per-document semantic compare artifacts.

## Branch And First Actions

Implementation branch:

```bash
gt create codex/semantic-evidence-doc-sweep --no-interactive --no-ai
```

First tracked artifacts:

- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-doc-sweep-plan.md`
- `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-doc-sweep-orchestrator-workflow.md`

## Implementation Changes

Add `semantica:doc:sweep` as a batch command that accepts repeatable `--root`, repeatable `--document`, repeatable `--include-glob`, repeatable `--exclude-segment`, plus `--limit`, `--format text|markdown|json`, and `--fail-on none|decision-grade`.

Default root is `docs`. Default include glob is `**/*.md`. Default excluded path segments are `quarantine`, `archive`, `_archive`, `.semantica`, `.git`, `node_modules`, `dist`, and `build`. `.context` remains included by default but is classified as `context-provenance`.

The sweep reuses the current semantic evidence engine. It creates a new `.semantica/runs/<timestamp>-<git-sha>-doc-sweep/` run, copies the core graph inputs needed by query/viewer surfaces, writes isolated per-document artifacts under `documents/<safe-doc-slug>-<short-hash>/`, and writes aggregate review outputs at the sweep run root.

Aggregate outputs:

- `doc-sweep.json`
- `doc-sweep-report.md`
- `doc-sweep-review-queue.json`
- `doc-sweep.csv`
- `doc-sweep.ttl`
- `quarantine-candidates.json`
- `update-candidates.json`
- `no-signal-documents.json`

## Recommendation Policy

Each document receives one primary recommendation and zero or more reason codes:

- `source-authority`: finalized/core source documents referenced by ontology source refs. These are parser-regression targets, never automatic quarantine candidates.
- `aligned-active`: meaningful aligned evidence, no decision-grade conflicts, no deprecated target-use, and no high-risk unresolved material.
- `update-needed`: deprecated target vocabulary, stale architecture framing, missing/underrepresented policy coverage, or findings that point to doc edits.
- `review-needed`: candidate-new concepts, unresolved/entityless claims, subordinate policy gaps, high ambiguity, or low-confidence semantic resolution.
- `quarantine-candidate`: decision-grade conflict, active target assertion of prohibited/superseded construction, or strong evidence that the doc is obsolete as active guidance.
- `outside-scope`: zero claims or only process/provenance/scaffold material.

Conservatism rules:

- No document becomes `quarantine-candidate` from lexical matches alone.
- No source-authority document becomes `quarantine-candidate` automatically.
- Ambiguity produces `review-needed`, not conflict.
- Historical/example/replacement-table mentions do not produce decision-grade conflicts.
- Explicit documents inside excluded paths are allowed but tagged as `explicit-excluded-path`.

## Query, RDF, And Viewer Updates

Add named queries for sweep outputs:

- `sweep-summary`
- `sweep-review-queue`
- `sweep-quarantine-candidates`
- `sweep-update-candidates`
- `sweep-no-signal-documents`
- `sweep-high-ambiguity-docs`

Sweep queries read `doc-sweep.json` and related sweep artifacts, not stale single-document diff files. If no sweep artifact exists, they fail clearly with the expected path. SPARQL query flow should include the sweep TTL when available. The Cytoscape viewer only needs a minimal aggregate sweep summary; it remains an inspection surface, not source truth.

## Verification

Required command gate:

```bash
bunx nx show projects >/dev/null
bun run semantica:setup
bun run semantica:check
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:diff -- --mode semantic --fixture
bun run semantica:doc:sweep -- --root docs/projects/rawr-final-architecture-migration --limit 12
bun run semantica:doc:sweep -- --root docs --limit 25
bun run semantica:core:query -- --named sweep-summary --format text
bun run semantica:core:query -- --named sweep-review-queue --format text
bun run semantica:core:query -- --named sweep-quarantine-candidates --format text
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/semantic-findings.rq --format text
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
git diff --check
git check-ignore .semantica/current/doc-sweep-report.md
git status --short --untracked-files=all
```

Also run an uncapped smoke sweep over `docs/projects/rawr-final-architecture-migration` if runtime remains reasonable.

## Acceptance Criteria

- `semantica:doc:sweep` can analyze arbitrary Markdown roots and explicit documents.
- Quarantine/archive/generated paths are excluded by default.
- Per-document semantic compare artifacts are preserved.
- Aggregate JSON, Markdown, CSV, TTL, and review-queue outputs are generated.
- Recommendations are advisory, explainable, and trace back to source spans and per-document findings.
- No document is moved, edited, or quarantined by the sweep.
- Source-authority docs are treated as regression inputs, not quarantine targets.
- Named sweep queries return useful answers and fail clearly when sweep artifacts are missing.
- Existing single-document compare/diff behavior still works.
- Generated outputs remain ignored under `.semantica`.
- Worktree is clean after Graphite commit.
