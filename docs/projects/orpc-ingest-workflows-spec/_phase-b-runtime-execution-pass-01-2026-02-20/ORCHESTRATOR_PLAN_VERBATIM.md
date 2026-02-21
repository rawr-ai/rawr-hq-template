# Phase B Runtime Execution Runbook v2 (Hard-Deletion Aligned, Forward-Only)

## Summary
1. In-memory plan is now set to this runbook as the execution source of truth.
2. This runbook updates the prior version to match the current packet: hard deletion of legacy metadata, Channel A/B as command surfaces only, manifest-wide conformance checks, and instance-local lifecycle authority assertions.
3. Execution starts only when you say `implement`; at that moment I write this runbook and orchestrator scratchpad immediately, then run team prep before any implementation slice.

## Execution Base
1. Parent branch: `codex/orpc-inngest-autonomy-assessment`.
2. Implementation branch: `codex/phase-a-runtime-implementation`.
3. Implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation`.
4. Branch/worktree creation command:
   `git -C /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template worktree add -b codex/phase-a-runtime-implementation /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation codex/orpc-inngest-autonomy-assessment`
5. Graphite safety rule: `gt sync --no-restack` only; no global restack.
6. End-state rule: clean git state in all involved worktrees.

## Team Preparation Gate (Runs Immediately After Runbook Write-Down)
1. Write orchestrator files first:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/ORCHESTRATOR_PLAN_VERBATIM.md`
   and
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20/ORCHESTRATOR_SCRATCHPAD.md`.
2. Perform agent sweep before slice work:
   inspect each currently-known active agent assignment from orchestrator registry/context, classify as `aligned` or `stale`, and decide `keep+compact` or `close`.
3. Freshness policy:
   default to fresh agents for execution-critical roles; only reuse an agent if assignment is directly aligned and a `/compact` reset is sent first.
4. Agent type policy:
   use `default` agents only for this run.
5. Capacity policy:
   max six active agents; target three to four concurrent.
6. No implementation begins until team prep is complete and logged in orchestrator scratchpad.

## Team Topology
| Agent | Primary Scope | Slices | Required Grounding |
| --- | --- | --- | --- |
| Agent 1 | Metadata/discovery/lifecycle contract implementation | A1, A2, A6 | `typescript`, `domain-design`, `system-design`, `rawr-hq-orientation`, plus workflow introspection of `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` and `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md` (or `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md` if that is the available variant) |
| Agent 2 | Host/runtime route/context implementation | A3, A4 | `typescript`, `orpc`, `inngest`, `system-design`, `api-design` |
| Agent 3 | Gate/harness/static-guard implementation | A0, A5 | `typescript`, `orpc`, `inngest`, `system-design`, `api-design` |
| Agent 4 | Independent review + fix-closure coordinator | A7 | `typescript`, `orpc`, `solution-design`, `system-design`, `api-design`, plus workflow introspection of `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` and `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md` |
| Agent 5 | Canonical docs + cleanup | A8 | `information-design`, `docs-architecture`, `solution-design` |
| Agent 6 | Post-land realignment for Phase B+ | A9 | `solution-design`, `system-design`, `domain-design`, `team-design`, `information-design` |

## Mandatory Agent Protocol
1. Each agent writes plan immediately to `AGENT_<N>_PLAN_VERBATIM.md`.
2. Each agent maintains timestamped notes in `AGENT_<N>_SCRATCHPAD.md`.
3. Each agent reads required corpus before conclusions:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md`,
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`,
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`,
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md`,
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md`.
4. Final agent outputs include `Skills Introspected`, `Evidence Map` (absolute path + line anchors), `Assumptions`, `Risks`, `Unresolved Questions`.
5. If an agent is repurposed after a large task/topic shift, send `/compact` before reassignment.
6. Any blocking/high review finding must be fixed in-run, re-tested, and re-reviewed.

