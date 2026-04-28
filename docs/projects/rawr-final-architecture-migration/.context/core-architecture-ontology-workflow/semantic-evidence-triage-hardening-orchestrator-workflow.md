# Semantic Evidence Triage Hardening Orchestrator Workflow

## Objective

Turn the semantic evidence comparison proof run into an actionable review surface by reducing non-claim noise, explaining remaining ambiguity, and adding only subordinate verification-policy ontology coverage.

## Team Shape

Codex is the DRI for final integration, branch hygiene, verification, and commit quality.

Use short-lived agents only for bounded review:

- Workbench engineer: reviews extraction, filtering, summaries, reports, queries, and viewer integration.
- Ontology reviewer: checks that verification-policy additions remain subordinate and do not leak into canonical core architecture.
- Verification owner: reviews fixture coverage, adversarial cases, and final command gates.

## Shared Frame

- Semantica is substrate, not RAWR truth owner.
- Reviewed ontology YAML governs the source-of-truth graph.
- Evidence claims, candidates, suppressed lines, and review findings are not canonical architecture.
- The testing plan is supporting verification policy; it cannot override the architecture or runtime specs.
- Do not edit the testing plan.
- Do not start migration planning in this pass.
- Do not replace the parser with a broad LLM/Semantica rewrite.

## Coordination

- Agents may inspect files and report findings, but Codex owns all edits.
- Each agent must return concise findings and acceptance criteria.
- Codex integrates only changes that improve actionable semantic review without manufacturing certainty.
- All agents must be closed before final handoff.

## Review Gates

- Empty-match and scaffold filtering must be tested.
- All remaining ambiguous findings must have a bucket and review action.
- Verification-policy entities must remain out of canonical core views.
- Named semantic queries must report their source artifact and document.
- The final testing-plan compare must remain conflict-free unless a real contradiction is discovered.
