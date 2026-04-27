# Core Ontology Operationalization Orchestrator Workflow

## Mission

Coordinate the Phase 1-4 ontology operationalization effort so the output is a reviewed, provenance-backed ontology graph and a testing-plan semantic diff proof run. This workflow is for execution coordination only; it does not authorize Phase 5 migration planning.

## Team Shape

Codex is the DRI for final synthesis, integration, and commit quality.

Use a small team only where parallel review beats single-agent execution:

- Ontology normalization owner: verifies the CloudPro draft is converted into strict layered YAML without promoting candidates or evidence-only terms.
- Workbench engineer: checks CLI/data-flow changes and test coverage.
- Semantica/export owner: checks Semantica adapter usage, export artifacts, and graceful fallback behavior.
- Diff/review owner: checks the testing-plan diff output for useful, non-manufactured findings.
- Verifier: checks schema validation, source references, generated-state hygiene, and clean repo state.

## Shared Frame For Every Agent

- Semantica is substrate, not source of truth.
- The reviewed ontology YAML governs truth.
- Evidence and candidate terms must not be silently promoted.
- The graph should be small enough to inspect and large enough to carry operational consequences.
- Phase 4 is a verification run against the testing plan, not a testing-plan rewrite.
- No finalized source specs are modified.
- No Phase 5 migration planning happens in this pass.

## Coordination Contract

- Agents receive precise ownership boundaries and do not edit overlapping files unless directed.
- Semantic reviewers may challenge the ontology shape, but Codex owns the final decision and integration.
- Scratch or generated outputs belong under ignored `.semantica/` unless explicitly promoted as a durable context artifact.
- Durable tracked outputs are limited to:
  - the implementation plan;
  - this orchestrator workflow;
  - normalized ontology source;
  - workbench code/tests/docs;
  - final Phase 4 verification summary.

## Handoff Interfaces

- Ontology review hands off a list of schema or meaning risks, not a rewritten ontology unless asked.
- Workbench implementation hands off exact commands run and changed file groups.
- Semantica/export review hands off whether Semantica was actually invoked, what outputs were created, and what fell back.
- Diff/review hands off the testing-plan alignment summary with line-backed examples.
- Verifier hands off pass/fail state for tests, generated-state ignore checks, and Graphite cleanliness.

## Failure Handling

- If source refs cannot resolve, stop and fix ontology input rather than weakening validation.
- If Semantica export fails, preserve the reviewed graph outputs and record the failure in metadata; do not block on optional export formats unless the core graph is invalid.
- If the testing-plan diff is too noisy, keep the run output but mark the verification as not decision-grade and identify the specific normalization or predicate issue to fix.
- If unrelated worktree changes appear, do not revert them; isolate this branch's changes and report the conflict if it blocks completion.

## Done

The workflow is complete when the branch contains reviewed ontology inputs, seed-first workbench commands, inspectable graph artifacts generated in ignored state, a tracked testing-plan verification summary, passing tests, and a clean Graphite commit.