## Artifact Root and Required Outputs
1. Pass root:
   `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-a-runtime-execution-pass-01-2026-02-20`
2. Orchestrator outputs:
   `ORCHESTRATOR_PLAN_VERBATIM.md`,
   `ORCHESTRATOR_SCRATCHPAD.md`,
   `PHASE_A_EXECUTION_REPORT.md`,
   `A7_REVIEW_DISPOSITION.md`,
   `A8_CLEANUP_MANIFEST.md`,
   `A9_PHASE_B_READINESS.md`,
   `FINAL_PHASE_A_HANDOFF.md`.
3. Agent outputs:
   `AGENT_<N>_PLAN_VERBATIM.md`,
   `AGENT_<N>_SCRATCHPAD.md`,
   `AGENT_<N>_FINAL_<OBJECTIVE>.md`.

## Ordered Execution Plan

### Stage 0: Preflight, Runbook Write-Down, Team Prep
1. Verify clean status and branch context in repo root and execution worktree.
2. Create child branch/worktree.
3. Write orchestrator plan/scratch files immediately from this runbook.
4. Run agent sweep and freshness decisions before starting any slice.
5. Close stale/unrelated agents; `/compact` and reuse only if directly aligned.
6. Record team prep decisions in orchestrator scratchpad.

### Stage 1: Core Implementation (`A0..A6`)
1. `A0` by Agent 3:
   wire required gates and deterministic static guard scaffold.
2. After `A0` is green, parallelize:
   Agent 1 executes `A1` metadata contract hardening.
   Agent 2 executes `A3` host context + ingress hardening.
3. After `A1` is green, Agent 1 executes `A2` discovery surface expansion.
4. After `A2` and `A3` are green, Agent 2 executes `A4` manifest-driven `/api/workflows/<capability>/*`.
5. After `A3` and `A4` are green, Agent 3 executes `A5` harness matrix + route negatives.
6. After `A1` and `A5` are green, Agent 1 executes `A6` seam assertions + hard-delete closure:
   remove remaining legacy key handling,
   enforce instance-local canonical-root default,
   add no-singleton assertions.
7. After every slice, run impacted gates/tests and log outcomes in orchestrator scratchpad.

### Stage 2: Mandatory Full Review + Fix Closure (`A7`)
1. Agent 4 runs independent review from TypeScript and ORPC perspectives.
2. Agent 4 must read original packet + execution docs before review.
3. Findings are severity-ranked and line-anchored.
4. Route findings to owning implementation agents for fixes.
5. Re-run impacted tests/gates after fixes.
6. Agent 4 performs quick re-review on fix set.
7. Exit condition:
   no unresolved blocking/high findings,
   any accepted medium findings explicitly dispositioned with owner and follow-up.

### Stage 3: Mandatory Structural Assessment + Fix Closure (`B4A`)
1. Independent structural assessment reviews landed code for TypeScript design, domain mapping, naming, and file/module boundaries.
2. This pass is taste/judgment-driven and may improve organization, but may not change fundamental architecture or violate locked decisions.
3. Findings are severity-ranked and line-anchored with concrete fix guidance.
4. Blocking/high findings are fixed in-run, re-tested, and re-reviewed.
5. Exit condition: no unresolved blocking/high structural issues.

### Stage 4: Mandatory Docs + Cleanup (`A8`)
1. Agent 5 updates canonical docs and runbooks to match landed behavior.
2. Cleanup pass-local scratch/review artifacts that are fully superseded:
   archive if needed for lineage,
   delete if redundant.
3. Publish `A8_CLEANUP_MANIFEST.md` with per-path action and rationale.

### Stage 5: Post-Land Realignment (`A9`)
1. Agent 6 reconciles remaining packet docs for Phase B+ readiness.
2. Tighten only where Phase A outcomes changed assumptions.
3. Produce explicit Phase B kickoff posture in `A9_PHASE_B_READINESS.md`:
   `ready` or `not-ready`,
   blockers,
   owners,
   order.

