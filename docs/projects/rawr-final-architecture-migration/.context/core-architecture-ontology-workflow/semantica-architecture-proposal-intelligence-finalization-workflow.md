# Semantica Architecture Proposal Intelligence Finalization Workflow

Status: active implementation checklist
Date: 2026-04-28
Branch: `codex/semantica-first-pipeline-implementation`

## Objective

Finalize the RAWR semantica workbench into a review-safe architecture proposal intelligence pipeline:

```text
full architecture document
  -> source-backed ArchitectureChangeFrame evidence
  -> noun mappings
  -> proposal graph
  -> claim comparisons
  -> deterministic verdict/repair package
  -> reviewer report
```

RAWR authority remains reviewed and deterministic. semantica and LLM output are evidence/proof metadata only, never architecture truth, verdict authority, or automatic ontology growth.

## Execution Rules

- Run phases in order. Deterministic foundations must be clean before LLM evidence is admitted.
- Use a fresh review team per phase when judgment is needed.
- Keep review agents read-only unless a phase explicitly assigns a bounded write scope.
- Exploratory scratch notes are temporary and must not remain tracked.
- Commit completed implementation slices through Graphite; do not push or submit again unless explicitly requested.
- Generated `.semantica/current` and `.semantica/runs` state remains ignored and non-authoritative.

## Phase 0: Workflow Capture And Baseline

Deliverables:

- This workflow/checklist artifact.
- Baseline branch/worktree/Graphite status recorded in the implementation log or commit message.

Verification:

- `git status --short --branch`
- `gt status`
- `git diff --check`

Acceptance:

- Future agents can resume from this checklist without relying on transient chat state.

## Phase 1: Deterministic Source Model

Deliverables:

- Central text normalization utility for comparison/search text, preserving raw source text for source spans.
- Explicit document-path identity helper that safely handles both repo-local and external documents.
- Source-span helpers that keep line and character offsets checkable.
- Tests for whitespace, quote, punctuation, encoding, repo-local paths, and external document paths.

Acceptance:

- Deterministic extraction can process full architecture docs without forcing them under repo root.
- Normalized matching does not destroy the raw text needed for evidence refs.
- Span loss is explicit and testable, not silent.

## Phase 2: Deterministic Classification Cleanup

Deliverables:

- Named deterministic rule helpers for prohibited, deprecated, historical, ambiguous, candidate, ownership, projection, runtime, resource-provider, and verification claims.
- Reduced ad hoc text matching in frame and evidence paths.
- Fixture coverage for negation, positive prohibition, historical mention, deprecated replacement table, ambiguity, candidate concepts, and opposite claims.

Acceptance:

- Raw phrase hits cannot create decision-grade conflicts without the required polarity/scope/context.
- Rule names and diagnostics are visible in evidence/provenance where useful for review.

## Phase 3: Authority And Review Surface Hardening

Deliverables:

- Stronger ArchitectureChangeFrame validation for evidence refs, review states, source paths, line spans, char spans, confidence, and promotion flags.
- Review reports that clearly distinguish extraction-only evidence from deterministic verdict/repair outputs.
- Query/report integration that keeps generated evidence and candidate geometry out of target architecture truth.

Acceptance:

- Frames generated from non-curated docs explain what was extracted, what was evaluated, what stayed unclear, and what review action is expected.
- Candidate/reference geometry cannot leak into locked ontology views.

## Phase 4: Semantica Substrate Adapter

Deliverables:

- Explicit non-LLM semantica adapter mode that records semantica module/version/capability provenance without pretending provider-backed extraction happened.
- Clear replacement/reduce/retain mapping for local logic where semantica surfaces are proven, partial, or blocked.

Acceptance:

- `--semantica-pilot` remains evidence-only and truth-safe.
- Missing or partial semantica surfaces are reported as partial/blocked, not silently rebuilt under a different name.

## Phase 5: LLM Semantic Extraction Sandbox

Deliverables:

- Explicit LLM extraction mode, separate from deterministic and non-LLM semantica pilot modes.
- OpenAI provider dependency/gate for semantica LLM mode.
- Evidence-only adapter that converts LLM/semantica output into RAWR evidence candidates only after exact source re-anchoring and schema validation.
- Deterministic fallback/oracle output remains available and is never mislabeled as LLM output.

Acceptance:

- If provider dependencies or credentials are missing, the command reports a blocked LLM path and still produces deterministic output when requested.
- If LLM extraction runs, every accepted evidence item has source path, heading/context, line span, char span, extraction method, confidence, review state, and `promotion_allowed: false`.

## Phase 6: Dual-Run Evaluation And Adoption

Deliverables:

- Deterministic-vs-LLM comparison artifact for at least fixture docs and one full architecture-style document.
- Reviewer-facing summary of what LLM found, what deterministic rules agreed with, what remains unclear, and what requires human review.

Acceptance:

- A developer can run one architecture proposal through the pipeline and get source-backed compatible, extension, conflict, unclear, candidate, and repair-action findings.
- The system explains why findings exist and what review action is expected.
- RAWR truth still changes only through human-governed promotion.

## Standard Verification Gate

Run the relevant subset after each phase and the full gate before handoff:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:semantic:capability
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:doc:frame -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
git diff --check
git check-ignore .semantica/current .semantica/runs
gt status
```
