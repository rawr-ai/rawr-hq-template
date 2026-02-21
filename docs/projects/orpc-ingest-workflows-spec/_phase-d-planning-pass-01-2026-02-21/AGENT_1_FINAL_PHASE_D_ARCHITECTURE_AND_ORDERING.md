# Agent 1 Final: Phase D Architecture and Slice Ordering

## Decision-Complete Phase D Architecture + Ordering (Forward-Only)

### 1) Locked architectural frame for Phase D
Phase D should execute as a constrained hardening wave, not an architecture redesign wave:
1. Preserve route-family split and caller semantics (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
2. Preserve manifest authority (`rawr.hq.ts`) and runtime semantics (`rawr.kind + rawr.capability + manifest registration`).
3. Keep package-owned seams and host-owned concrete wiring split.
4. Keep legacy metadata hard-deletion posture and no-singleton lifecycle posture intact.
5. Keep forward-only delivery and no rollback track.

### 2) Recommended Phase D slice DAG

```text
D0 planning packet closure + G1.5 steward drift check
  -> D1 middleware dedupe hardening
    -> D2 finished-hook guardrails
      -> D3 ingress/middleware structural gates
        -> D4 conditional decision tightening (triggered or deferred disposition)
          -> D5 independent review/fix closure
            -> D5A structural assessment
              -> D6 docs + cleanup
                -> D7 Phase E readiness
```

Execution rules:
1. Runtime implementation starts only after planning closure and steward drift-check pass.
2. D1->D2->D3 are strictly ordered.
3. D4 is conditional but **artifact-mandatory** (`D4_DISPOSITION.md` always required; `D4_TRIGGER_EVIDENCE.md` required when triggered).
4. D5 must depend on D3 and D4 disposition closure (if triggered, D4 code/doc changes must also be landed before D5 close).
5. No slice starts with unresolved red gates from the previous slice.

### 3) Slice architecture, dependencies, and owner boundaries

| Slice | Primary owner boundary | Depends on | Output contract | Drift/failure triggers |
| --- | --- | --- | --- | --- |
| D1 middleware dedupe hardening | `@rawr-runtime-host` owns runtime middleware behavior and route-boundary invariants | D0/G1.5 | dedupe marker contract + structural assertions | any heavy middleware chain with missing explicit context-cached dedupe marker; any route-family semantic drift |
| D2 finished-hook guardrails | `@rawr-runtime-host` + runtime workflow owners | D1 | idempotent/non-critical finished-hook contract + coverage | any state-mutating/external side effect in finished hooks without idempotency contract |
| D3 ingress/middleware structural gates | `@rawr-verification-gates` owns gate evolution and anti-drift checks | D2 | anti-spoof/ownership structural gates | missing negative-route assertions; ingress boundary leakage (`/api/inngest` used as caller route); package/plugin import-direction regression |
| D4 conditional decision tightening | `@rawr-architecture-duty` steward authority for decision lock arbitration | D1+D2+D3 evidence package | `D4_TRIGGER_EVIDENCE.md`, `D4_DISPOSITION.md`, optional `DECISIONS.md` lock updates | triggered evidence threshold met for D-009/D-010 lock hardening; contradictory evidence unresolved by implementation-only changes |
| D5 review/fix closure | independent reviewer + slice owners | D3 + D4 disposition | severity-ranked review + fixed blocking/high findings + re-review approve | any unresolved blocking/high finding; gates not rerun after fixes |
| D5A structural assessment | structural steward | D5 | naming/boundary/duplication cleanup without topology change | any architecture/topology change introduced under structural pass |
| D6 docs/cleanup | `@rawr-docs-maintainer` | D5A | canonical docs aligned + cleanup manifest | canonical docs not matching landed behavior; closure artifacts missing; stale noise retained |
| D7 readiness | steward/orchestrator | D6 | explicit Phase E readiness posture with blockers/owners/order | readiness missing owner/order/blocker clarity; unresolved deferred watchpoints without disposition |

### 4) Conditional D4 trigger criteria (explicit)
D4 should run only when **any** of the following are true after D1-D3 evidence collection:
1. D1 evidence shows middleware chain depth `>=3` with no explicit context-cached dedupe marker in active heavy paths.
2. D2 evidence shows finished-hook side effects that are state-mutating or external and lack explicit idempotency/non-critical guarantees.
3. D3 evidence shows repeated boundary/ingress drift that cannot be stabilized by gates/tests alone and requires decision-register lock language to prevent recurring contradictory implementation.

D4 should be deferred when all are true:
1. D1-D3 gates pass with no high-severity policy ambiguity.
2. Residual issues are implementation/local-gate quality items and do not require DECISIONS lock changes.
3. A written defer disposition is produced with explicit carry-forward watchpoint(s).

Recommended D4 mechanics:
1. Always run `phase-d:d4:assess` (or equivalent assess aggregator) before D5.
2. If triggered, run `full_if_triggered` reruns for touched slices and update `DECISIONS.md` only for evidence-backed lock changes.
3. If not triggered, publish `D4_DISPOSITION.md` with trigger matrix and defer rationale.
4. Make `D4_DISPOSITION.md` a hard prerequisite for D5 review kickoff.

### 5) Forward-only drift and failure trigger set

Global drift triggers (phase-stopping):
1. Any change to canonical route-family semantics or forbidden-route posture.
2. Any runtime semantics regression from manifest-keyed authority (`rawr.kind`, `rawr.capability`, `rawr.hq.ts`).
3. Reintroduction of legacy metadata keys (`templateRole`, `channel`, `publishTier`, `published`) in active metadata surfaces.
4. New singleton-global lifecycle assumptions violating alias/instance seam contract.
5. Package->plugin import reversal violating one-way ownership direction.

Slice-level failure triggers (must fix before progressing):
1. Red gate in quick/full slice suite.
2. Blocking/high independent review finding.
3. Structural pass introducing architecture drift.
4. Docs mismatch against landed behavior.
5. Missing closure artifacts required by next gate.

### 6) Planning packet field-level requirements to keep
For each Phase D slice in `PHASE_D_WORKBREAKDOWN.yaml`:
1. `id`, `title`, `owner`, `backup`, `depends_on`.
2. `depends_on_if_triggered` for D5 on D4.
3. `requires_artifacts` including `D4_DISPOSITION.md` (always) and `D4_TRIGGER_EVIDENCE.md` (if triggered).
4. `objective`, `files`, `gates.quick`, `gates.full`, `gates.mandatory_before_next`.
5. `failure_triggers` list aligned to global + slice-local triggers.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
8. Workflow prompts introspected:
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
   - `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-2-milestone.md` not present (treated as N/A equivalent mapping).

## Evidence Map (absolute paths + line anchors)
1. Phase D must be forward-only, no rollback: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:4`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:15`
2. Canonical route-family invariants: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:66`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:67`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:68`
3. Caller/auth matrix authority: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:50`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:52`
4. Manifest authority and runtime semantics constraints: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:97`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:103`
5. Legacy metadata fields forbidden: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:98`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:99`
6. D-013 lock obligations: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:87`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:92`
7. D-014 package/host composition guarantees: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:108`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:114`
8. D-015 verification harness lock: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:128`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:133`
9. D-016 lifecycle/distribution lock: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:148`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:156`
10. D-009 open status and dedupe guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:194`
11. D-010 open status and finished-hook guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:202`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:206`
12. Phase workflow requires explicit conditional-slice artifacts: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:107`
13. Phase workflow enforces no parallel same-file ownership and verification-before-progress: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:34`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:40`
14. C7 readiness posture and carry-forward watchpoint: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:4`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:15`
15. Phase D kickoff owners: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:21`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:23`
16. Phase D startup ordering guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:27`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:28`
17. Phase D risk watchpoints (singleton, middleware drift, scope creep): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:32`
18. Phase D planning output and exit requirements: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:69`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:79`
19. Orchestrator slice map including conditional D4 and objectives: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:32`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:160`
20. Explicit D4 trigger/defer intent in orchestrator plan: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:161`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:162`
21. C4 precedent for trigger criteria + conditional dependency modeling: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:97`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:99`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:107`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:109`
22. C-phase closure confirms D4-style conditional path can be non-triggered with explicit disposition: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/PHASE_C_EXECUTION_REPORT.md:21`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/PHASE_C_EXECUTION_REPORT.md:22`
23. Axis 06 middleware dedupe and harness-specific verification obligations: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:37`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:42`
24. Axis 05 finished-hook idempotent/non-critical operational guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:32`
25. Axis 13 no-singleton + alias/instance seam and deferred UX mechanics: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:33`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:43`

## Assumptions
1. Phase D implementation slices and branch taxonomy in orchestrator plan are accepted as baseline unless steward review changes them.
2. D1-D3 can generate enough concrete evidence to evaluate D4 without broad exploratory spikes.
3. D4 lock changes, if triggered, target D-009/D-010 only and do not reopen locked D-005..D-016 decisions.
4. The C4 conditional modeling pattern (`conditional`, `depends_on_if_triggered`, `requires_artifacts`) is the intended template for D4 in Phase D workbreakdown.
5. `dev-spec-2-milestone.md` is absent and no alternate hidden equivalent path exists beyond `dev-spec-to-milestone.md`.

## Risks
1. Over-tightening D-009/D-010 from weak evidence could convert operational guidance into brittle policy and increase false-positive drift gates.
2. Under-tightening D-009/D-010 could keep recurring review findings alive across phases and push avoidable ambiguity into Phase E.
3. D3 gate additions may become noisy or flaky if structural assertions are not scoped to invariant-critical paths.
4. D5A structural pass could accidentally mutate architecture semantics if owner boundaries are not enforced strictly.
5. Docs cleanup could prune needed evidence artifacts if D4 disposition dependencies are not explicitly encoded.

## Unresolved Questions
1. What exact quantitative threshold should mark D4 “triggered” for D-009 and D-010 independently (count of violations, severity threshold, or both)?
2. Should D4 allow partial locking (lock D-009 only or D-010 only), or require a single all-or-nothing decision operation?
3. Which concrete Phase D gate commands will become canonical names (`phase-d:d1:quick/full`, etc.) in `PHASE_D_ACCEPTANCE_GATES.md`?
4. Will D5 consume one consolidated `D4_DISPOSITION.md`, or separate per-decision disposition records when only one decision is triggered?
5. Which steward role is final tie-break authority if `@rawr-runtime-host` and `@rawr-verification-gates` disagree on D4 trigger sufficiency?
