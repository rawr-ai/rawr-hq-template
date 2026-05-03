# Semantica Workbench Modernization Handoff

Date: 2026-04-29

Branch: `codex/semantica-first-pipeline-implementation`

Local stack state at handoff writing: `HEAD` is `6a54ee46` plus the final release-hygiene/handoff commit created from this document update. Before that final commit, the branch was ahead of `origin/codex/semantica-first-pipeline-implementation` by 9 commits.

## Purpose

This handoff records the completed contract-preserving modernization pass for `tools/semantica-workbench`.

The modernization goal was maintainability, testability, type-safety, and safer extension. It was not a rewrite of the architecture-document intelligence workflow, not a change to RAWR ontology authority, and not a promotion of Semantica or LLM output into RAWR truth.

## Authority Boundary

The boundary remains unchanged:

- RAWR-reviewed ontology, source authority, promotion gates, candidate handling, verdict semantics, and review actions remain deterministic RAWR-owned policy.
- Semantica outputs, RDF projections, LLM extraction, and LLM augmentation remain generated evidence, sidecar metadata, or review substrate.
- Generated artifacts remain local state under `.semantica/` and are not source authority.
- Human-governed promotion is still required before any generated evidence changes RAWR truth.

## Completed Phases

### Phase 0: Baseline Contract Freeze

Commit: `e35f187e docs(semantica): freeze workbench modernization baseline`

Added `semantica-workbench-modernization-baseline.md` and linked it from `Workflow.md`.

The baseline freezes:

- current command surface;
- generated artifact names;
- fixture and schema inputs;
- `.semantica/current` expectations;
- RAWR authority boundaries;
- known high-risk modules and test structure;
- required verification gates.

### Phase 1: Python Tooling And Quality Gate

Commit: `1bdba06b feat(semantica): add workbench quality gate`

Added a repeatable quality gate:

- `ruff` for lint and format;
- `pyright` for static analysis;
- `pytest` and `pytest-cov` for modern test execution while preserving `unittest`;
- `jsonschema` and `types-PyYAML` for artifact validation and typing support;
- `bun run semantica:quality` as the stable repo-level gate.

The gate currently passes with `0` Pyright errors and existing warning debt still visible.

### Phase 2: Test Suite Architecture Split

Commit: `55270b9a test(semantica): split workbench suite by domain`

Replaced the monolithic test file with domain-oriented tests and shared support helpers.

The split preserved the original behavioral coverage while making later refactors safer:

- core ontology and authority overlays;
- semantic evidence;
- architecture change frames;
- proposal comparison;
- document sweep;
- corpus evidence index;
- core queries;
- Semantica capability/intake/LLM surfaces;
- LLM augmentation sidecar;
- manifest extraction.

### Phase 3: Typed Artifact Models And Schema Validation

Commit: `ea970951 feat(semantica): add artifact contract schemas`

Added `artifact_models.py` and JSON schemas for externally consumed generated artifacts:

- `sweep-evidence-index.schema.json`;
- `sweep-llm-evidence-augmentation.schema.json`.

The schemas validate authority boundaries explicitly:

- generated claim, finding, and LLM suggestion rows are non-promotable;
- LLM suggestions are evidence-only;
- source spans are required on indexed finding rows, indexed claim rows, and LLM suggestion source rows;
- review action is required on finding rows, and provenance/source references are required at generated evidence boundaries.

### Phase 4: Module Decomposition By Responsibility

Commits:

- `32b083f5 refactor(semantica): extract capability probe module`
- `5d689326 refactor(semantica): extract semantic evidence report renderer`
- `fd0385c6 refactor(semantica): extract semantic evidence export`
- `68b5b527 refactor(semantica): split core query rendering`
- `6a54ee46 refactor(semantica): extract report html layout primitives`

The decomposition deliberately used compatibility facades so existing imports and CLI behavior remain stable.

Extracted boundaries:

- Semantica capability probing now lives in `semantic_capability.py`.
- Semantic compare Markdown report rendering now lives in `semantic_evidence_report.py`.
- Semantic compare Turtle export now lives in `semantic_evidence_export.py`.
- Core query family membership lives in `core_query_contracts.py`.
- Core query text rendering lives in `core_query_rendering.py`.
- Shared HTML primitives live in `report_html_layout.py`.

Remaining large modules still exist, but the highest-confidence separable responsibilities have been pulled out without changing artifact contracts.

## Targeted Library Delegation Decision

No further product/runtime delegation libraries were adopted beyond the quality gate and schema-validation tooling added in Phase 1.

This was deliberate:

