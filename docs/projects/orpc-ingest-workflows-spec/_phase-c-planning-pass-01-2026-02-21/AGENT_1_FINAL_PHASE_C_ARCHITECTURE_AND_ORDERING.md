# AGENT 1 Final: Phase C Architecture and Slice Ordering (C0-C7)

## Decision Summary
Phase C should execute as a forward-only dependency chain with one conditional branch:

`C0 -> C1 -> C2 -> C3 -> (C4 if triggered) -> C5 -> C6 -> C7`

Where:
- `C4` is conditional only, with explicit trigger gates.
- `C5` is mandatory review/fix closure before docs cleanup.
- `C6` and `C7` are mandatory closure loops and are not optional post-work.

This ordering preserves locked contracts: route-family split, manifest-first authority, D-013 hard deletion, and D-016 seam-now posture.

## Hard Guardrails (Non-Negotiable During C0-C7)
1. Route families remain semantically unchanged: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
2. `rawr.hq.ts` remains canonical composition authority.
3. Legacy metadata keys (`templateRole`, `channel`, `publishTier`, `published`) stay hard-deleted from active runtime/tooling/scaffold metadata surfaces.
4. D-016 seam-now stance remains: alias/instance seam required now; no new singleton-global assumptions.
5. Package-owned shared seams + host-owned concrete wiring remains intact.

## Slice Dependency Model (Implementer-Ready)
| Slice | Dependency | Primary owner | Must-do-now scope | Explicit defer boundary |
| --- | --- | --- | --- | --- |
| `C0` planning packet + gate contract | Phase B readiness `ready` | `@rawr-phase-sequencing` | Lock packet, owners, dependencies, touched paths, acceptance gates, failure signals. | No runtime edits before packet closure. |
| `C1` cross-instance storage-lock redesign | `C0` | `@rawr-runtime-host` | Deterministic collision-safe state writes; preserve instance-local authority and explicit global fallback semantics. | Do not alter route-family or caller semantics. |
| `C2` telemetry/diagnostics structural expansion | `C1` | `@rawr-verification-gates` | Convert telemetry from optional scaffold to required structural contract and hard-fail gate posture. | Defer non-essential analytics breadth not required for lifecycle contract safety. |
| `C3` D-016 mechanics tranche (seam-safe) | `C2` | `@rawr-distribution-lifecycle` | Implement deferred mechanics that improve distribution/lifecycle UX while preserving runtime semantics and command-surface split. | Full D-016 productization remains deferred beyond seam-now contract. |
| `C4` decision tightening (`D-009`/`D-010`) | `C1..C3` evidence gate | `@rawr-architecture-duty` + `@rawr-runtime-host` | Execute only when trigger criteria are met (below). | If no trigger, keep D-009/D-010 open and explicitly defer in C7 readiness output. |
| `C5` independent review + fix closure | `C3` and `C4` if triggered | `@rawr-review-closure` | Severity-ranked review, blocking/high findings fixed in-run, re-review to `ready`. Include structural/taste pass as in-slice sub-loop (C5A behavior). | No docs cleanup while blocking/high findings remain open. |
| `C6` canonical docs + cleanup | `C5` | `@rawr-docs-maintainer` | Align canonical docs to as-landed behavior, prune superseded artifacts, publish cleanup manifest. | No policy reinterpretation; docs reflect landed behavior only. |
| `C7` post-land readiness realignment | `C6` | `@rawr-phase-sequencing` + `@rawr-architecture-duty` | Publish explicit next-phase readiness (`ready`/`not-ready`), blockers, owners, ordering; include C4 defer/closure disposition. | No downstream over-planning beyond readiness-grade constraints. |

## Must-Do-Now vs Defer (Centralized)
### Must-Do-Now in Phase C
1. `C0` decision-complete execution packet and gate contract.
2. `C1` DR-002 storage-lock redesign.
3. `C2` DR-003 telemetry structural hardening.
4. `C3` seam-safe D-016 mechanics that do not alter runtime authority or route semantics.
5. `C5` review + fix closure and structural quality pass before docs cleanup.
6. `C6` canonical doc alignment + cleanup manifest.
7. `C7` explicit readiness output with owners and order.

### Defer (Do Not Pull Into Core C1-C3)
1. Full D-016 productized UX/control-plane beyond seam-now mechanics.
2. D-009 and D-010 lock tightening unless C4 trigger criteria are met.
3. Any route-topology expansion or caller-boundary reinterpretation.
4. Any compatibility bridge that weakens D-013 hard deletion posture.

## C4 Conditional Branch Contract
### Trigger Criteria (execute C4 only if one or more are true)
1. C1-C3 introduce heavy oRPC middleware chains where dedupe-marker policy ambiguity becomes operationally risky (D-009 pressure).
2. C2 introduces Inngest `finished`-hook side effects that require stricter architecture-level guardrails (D-010 pressure).

### Execution Path (triggered)
1. Tighten decision language in `DECISIONS.md` for D-009 and/or D-010.
2. Apply corresponding middleware/runtime/test updates required by the tightened decision.
3. Re-run impacted gates before entering C5.

### No-Trigger Disposition (explicit required output)
1. Skip C4 runtime/docs mutation.
2. Record that trigger criteria were not met in C7 readiness output.
3. Keep D-009 and D-010 open/non-blocking status unchanged.
4. Carry explicit defer-forward note with owner and reconsideration conditions.

