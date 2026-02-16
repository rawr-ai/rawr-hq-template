# Session 019c587a Architecture Reconstruction Plan

## Summary
Build one decision-complete scratch document that reconstructs the conversation path, clarifies the latest architecture proposal, compares it to today’s codebase, and gives a hard-nosed recommendation (including removals, missing pieces, legacy cleanup, simplifications, and explicit trade-offs).

## Dedicated Scratch Document
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`

## Execution Plan
1. Lock source-of-truth inputs before analysis.
Use transcript source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`.
Use final-proposal source set from proposal worktree:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`.
Use “today codebase” source set from primary worktree:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/index.ts`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/plugins.ts`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md`,
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md`.
Add explicit divergence note for duplicate `AXIS_03` copy in primary:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md` vs proposal worktree version.

2. Build the lineage of your questions (architectural tension map).
Extract user prompts, dedupe exact repeats, and group into categories:
- Composition authority and placement (`rawr.hq.ts` vs package/app composition).
- Plugin topology (surface-split vs capability-flat sparse model).
- Boundary integrity and enforceability.
- Contract/schema/implementation semantics (oRPC, TypeBox, HTTP metadata).
- Example quality and concreteness demands.
- Spec-packet execution, governance, and simplification pressure.
For each category, capture:
- What you asked.
- Why it mattered architecturally.
- What core tension it exposed.

3. Build the assistant/agent response evolution map.
Create a phase timeline from early interpretation to latest proposal, with pivot points:
- What was proposed.
- What changed from prior step.
- What user feedback forced the change.
- Which artifacts were created/rewritten.
Focus on latest state, but include only enough prior context to explain why latest state looks the way it does.

4. Clarify exactly what the latest proposal is saying.
Produce a “plain-English architecture decode” section with:
- The intended model.
- Hard rules.
- Optional/deferred items.
- What is explicitly out of scope.
- What might still be ambiguous.
This section should remove confusion without re-arguing the whole thread.

5. Produce practical landed-vs-today diff.
Create a matrix with columns: `Area`, `Landed Proposal`, `Today`, `Gap`, `Action Type`.
Use action types:
- `Add`
- `Change`
- `Remove`
- `Reshuffle`
Cover at least:
- Composition authority (`rawr.hq.ts` and host-fixture role).
- Plugin roots and runtime surfaces.
- Contract placement and runtime adapter boundaries.
- Metadata semantics (`rawr.kind`, `rawr.capability`, legacy fields).
- Lifecycle/tooling/runbook expectations.
- CI/testing/enforcement expectations.

6. Add the “do not assume current architecture is right” critical pass.
Create four explicit sections:
- `What We Don’t Need`
- `What We Need But Are Missing`
- `Legacy/Confusing Paths To Remove`
- `Simplifications That Preserve Robustness/Flexibility/Power`
For each item, include a concrete impact statement (what gets easier/harder, and for whom).

7. Estimate work in complexity/churn/scope (not time).
Use a normalized rubric per gap item:
- Complexity: `Low | Medium | High | Very High`
- Churn: `Small | Medium | Large | Very Large`
- Scope: `Localized | Cross-cutting | Structural`
Also include dependency ordering (what must happen first).

8. Provide standalone “is this the right direction?” assessment.
Answer explicitly `Yes`, `No`, or `Yes, with changes`.
Then provide a trade-off table:
- `Decision`
- `Gain`
- `Give Up`
- `Concrete Example`
This section is separate from the diff and stands on its own.

9. Quality gates before finalizing scratch doc.
- Every major claim must trace to transcript evidence or code/doc evidence.
- No unresolved ambiguity gets hidden; unknowns are labeled.
- Duplicate transcript turns do not inflate perceived signal.
- Final recommendation includes explicit acceptance/rejection criteria.

## Important Interfaces/Types To Explicitly Analyze
- Proposed `RawrHqManifest` contract from spec-packet docs.
- Proposed plugin registration shapes for API/workflow/web/CLI/agent/MCP surfaces.
- Proposed metadata contract shift toward `rawr.kind` + `rawr.capability`.
- Proposed removal/deprecation of runtime-driving semantics for `templateRole`, `channel`, `publishTier`/`published`.

## Validation Scenarios
1. If a reader only sees the scratch doc, they can explain how the conversation evolved and why.
2. If a reader asks “what are we doing now exactly?”, the latest architecture decode answers it without opening other docs.
3. If a reader asks “what changes in code right now?”, the diff matrix gives actionable add/change/remove/reshuffle items.
4. If a reader challenges direction, the standalone trade-off section answers with concrete give/get examples.

## Assumptions and Defaults
- Canonical “latest proposal” is the proposal-worktree document set under `rawr-hq-template-wt-flat-runtime-proposal`.
- “Codebase today” means primary worktree `rawr-hq-template` on `main`.
- Repeated user turns in transcript are treated as duplicates unless content differs.
- The primary-worktree `AXIS_03` copy is treated as a divergence artifact, not canonical endpoint.
