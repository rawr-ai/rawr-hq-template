# Semantic Evidence Triage Hardening Plan

## Summary

Implement the next stacked branch above `codex/semantic-evidence-comparison` to make the document comparison output useful for migration planning and doc-update review. The goal is not “zero ambiguity”; it is **actionable ambiguity**: suppress non-claims, bucket unresolved findings, add minimal subordinate verification-policy ontology coverage, and make reports/queries explain exactly what needs human review.

First implementation actions after approval:

- Create `codex/semantic-evidence-triage-hardening` above `codex/semantic-evidence-comparison`.
- Write this plan to `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-triage-hardening-plan.md`.
- Write a short team/orchestrator workflow beside it.
- Keep generated outputs under ignored `.semantica/`; do not push or open a PR unless explicitly asked.

## Key Changes

- Harden evidence extraction:
  - Add explicit match helpers so empty match buckets are treated as empty.
  - Suppress Markdown scaffolding, code fences, path-only lines, table separators, and labels like `Where:`, `Primary tests:`, `Must prove:`, `Must not prove:`, and `You MUST:`.
  - Record suppressed lines in an ignored run artifact so filtering is auditable.
  - Stop letting heading text alone turn every line into `target-architecture`; use headings as context only after the line itself has claim signal.

- Make ambiguity inspectable:
  - Add `claim_kind`, `resolution_state`, `ambiguity_bucket`, `review_action`, and `heading_path` to evidence/findings.
  - Add summary fields: `claim_retention`, `findings_by_rule`, `ambiguous_by_bucket`, and suppressed-line counts.
  - Add report sections for ambiguity buckets, suppressed scaffold lines, verification-policy gaps, and review queue.

- Add a minimal subordinate `verification-policy` overlay:
  - Model testing-plan concepts only as supporting verification policy, not canonical architecture truth.
  - Cover proof bands, graph law, ratchets, runner boundaries, caller planes, route-family negative assertions, merge-gating posture, nightly/manual posture, and proof ownership.
  - Reuse existing predicates where possible; only extend the ontology contract where necessary to validate this overlay cleanly.
  - Add `authority.doc.canonical-testing-plan` as subordinate/supporting authority, not a source that can override architecture/runtime specs.

- Improve query/viewer surfaces:
  - Add named queries: `ambiguity-summary`, `entityless-findings`, `verification-policy-gaps`, and `decision-review-queue`.
  - Ensure semantic named queries report their backing artifact and document path.
  - Ensure semantic queries do not accidentally read stale lexical `document-diff.json`.
  - Update the viewer only enough to show semantic evidence bucket counts and entityless findings.

## Team Execution

- Codex remains DRI and owns final integration.
- Use short-lived agents only where useful:
  - Workbench engineer: extraction/filtering/report implementation.
  - Ontology reviewer: verification-policy overlay and no-canonical-promotion checks.
  - Verification owner: fixture/adversarial tests and command gate.
- All agents get the same frame: Semantica is substrate, reviewed ontology governs truth, evidence is not canonical, no raw phrase verdicts, no testing-plan rewrite, no migration planning yet.
- Close all agents before final handoff.

## Test Plan

Run and require success:

```bash
bunx nx show projects >/dev/null
bun run semantica:setup
bun run semantica:check
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:diff -- --mode semantic --fixture
bun run semantica:doc:diff -- --mode semantic --document docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md
bun run semantica:core:query -- --named ambiguity-summary --format text
bun run semantica:core:query -- --named decision-review-queue --format text
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/semantic-findings.rq --format text
git diff --check
git status --short --untracked-files=all
```

Add/extend tests for:

- Empty match buckets no longer create claims.
- Code fences, scaffold labels, table separators, and path-only lines are suppressed or marked non-decision-grade.
- Negated/prohibitive forbidden-pattern text remains aligned.
- Positive target assertion of a prohibited construction remains conflict.
- Historical/example/deprecated mentions are not decision-grade conflicts.
- Remaining ambiguous findings always have a bucket and review action.
- Verification-policy concepts resolve as subordinate policy, not canonical architecture.
- Query counts match `semantic-compare.json`.

## Acceptance Criteria

- Testing-plan semantic compare still reports `0` conflicts and `0` deprecated uses unless a real contradiction is discovered.
- Scaffold/code-fence/table noise no longer inflates ambiguous findings.
- `unclassified ambiguous == 0`; every remaining ambiguous finding has a reason bucket and review action.
- The report answers what a doc editor should review next, not just counts.
- No evidence, candidate, or verification-policy item is promoted into canonical core architecture.
- Existing semantic fixture guardrails still pass.
- Worktree is clean after Graphite commit.

## Assumptions

- YAML remains the reviewed authoring surface, but all decision behavior comes from compiled typed graph/evidence artifacts.
- This pass does not replace the parser with a broad LLM/Semantica extraction rewrite.
- This pass does not edit the testing plan or perform migration planning.
- Skills used: `team-design`.