- `rdflib` is already used where RDF parsing/querying is needed.
- `jsonschema` is now used for external artifact validation.
- `argparse` remains adequate for the current CLI surface.
- `Jinja2` is deferred until HTML rendering has a committed snapshot/golden parity suite.
- `Pydantic` is deferred because dataclasses, `TypedDict`, and JSON Schema cover the current artifact-boundary need without adding runtime model churn.
- `Typer` or Click is deferred because changing CLI framework would risk command-surface drift without clear user capability gain.
- `markdown-it-py` or another Markdown parser is deferred until exact line/char span preservation can be proven against fixtures.
- `pyshacl` is deferred until SHACL validation becomes an actual acceptance gate rather than a theoretical capability.

The current stance is: add libraries only when they reduce measured brittleness while preserving source spans, artifact shape, and RAWR authority semantics.

## Semantica And LLM Boundary Decision

The Semantica/LLM boundary remains honest and intentionally constrained:

- Semantica capability probing is explicit and pinned to the local package reality.
- Semantica-backed extraction remains a pilot or sidecar path, not the deterministic authority path.
- LLM extraction and augmentation are gated by provider availability and provenance requirements.
- No LLM output assigns decision-grade verdicts.
- No Semantica output promotes candidates into the reviewed ontology.
- Deterministic RAWR comparison still owns verdicts, review actions, source-authority policy, and promotion gates.

This is the correct boundary until Semantica/LLM paths prove source-span fidelity, schema fit, and reviewer-useful quality on real architecture documents.

## Verification Summary

The modernization pass repeatedly ran the following gates during phase work:

- `bun run semantica:quality`
- `python -m unittest discover -s tools/semantica-workbench/tests`
- targeted `pytest` suites for the modules being changed
- targeted Ruff lint/format checks
- full Ruff format checking after the release-hygiene pass
- `git diff --check`
- Graphite status checks before commits
- representative `semantica:core:query` text-output smoke against an explicit valid run
- full workbench smoke commands for capability, core validate/build/export, fixture extract/compare/proposal-compare, sweep, and index

The final known full quality gate passed:

- Ruff: passed
- Pyright: `0` errors, existing warning debt
- Pytest: `76` passed, `3` existing SWIG-related warnings
- Full Ruff format check: passed after the release-hygiene format pass
- Full document sweep smoke: `46` documents analyzed, `587` skipped
- Sweep evidence index smoke: `4,247` claims, `4,795` findings, `0` warnings

## Remaining Risk And Deferred Work

Remaining risks are real but now more visible:

- Pyright warning debt is still high, especially around optional artifact loading and large legacy `dict[str, Any]` flows.
- `architecture_change_frame.py`, `core_ontology.py`, `semantic_evidence.py`, and `report_html.py` are still large enough to deserve future bounded splits.
- HTML output has useful tests and ad hoc parity checks, but not committed golden/snapshot fixtures.
- Query names, query descriptions, execution, and text rendering are cleaner but not yet fully unified under one registry object.
- Semantica LLM quality has not been accepted as a production extraction source; blocked/mock modes are validated, real-provider quality remains a future evaluation task.
- Generated-state `latest` can be disturbed by tests; robust user-facing smokes should prefer explicit run paths or regenerate current state before checking query behavior.
- The release-hygiene format pass touched additional workbench modules mechanically; future review should treat those changes as formatting-only unless a semantic diff says otherwise.

## Suggested Next Modernization Slices

Do these only as bounded, review-gated follow-ups:

1. Reduce Pyright warning debt in `core_query.py` by making artifact-loading branches explicit and typed.
2. Split `architecture_change_frame.py` into validation, reference geometry, proposal comparison, and report rendering modules.
3. Add HTML golden/snapshot parity tests for representative report outputs.
4. Convert query registry metadata into a single source for query family, description, required artifact, and text renderer.
5. Evaluate `Jinja2` only after snapshot tests exist.
6. Evaluate Markdown parser replacement only after exact source-span parity is proven.
7. Re-run Semantica/LLM real-provider evaluation on full architecture documents before trusting LLM evidence quality beyond sidecar suggestions.

## Current Completion Verdict

The workbench is now materially better organized than before:

- it has a stable quality gate;
- tests are split by behavior domain;
- external artifact contracts have schemas and boundary validators;
- high-confidence responsibilities have been extracted into smaller modules;
- library/framework decisions are documented rather than left implicit;
- Semantica/LLM authority boundaries remain intact.

This is not a finished rewrite and should not be treated as one. It is a clean modernization foundation that preserves current behavior while making future changes safer.
