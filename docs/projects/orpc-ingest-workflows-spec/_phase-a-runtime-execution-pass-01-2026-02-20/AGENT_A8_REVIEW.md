# A8 Review: Docs Alignment + Cleanup Safety

## Findings (Severity-Ranked)

### [Medium] Policy-role boundary drift in canonical docs (normative vs as-landed status mixed)
- `DECISIONS.md` declares decision-register scope, but now contains an implementation status block (`Implementation alignment snapshot`) that is temporal and not a decision record.
- `ARCHITECTURE.md` declares target-state policy authority independent of implementation sequencing, but now includes explicit runtime-state notes.
- This increases staleness risk and makes it harder to distinguish canonical policy from branch-specific implementation state.

Evidence:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md:8`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md:9`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:4`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:41`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:230`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:233`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:4`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:9`

Recommendation:
- Move implementation-state snapshots to Phase execution artifacts (`PHASE_A_EXECUTION_PACKET.md` and/or pass-local reports) and keep `DECISIONS.md` + `ARCHITECTURE.md` strictly normative.

### [Medium] Stale absolute-path references remain in Phase A packet/spec despite as-landed refresh
- As-landed sections were added, but command/path references still point to legacy absolute locations (`.../rawr-hq-template`, old spec worktree paths), while landed scripts use repo-relative paths.
- This can mislead operators running checks from the active worktree/branch and weakens snapshot usefulness.

Evidence:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md:255`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md:264`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md:99`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md:100`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/package.json:39`

Recommendation:
- Normalize packet/spec examples to repo-relative commands where possible; reserve absolute paths only when path identity is the policy.

### [Low] Cleanup lineage wording overstates “required orchestrator outputs” preservation status
- Cleanup manifest states preservation of required orchestrator outputs, but orchestrator-required output list includes items not present yet in the pass root (e.g., `PHASE_A_EXECUTION_REPORT.md`, `FINAL_PHASE_A_HANDOFF.md`).
- This is mostly wording/traceability clarity; it can confuse audit readers.

Evidence:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/A8_CLEANUP_MANIFEST.md:8`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/A8_CLEANUP_MANIFEST.md:45`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/ORCHESTRATOR_PLAN_VERBATIM.md:58`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/ORCHESTRATOR_PLAN_VERBATIM.md:65`

Recommendation:
- Reword as: “retained currently-existing required/core lineage artifacts; remaining required outputs are produced in later stages.”

## Checks Completed
- Accuracy vs landed implementation/gates:
  - Verified in code:
    - `/rpc` default deny for unlabeled caller surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:92`
    - `/api/inngest` signature enforcement pre-dispatch: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:231`
    - workspace/install adapter consolidation claims: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts:1`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts:1`
  - Executed and passed: `bun run phase-a:gates:exit` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation`.
- Cleanup safety:
  - All artifacts listed as deleted in `A8_CLEANUP_MANIFEST.md` are absent.
  - All artifacts listed as retained/core in `A8_CLEANUP_MANIFEST.md` are present.
- Information design clarity:
  - Entrypoint and as-landed discoverability improved (`README` routing and explicit snapshot sections).
  - Remaining clarity risk is mainly normative-vs-temporal content mixing noted above.

## Disposition
`approve_with_changes`

Rationale:
- No blocking factual errors in core as-landed runtime/gate claims and cleanup deletions are safe.
- Medium issues should be corrected to preserve long-term documentation architecture integrity and operator clarity.

Skills used: `information-design`, `docs-architecture`.