### Stage 6: Integration, Commit Hygiene, Handoff
1. Integrate all outputs into `PHASE_A_EXECUTION_REPORT.md` and `FINAL_PHASE_A_HANDOFF.md`.
2. Ensure branch/worktree are clean and committed.
3. Do not submit/merge unless explicitly requested.

## Important Changes or Additions to Public APIs/Interfaces/Types
1. Runtime identity contract:
   runtime semantics keyed by `rawr.kind` + `rawr.capability` + manifest registration.
2. Legacy metadata policy:
   `templateRole`, `channel`, `publishTier`, `published` are hard-deleted from non-archival runtime/tooling/scaffold metadata surfaces and active manifest contract paths.
3. Lifecycle/distribution semantics:
   Channel A (`rawr plugins ...`) and Channel B (`rawr plugins web ...`) remain command surfaces only, not runtime metadata semantics.
4. Manifest authority:
   `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts` is canonical runtime composition authority.
5. Route-family contract:
   `/rpc` internal first-party,
   `/api/orpc/*` published OpenAPI boundary,
   `/api/workflows/<capability>/*` caller-facing workflow boundary,
   `/api/inngest` runtime ingress only.
6. Context seam:
   request-scoped boundary context separated from durable runtime context responsibilities.
7. Gate contract additions:
   deterministic hard-delete static guard includes active manifests (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/*/*/package.json`),
   review and cleanup closure gates enforced.

## Test Cases and Scenarios
1. Metadata hard-deletion scenario:
   no runtime/tooling/scaffold branch on legacy keys,
   no active manifest declares forbidden keys,
   missing required `rawr.capability` fails.
2. Lifecycle semantics scenario:
   lifecycle decisions derive from `rawr.kind` + `rawr.capability` + discovery root + manifest-owned exports,
   not `templateRole`/`channel`.
3. Discovery expansion scenario:
   `plugins/api/*` and `plugins/workflows/*` are discovered without regression to existing roots.
4. Context/ingress scenario:
   request-scoped context enforced,
   unsigned `/api/inngest` rejected.
5. Route semantics scenario:
   policy and caller restrictions hold across all four route families.
6. Harness/gate scenario:
   required suite IDs and route negatives are hard-fail.
7. Instance isolation scenario:
   canonical-root resolution proves instance-local lifecycle authority,
   no implicit singleton-global behavior.
8. Review closure scenario:
   TypeScript + ORPC review catches issues,
   blocking/high findings fixed and revalidated.
9. Docs/cleanup scenario:
   canonical docs/runbooks updated,
   superseded pass-local artifacts archived/deleted with manifest.
10. Realignment scenario:
   packet is reconciled for explicit Phase B kickoff readiness.

## Acceptance Criteria
1. Slices `A0..A8` complete in dependency order with required gates green.
2. Hard-deletion conformance is complete:
   forbidden keys absent from non-archival runtime/tooling/scaffold metadata surfaces and active manifests.
3. Channel A/B runtime-semantics leakage is eliminated.
4. Instance-local canonical-root lifecycle isolation assertions pass.
5. `A7` review closure complete with verified fixes.
6. `A8` docs and cleanup manifest complete.
7. `A9` readiness output complete with explicit Phase B posture.
8. All deliverables committed on `codex/phase-a-runtime-implementation` with clean worktree state.

## Assumptions and Defaults
1. Execution starts only after your explicit `implement`.
2. This run is implementation + validation + docs/cleanup + realignment; no submit/merge in this run.
3. Forward-only convergence is mandatory; no rollback playbooks.
4. Internal producer/consumer context permits direct convergence with only short-lived compatibility where explicitly allowed by packet.
5. If any named workflow doc variant is missing (`dev-spec-2-milestone` vs `dev-spec-to-milestone`), agents use the available equivalent and log that mapping.
