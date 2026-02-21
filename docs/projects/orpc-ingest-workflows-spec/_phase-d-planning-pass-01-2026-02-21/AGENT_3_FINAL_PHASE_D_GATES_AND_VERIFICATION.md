# Agent 3 Final: Phase D Gates and Verification

## Decision-Complete Phase D Verification Model (Forward-Only)

### 1) Gate posture and cadence contract
1. Forward-only controls only; no rollback matrix/playbook track in Phase D.
2. Quick gates run on every commit for the active slice and every review-fix commit.
3. Full gates run at slice candidate completion, after blocking/high fix sets, before independent review, and before phase exit.
4. Drift-core remains mandatory in each slice quick run.
5. Conditional D4 is explicit and artifact-gated (assess + disposition), never implicit.

### 2) Proposed Phase D quick/full gate matrix

#### D1 Middleware dedupe hardening
Quick:
1. `bun run phase-d:gate:drift-core`
2. `bun run phase-d:gate:d1-middleware-dedupe-contract`
3. `bun run phase-d:gate:d1-middleware-dedupe-runtime`

Full:
1. `bun run phase-d:d1:quick`
2. `bunx vitest run --project server apps/server/test/rawr.test.ts`

Required outcomes:
1. Explicit context-cached dedupe marker assertions exist for heavy middleware behavior.
2. No mount-order/route-family drift.

#### D2 Inngest finished-hook guardrails
Quick:
1. `bun run phase-d:gate:drift-core`
2. `bun run phase-d:gate:d2-finished-hook-contract`
3. `bun run phase-d:gate:d2-finished-hook-runtime`

Full:
1. `bun run phase-d:d2:quick`
2. `bunx vitest run --project core packages/core/test/runtime-router.test.ts`
3. `bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts`
4. `bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts`

Required outcomes:
1. Finished-hook semantics are constrained to idempotent/non-critical behavior.
2. Non-exactly-once lifecycle behavior is verifier-covered.

#### D3 Ingress + middleware structural gates
Quick:
1. `bun run phase-d:gate:drift-core`
2. `bun run phase-d:gate:d3-ingress-middleware-structural-contract`
3. `bun run phase-d:gate:d3-ingress-middleware-structural-runtime`

Full:
1. `bun run phase-d:d3:quick`
2. `bun run phase-a:gate:host-composition-guard`
3. `bun run phase-a:gate:route-negative-assertions`

Required outcomes:
1. Anti-spoof assertions remain hard-fail.
2. Caller/runtime route-family negative assertions remain explicit and executable.

#### D4 Conditional decision tightening (D-009/D-010)
Assess:
1. `bun run phase-d:d4:assess`

Mandatory before D5 (regardless of trigger result):
1. `bun run phase-d:gate:d4-disposition`

If triggered:
1. Re-run impacted touched-slice full commands.
2. Run tightened decision-lock assertions.

Required outcomes:
1. `D4_TRIGGER_EVIDENCE.md` is present when triggered.
2. `D4_DISPOSITION.md` exists in all cases and records `triggered` or `deferred`.

### 3) Review-fix and re-review closure loop (D5)
Entry:
1. D1-D3 full-green.
2. D4 disposition gate green.

Loop:
1. Independent TypeScript + oRPC review with severity-ranked, line-anchored findings.
2. Blocking/high findings must be fixed before progression.
3. After each fix set: rerun impacted quick gates, rerun impacted full gates, rerun independent review on touched scope.
4. Exit only when blocking/high findings are closed and re-review disposition is `approve`.

### 4) Structural gate criteria (D5A)
1. Structural pass is mandatory and separate from D5 review.
2. Scope: naming clarity, module boundary quality, duplication reduction, domain clarity.
3. Hard constraint: no route topology changes and no architecture model drift.
4. Any accepted structural edits require impacted quick/full reruns before closure.
5. Structural blocking/high findings are phase-blocking until closed.

### 5) Phase exit contract (D6-D7 + final gate)
Required before Phase D completion:
1. D1-D3 accepted in order.
2. D4 disposition complete (`triggered` and closed, or explicit `deferred`).
3. D5 review/fix closure complete.
4. D5A structural closure complete.
5. D6 docs/cleanup closure complete.
6. D7 readiness posture published.
7. `bun run phase-d:gates:exit` green on final landed branch state.

