# Semantic Evidence Doc Sweep Orchestrator Workflow

## Objective

Deliver a repo-wide semantic evidence sweep that is useful for document update and quarantine review without turning generated evidence into architecture truth.

## Team Shape

Codex is DRI for integration, final judgment, branch hygiene, and commit quality.

Short-lived review agents are used only where they reduce risk:

- Sweep engineer: traversal, command wiring, artifact isolation, aggregate outputs.
- Evidence correctness reviewer: semantic verdict sanity, no raw phrase verdicts, no source-authority auto-quarantine.
- Recommendation-policy reviewer: conservative category decisions and reason codes.
- Report/usefulness reviewer: report readability and doc-editor actionability.
- Scope-boundary reviewer: exclusion behavior, generated-path safety, and no doc mutation.
- Verifier: command gates, fixture tests, aggregation math, query checks, and clean worktree.

## Context Contract

Every reviewer gets the same frame:

- Reviewed ontology YAML is authoritative.
- Evidence claims and sweep findings are generated review aids.
- Sweep recommendations are advisory.
- No document is edited, moved, or quarantined.
- Quarantine/archive paths are excluded by default.
- Source-authority documents are regression inputs, not automatic quarantine candidates.
- Ambiguity should become review work, not fake certainty.

## Handoffs

Sweep engineer hands aggregate artifacts and per-document run layout to recommendation-policy review.

Recommendation-policy review hands category/reason-code concerns to report/usefulness review.

Report/usefulness review hands clarity issues and missing next-action signals to Codex.

Verifier consumes the final implementation and reports only command results, failing checks, and repository state.

Codex resolves review notes, runs the full gate, commits through Graphite, and closes all agents before handoff.

## Review Axes

- Correctness: no raw-text-only conflicts, source spans preserved, source authority protected.
- Usefulness: reports answer what to inspect next.
- Scope: advisory output only; no source doc mutation.
- Maintainability: discovery, compare execution, recommendation policy, reporting, and query rendering stay separated.
- Implementation risk: no broad extractor rewrite.
- Agent usability: JSON, Markdown, named queries, CSV, and TTL expose the same review queue.

## Failure Policy

If a reviewer finds a high-risk false conflict, source-authority quarantine recommendation, stale artifact read, or aggregate/per-document count mismatch, the branch is not ready. Fix the implementation or downgrade the recommendation to review-needed before commit.