## Ownership Boundaries (No-Overlap Contract)
1. `@rawr-runtime-host` owns storage-lock semantics and state authority in C1; must not reopen route-family policy.
2. `@rawr-verification-gates` owns telemetry gate enforcement in C2; must not weaken hard-fail guarantees.
3. `@rawr-distribution-lifecycle` owns D-016 mechanics in C3; must preserve command-surface split and avoid singleton assumptions.
4. `@rawr-architecture-duty` arbitrates C4 decision-tightening scope only when trigger criteria are met.
5. `@rawr-review-closure` owns C5 finding disposition and fix closure quality bar.
6. `@rawr-docs-maintainer` owns C6 as-landed documentation synchronization and artifact pruning discipline.
7. `@rawr-phase-sequencing` owns C0 and C7 sequencing/readiness authority.

## Drift Risk Register
| Risk | Slice pressure point | Consequence | Mitigation gate |
| --- | --- | --- | --- |
| Route-family drift | C1-C3 implementation shortcuts | Caller/auth regression | Enforce route-negative assertions + boundary matrix checks before C5 closure. |
| Manifest-authority drift | C1/C3 composition edits | Split authority / hidden host coupling | Validate `rawr.hq.ts` authority and import-direction rules in gate chain. |
| D-013 regression | C3 lifecycle/distribution changes | Legacy metadata semantics reintroduced | Keep metadata-contract hard-fail checks mandatory in each impacted slice. |
| Singleton/global regression | C1 lock model + C3 lifecycle UX | Multi-owner seam breakage | Require alias/instance seam assertions and negative singleton tests. |
| Premature D-009/D-010 lock | C4 over-eager tightening | Policy churn without evidence | C4 trigger gate + no-trigger disposition path. |
| Closure skipped | C5/C6/C7 compressed under schedule pressure | Unbounded defects + docs drift | Treat C5/C6/C7 as mandatory slices in critical path. |

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
8. `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
9. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
10. `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
11. `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` (not present; equivalence logged to `dev-spec-to-milestone.md` in scratchpad)

## Evidence Map (Absolute Paths + Line Anchors)
1. Canonical doc roles and corpus authority: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/README.md:7`
2. Canonical matrix authority in architecture doc: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:49`
3. Locked route/caller/runtime split: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:43`
4. Manifest-first authority lock: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:103`
5. D-013 hard deletion lock text: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:87`
6. D-016 seam-now lock text: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:148`
7. D-009 remains open/non-blocking: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`
8. D-010 remains open/non-blocking: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:202`
9. Reusable mandatory closure loops (review, cleanup, realignment): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:42`
10. B6 readiness posture = ready: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:4`
11. B6 owner matrix and priorities: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:21`
12. B6 recommended C0-C4 opening order: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:30`
13. B6 drift guards to preserve in Phase C: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:37`
14. Phase A deferred register origin for DR-002/DR-003: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md:292`
15. Phase C planning runbook drift guards: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_PLANNING_RUNBOOK_DRAFT.md:66`
16. Phase C planning runbook exit criteria: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_PLANNING_RUNBOOK_DRAFT.md:82`
17. Orchestrator lock that C4 is conditional: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:6`
18. C4 trigger and no-trigger disposition text: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:160`
19. C5 review/fix closure mapping: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:169`
20. C6 docs cleanup mapping: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:187`
21. C7 readiness mapping: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:192`
22. Solution-design workflow requirement for assess->reframe->mandate checks: `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:95`
23. System-design second-order check requirement: `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:119`
24. Domain-design single-authority invariant: `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:134`
25. Team-design singular-accountability invariant: `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:138`
26. TypeScript parse-at-boundaries invariant: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:185`
27. oRPC contract-first mental model: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:50`
28. Inngest side-effect-in-step guidance: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md:52`
29. RAWR command-surface split invariant: `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md:27`
30. Spec->milestone current-vs-target delta discipline: `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md:102`
31. Harden-milestone coherence and safety checks: `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md:478`

## Assumptions
1. The corpus found under `wt-agent-codex-phase-c-planning-packet` is the intended equivalent of the missing `wt-agent-codex-phase-b-runtime-implementation` absolute paths in the runbook protocol.
2. C5A structural assessment remains mandatory behavior but is treated as an in-slice sub-loop under C5 for C0-C7 reporting consistency.
3. Owner handles from B6 remain valid for Phase C kickoff (`@rawr-phase-sequencing`, `@rawr-runtime-host`, `@rawr-verification-gates`, `@rawr-distribution-lifecycle`, `@rawr-architecture-duty`).
4. No new architecture-level decision IDs beyond D-016 are required unless C4 trigger criteria are met.

## Risks
1. If C2 introduces middleware/hook complexity and C4 is skipped without evidence, open D-009/D-010 debt may become hidden operational risk.
2. If C3 scope expands into full productization, D-016 defer boundaries may be violated and C3 delivery can balloon.
3. If C5 review closure is compressed, blocking defects may leak into C6/C7 and create false readiness.
4. If docs are updated before runtime closure, policy drift may be reintroduced despite green tests.

## Unresolved Questions
1. Should structural assessment remain a distinct `C5A` branch in execution artifacts, or be formally folded into `C5` for Phase C packet naming consistency?
2. What quantitative threshold constitutes “heavy middleware chains” for automatically triggering C4 (for example middleware depth/count, measured latency impact, or dedupe-marker absence)?
3. For D-016 mechanics in C3, which exact deliverables are required for “seam-now sufficient” versus “productization deferred” acceptance?
4. Does Phase C require additional cross-instance contention stress-testing beyond current gate scripts to declare C1 complete under realistic concurrency?
