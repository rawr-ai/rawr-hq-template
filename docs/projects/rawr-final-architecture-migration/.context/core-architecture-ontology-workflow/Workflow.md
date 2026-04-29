# semantica-First Pipeline Implementation Workflow

Status: active orchestration workflow
Date: 2026-04-27
Branch: `codex/semantica-first-pipeline-implementation`

## Objective

Manage the semantica-first migration as a controlled, phase-by-phase workflow. The product/workbench plan lives in `semantica-first-pipeline-rethink-draft.md`; the legacy filename is retained for continuity, but that file is now the active implementation plan.

The workflow goal is not to declare the workbench semantica-native early. It is to prove pinned semantica capabilities, move substrate responsibilities over only when proven, and keep RAWR authority, review semantics, source spans, and promotion gates explicit.

## Current Modernization Extension

The active workbench modernization baseline is `semantica-workbench-modernization-baseline.md`. Read it before Python cleanup work. It freezes the current command surface, generated artifact names, fixture/schema inputs, verification gates, high-risk modules, and RAWR authority boundaries that later tooling, test, typing, and module-decomposition phases must preserve.

This modernization track is a contract-preserving cleanup of `tools/semantica-workbench`, not a replacement for the semantica-first pipeline or a change to RAWR architecture truth. It should be used alongside the existing semantica-first workflow when implementation work touches Python code quality, tests, types, module boundaries, rendering, or Semantica/LLM integration boundaries.

## Active Branch And Current Phase

- Base branch: `codex/semantica-underutilization-review`.
- Active implementation branch: `codex/semantica-first-pipeline-implementation`.
- Phase 0 status: complete when this workflow and the implementation plan are committed cleanly.
- Phase 1 status: active first slice; capability proof may be expanded, but it must not be described as completed migration.

## Operating Contract

Each phase is a closed loop:

1. Ground repo state, Graphite stack, current artifacts, and relevant docs.
2. Start a fresh phase team with explicit scope, skill guidance, scratch doc, and report contract.
3. Implement only that phase's bounded slice.
4. Run verification from unit-level through behavioral checks as appropriate.
5. Run review stewards across code quality, information design, semantica usage, target-authority alignment, testing, and developer capability.
6. Integrate material findings, document residual uncertainty, close agents, and commit cleanly through Graphite.

Explorer agents retrieve facts only. Default/peer agents provide judgment and review. Every agent must keep temporary scratch notes and delete them before final unless explicitly asked to promote the scratch into a tracked report.

## Shared Frame For Every Agent

- semantica is the intended substrate where pinned package capabilities are proven.
- RAWR owns truth, authority policy, reviewed ontology promotion, review states, exact source spans, and developer-facing review actions.
- semantica output is evidence until reviewed and promoted.
- The locked ontology should remain small and governance-oriented; evidence and candidate discovery may be larger but cannot become target architecture by accident.
- Missing semantica extras are feature blockers, not permission to rebuild that feature locally.
- Heuristics are fallback, adapter, and regression oracle; they should not become a permanent shadow semantic platform.
- The current workbench still uses local regex classification and Python verdict rules. This is acceptable during early phases only if the plan remains capability-proof driven.

## Team Roles

Phase teams are re-created per phase. Do not carry stale agents across phase boundaries.

- Orchestrator: owns final decisions, repo hygiene, integration, verification, and commit quality.
- Capability explorer: retrieves semantica package facts, optional dependency reality, and local workbench surfaces.
- Workbench engineer: implements the bounded code/doc changes for the current phase.
- Testing steward: designs falsification-first tests and verifies risk coverage.
- Information-design steward: reviews docs, reports, headings, and reader workflow.
- semantica-usage steward: checks whether semantica is materially used where proven instead of only imported.
- Target-authority steward: checks that evidence does not become RAWR truth and target/candidate/current-state concerns stay separated.
- Developer-capability steward: checks that the work improves the developer's ability to compare docs, inspect provenance, and act on findings.

Review stewards must introspect or read relevant skill guidance before review: `team-design`, `testing-design`, `information-design`, `architecture`, `target-authority-migration`, and local semantica/workbench docs.

## Phase Loop

For each phase:

1. Read the phase's `Purpose`, `Inputs`, `Changes`, `Outputs`, `Commands`, `Acceptance`, and `Deferrals` in the implementation plan.
2. Confirm source authority and generated-artifact boundaries before edits.
3. Spawn a fresh phase team only for the current phase.
4. Implement the smallest coherent slice that satisfies the phase acceptance criteria.
5. Run the declared commands plus any narrower unit tests needed for the changed files.
6. Ask stewards to review current diff and generated evidence.
7. Fix material findings; record unresolved uncertainty in the handoff.
8. Close agents.
9. Stage and commit the phase through Graphite.

## Handoff Contract

Every phase closeout must record:

- Phase and branch.
- Files changed.
- Commands run and results.
- Generated artifacts inspected but not tracked.
- semantica capabilities proven, blocked, or only partially available.
- Fallbacks retained, with scope and removal trigger.
- Residual uncertainty.
- Review steward findings and dispositions.
- Graphite/worktree status.

Do not hand off a phase by saying only that tests passed. The handoff must preserve what is now proven versus what remains an assumption.

## Review Gates

Minimum acceptance across the whole migration:

- No decision-grade finding may come from raw phrase hits alone.
- Every decision-grade finding must have source span, claim, resolved target, authority context, rule or explanation, confidence, and review action.
- Missing semantica extras must be visible as blocked or partial feature gates, never silent fallback success.
- Evidence, candidates, review findings, generated graphs, and locked RAWR truth must stay visibly separate in schema, reports, queries, and viewers.
- Negated/prohibited false positives must stay fixed.
- Ambiguity remains ambiguity; it is not forced into conflict.
- Active docs must not route future agents through archived, quarantined, or historical proof-run docs as current guidance.
- Each phase must end with commands run, artifacts produced, residual uncertainty, and Graphite hygiene.

## Branch And Cleanup Rules

- Use Graphite for branch and commit operations in this repo.
- Keep the active branch stacked above `codex/semantica-underutilization-review` unless the user explicitly redirects.
- Do not push or create a PR unless explicitly requested.
- Do not modify finalized architecture/runtime source specs unless a later approved plan says to.
- Keep `.semantica/` generated state ignored.
- Remove temporary agent scratch files before final.
- Do not leave the worktree dirty after a completed phase.

## Final Closeout

Before final handoff for any phase:

- Run the relevant unit tests.
- Run the relevant workbench smoke commands.
- Run `git diff --check`.
- Confirm generated state is ignored.
- Confirm `gt status`.
- Close all phase agents.
- Commit cleanly through Graphite.