### 6) Anti-drift assertion set (must stay explicit)
1. Route-family invariants: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest` semantics unchanged.
2. `/api/inngest` never appears as caller-facing boundary route in caller suites.
3. External callers cannot use `/rpc`; no dedicated `/rpc/workflows` mount.
4. Manifest-owned composition and host mount-order invariants remain enforced.
5. Metadata/runtime drift-core (D-013 obligations) remains mandatory via drift-core baseline.

### 7) Package script command contract blueprint
```json
{
  "phase-d:gate:drift-core": "bun run phase-c:gate:drift-core",

  "phase-d:gate:d1-middleware-dedupe-contract": "bun scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs",
  "phase-d:gate:d1-middleware-dedupe-runtime": "bunx vitest run --project server apps/server/test/middleware-dedupe.test.ts",
  "phase-d:d1:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d1-middleware-dedupe-contract && bun run phase-d:gate:d1-middleware-dedupe-runtime",
  "phase-d:d1:full": "bun run phase-d:d1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",

  "phase-d:gate:d2-finished-hook-contract": "bun scripts/phase-d/verify-d2-finished-hook-contract.mjs",
  "phase-d:gate:d2-finished-hook-runtime": "bunx vitest run --project coordination-inngest packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts && bunx vitest run --project core packages/core/test/runtime-router.test.ts",
  "phase-d:d2:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d2-finished-hook-contract && bun run phase-d:gate:d2-finished-hook-runtime",
  "phase-d:d2:full": "bun run phase-d:d2:quick && bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts && bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts",

  "phase-d:gate:d3-ingress-middleware-structural-contract": "bun scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs",
  "phase-d:gate:d3-ingress-middleware-structural-runtime": "bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts && bunx vitest run --project server apps/server/test/phase-a-gates.test.ts",
  "phase-d:d3:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d3-ingress-middleware-structural-contract && bun run phase-d:gate:d3-ingress-middleware-structural-runtime",
  "phase-d:d3:full": "bun run phase-d:d3:quick && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions",

  "phase-d:gate:d4-dedupe-scan": "bun scripts/phase-d/verify-d4-dedupe-trigger.mjs",
  "phase-d:gate:d4-finished-hook-scan": "bun scripts/phase-d/verify-d4-finished-hook-trigger.mjs",
  "phase-d:d4:assess": "bun run phase-d:gate:d4-dedupe-scan && bun run phase-d:gate:d4-finished-hook-scan",
  "phase-d:gate:d4-disposition": "bun scripts/phase-d/verify-d4-disposition.mjs",

  "phase-d:gates:full": "bun run phase-d:d1:full && bun run phase-d:d2:full && bun run phase-d:d3:full && bun run phase-d:gate:d4-disposition",
  "phase-d:gates:exit": "bun run phase-d:gates:full && bun run phase-a:gates:exit"
}
```

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`

## Evidence Map (absolute paths + line anchors)
1. Phase D is planning for a decision-complete forward-only execution packet: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:4`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:15`
2. D3 planner role explicitly owns verification/gates design: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_RUNBOOK_DRAFT.md:35`
3. Route-family invariants and forward-only convergence in reusable phase workflow: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:8`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:15`
4. Quick/full cadence requirements and fix-before-progress rule: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:36`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:40`
5. Independent review and re-review loop requirements: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:43`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:47`
6. Structural pass mandatory and distinct from review closure: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:50`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:54`
7. D-015 lock: harness model and mandatory negative-route assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:128`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:135`
8. D-009 and D-010 remain open watchpoints entering Phase D: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:203`
9. Middleware policy requires dedupe guidance and harness-specific verification: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:37`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:42`
10. Errors/observability policy requires route-aware harness use and ingress-negative assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:33`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:34`
11. Context axis binds route split to context model: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:26`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:30`
12. Phase D readiness already flags middleware/ingress drift risk: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:33`
13. Orchestrator Phase D explicitly requires quick/full cadence and new structural gates for D1-D3: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:205`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:215`
14. Orchestrator defines D4 as conditional with required defer disposition path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:160`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:162`
15. Existing command contract baseline includes Phase A and C gates but no Phase D yet: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/package.json:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/package.json:57`
16. Phase C acceptance gates provide the reusable quick/full + conditional disposition template: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_ACCEPTANCE_GATES.md:6`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_ACCEPTANCE_GATES.md:78`
17. Conditional dependency/disposition modeling precedent in work breakdown (`depends_on_if_triggered`, mandatory disposition): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:107`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:109`
18. Route-boundary matrix already encodes required suite IDs and negative assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:14`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:24`
19. Route-boundary matrix enforces ingress/caller separation and external `/rpc` rejection: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:341`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:346`
20. Ingress observability test confirms rejected signatures create no telemetry side effects: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/ingress-signature-observability.test.ts:27`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/ingress-signature-observability.test.ts:56`
21. Host composition gate scaffold enforces manifest-owned seams and negative route assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/phase-a-gates.test.ts:134`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/phase-a-gates.test.ts:147`
22. Runtime router seam test protects route contract stability for coordination procedures: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/test/runtime-router.test.ts:29`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/test/runtime-router.test.ts:44`
23. Existing phase-c verifier pattern validates scripts + test + package.json wiring together: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-c/verify-telemetry-contract.mjs:2`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-c/verify-telemetry-contract.mjs:95`
24. Distribution axis requires no singleton-global assumptions and channel semantics constraints (relevant drift-core for D3/D4): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:32`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:34`

## Assumptions
1. Phase D gate scripts will follow the established phase-c verifier pattern (`scripts/phase-<x>/verify-*.mjs`).
2. `phase-d:gate:drift-core` should inherit `phase-c:gate:drift-core` unless steward specifies stronger baseline.
3. New D4 assess/disposition scripts are acceptable even when D4 is deferred, because disposition verification is mandatory regardless of trigger outcome.
4. Existing route-boundary and ingress tests are the baseline anti-drift anchors and will be extended rather than replaced.

## Risks
1. Missing Phase D package.json wiring can make planning appear complete while runtime execution lacks enforceable commands.
2. If D4 disposition is treated as optional when deferred, D5 review sequencing can start without explicit decision state.
3. Over-broad structural gate scope can drift into architecture changes and violate locked topology constraints.
4. Review-fix loop may falsely converge if re-review is not explicitly rerun after each blocking/high fix set.
5. Drift-core inheritance from prior phases can miss new D1/D2/D3-specific regressions if phase-d verifiers are under-specified.

## Unresolved Questions
1. Should `phase-d:gate:drift-core` remain an alias to phase-c drift-core, or should Phase D define an expanded drift-core that includes D3 structural assertions by default?
2. For D2 finished-hook verification, should the full gate require both runtime behavior tests and explicit static contract scans in one command, or keep them split into separate quick gates?
3. For D5A structural gate, should the closure contract require a dedicated structural verifier command in addition to rerunning impacted quick/full suites?
4. If D4 triggers only one decision dimension (D-009 or D-010), should `phase-d:gate:d4-disposition` permit partial lock movement, or require paired lock movement?
