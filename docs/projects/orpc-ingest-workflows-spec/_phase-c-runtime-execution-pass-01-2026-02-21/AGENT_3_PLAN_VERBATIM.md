# AGENT 3 Plan Verbatim (C3)

## Scope
- Slice: Phase C / C3 distribution-lifecycle mechanics (D-016 deferred).
- Branch: `codex/phase-c-c3-distribution-lifecycle-mechanics`.
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`.
- Constraint: no runtime semantic changes; only alias/instance-aware global CLI UX seams.

## Execution Plan
1. Verify repository/worktree state and confirm branch/workflow expectations (Graphite-aware).
2. Ingest and annotate the required grounding corpus, extracting explicit C3 acceptance criteria and command-surface invariants.
3. Inspect current implementations and tests for:
   - `scripts/dev/install-global-rawr.sh`
   - `scripts/dev/activate-global-rawr.sh`
   - `apps/cli/src/commands/doctor/global.ts`
   - `apps/cli/test/doctor-global.test.ts`
4. Design minimal, explicit seam behavior updates for alias/instance awareness without introducing singleton-global assumptions.
5. Implement shell + CLI changes with strict Channel A/Channel B command-surface separation preserved in copy/help text.
6. Add or adjust C3-focused tests/gates and run relevant quick checks first, then broader/full checks as needed for confidence.
7. Produce evidence map (absolute paths + line anchors), assumptions, risks, unresolved questions.
8. Write final implementation report to `AGENT_3_FINAL_C3_IMPLEMENTATION.md`.
9. Leave repository in clean state consistent with repo workflow.

## Non-goals
- No runtime behavior/functionality changes beyond UX seam surfacing.
- No Channel A/Channel B surface mixing.
- No introduction of singleton-global lifecycle assumptions.
