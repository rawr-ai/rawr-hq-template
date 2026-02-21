# Agent 2 Final: Phase D Interfaces/Types + File-Level Map

## Decision-Complete Phase D Interface/Type Blueprint (D1-D3 + Conditional D4)

### 1) Locked frame (must not move)
1. Keep route-family topology unchanged: `/api/inngest` runtime ingress, `/api/workflows/<capability>/*` caller workflow boundary, `/rpc` first-party/internal, `/api/orpc/*` published OpenAPI.
2. Keep manifest authority unchanged (`rawr.hq.ts`) and preserve package-owned seams vs host-owned wiring.
3. Keep forward-only posture; no rollback program.
4. Treat D-009 and D-010 as open watchpoints unless D4 trigger evidence crosses threshold.

### 2) Slice-level contract/interface/type deltas + touched-path map

#### D1: Middleware dedupe hardening (`@rawr-runtime-host`)
Objective: make heavy middleware dedupe explicit and testable without route drift.

Planned interface/type deltas:
1. Add request-context middleware marker surface in boundary context.
2. Add explicit dedupe marker key(s) for heavy checks (context-cached marker contract, not implicit chain-order behavior).
3. Keep middleware semantics boundary-scoped only; no durable-runtime behavior merge.

Primary touched paths:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/workflows/context.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/orpc.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/middleware-dedupe.test.ts` (new)
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs` (new)

Non-overlap rule:
1. D1 does not edit coordination runtime contracts/types (`packages/coordination*`, `packages/core/src/orpc/runtime-router.ts`) except if steward-approved blocker appears.

#### D2: Inngest finished-hook guardrails (`@rawr-runtime-host`)
Objective: make finished-hook behavior explicit as idempotent/non-critical semantics and keep run lifecycle consistency.

Planned interface/type deltas:
1. Add explicit run-finalization semantics type (at-least-once/non-exactly-once, idempotent/non-critical expectation) as backward-compatible optional contract fields.
2. Add schema parity for new optional run-finalization fields in TypeBox contract schemas.
3. Guard finished-hook path in adapter with best-effort semantics; failures do not invalidate primary run outcome.
4. Keep queue failure contract shape stable (`RUN_QUEUE_FAILED`) while enriching persisted/timeline metadata only through compatible additions.

Primary touched paths:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/types.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/orpc/schemas.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/orpc/contract.ts` (if response schema exposure changes)
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/src/orpc/runtime-router.ts`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts` (new)
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/test/runtime-router.test.ts`
8. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/test/orpc-contract-drift.test.ts` (+ snapshot updates if contract JSON changes)
9. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/test/workflow-trigger-contract-drift.test.ts` (+ snapshot updates if contract JSON changes)

Non-overlap rule:
1. D2 owns runtime/status/type surfaces; D3 must not edit these files.

#### D3: Ingress + middleware structural gates (`@rawr-verification-gates`)
Objective: add anti-spoof and ownership assertions that catch drift beyond happy-path tests.

Planned interface/type deltas:
1. No route or transport contract expansion.
2. Add gate-level structural assertions for dedupe marker presence/placement and ingress ownership semantics.
3. Keep route-boundary matrix negative assertions authoritative.

Primary touched paths:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/_verify-utils.mjs` (new)
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs` (new)
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/ingress-signature-observability.test.ts`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/phase-a-gates.test.ts`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/package.json`

Non-overlap rule:
1. `package.json` gate wiring is D3-owned only.
2. D3 may consume D1/D2 outputs but does not modify their runtime implementation files.

#### D4 (conditional): Decision tightening (`@rawr-architecture-duty`)
Trigger criteria:
1. D1 evidence: heavy middleware chain (`>=3`) lacking explicit context-cached dedupe marker.
2. D2 evidence: finished-hook side effects are state-mutating/external without explicit idempotent/non-critical contract.
3. Repeated drift not containable by tests/gates alone.

Primary touched paths if triggered:
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-dedupe-trigger.mjs` (new)
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-finished-hook-trigger.mjs` (new)
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-disposition.mjs` (new)
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D4_TRIGGER_EVIDENCE.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D4_DISPOSITION.md`

When not triggered:
1. `D4_DISPOSITION.md` is still mandatory.
2. `DECISIONS.md` remains unchanged.

### 3) Exact Phase D scripts/tests/package.json gate wiring

#### 3.1 New script files (planned)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/_verify-utils.mjs`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d1-middleware-dedupe-contract.mjs`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d2-finished-hook-contract.mjs`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-dedupe-trigger.mjs`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-finished-hook-trigger.mjs`
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-d/verify-d4-disposition.mjs`

#### 3.2 Test wiring (planned)
1. `apps/server/test/middleware-dedupe.test.ts` (new) for D1 marker behavior.
2. `packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts` (new) for D2 finished-hook semantics.
3. `apps/server/test/route-boundary-matrix.test.ts` (extend D3 structural assertions).
4. `apps/server/test/ingress-signature-observability.test.ts` (extend ingress anti-side-effect assertions).
5. `apps/server/test/phase-a-gates.test.ts` (extend structural AST guard expectations).
6. `packages/core/test/runtime-router.test.ts` and contract drift tests/snapshots (D2-compatible contract updates).

#### 3.3 `package.json` command block to add (exact blueprint)
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

  "phase-d:gate:d3-ingress-structural-contract": "bun scripts/phase-d/verify-d3-ingress-middleware-structural-contract.mjs",
  "phase-d:gate:d3-ingress-structural-runtime": "bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts && bunx vitest run --project server apps/server/test/phase-a-gates.test.ts",
  "phase-d:d3:quick": "bun run phase-d:gate:drift-core && bun run phase-d:gate:d3-ingress-structural-contract && bun run phase-d:gate:d3-ingress-structural-runtime",
  "phase-d:d3:full": "bun run phase-d:d3:quick && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions",

  "phase-d:gate:d4-dedupe-scan": "bun scripts/phase-d/verify-d4-dedupe-trigger.mjs",
  "phase-d:gate:d4-finished-hook-scan": "bun scripts/phase-d/verify-d4-finished-hook-trigger.mjs",
  "phase-d:d4:assess": "bun run phase-d:gate:d4-dedupe-scan && bun run phase-d:gate:d4-finished-hook-scan",
  "phase-d:gate:d4-disposition": "bun scripts/phase-d/verify-d4-disposition.mjs",

  "phase-d:gates:full": "bun run phase-d:d1:full && bun run phase-d:d2:full && bun run phase-d:d3:full && bun run phase-d:gate:d4-disposition",
  "phase-d:gates:exit": "bun run phase-d:gates:full && bun run phase-a:gates:exit"
}
```

### 4) Route topology + deferred/non-overlap constraints
1. No new route family, no route rename, and no `/rpc/workflows` mount introduction.
2. No change to caller transport semantics (`RPCLink` internal-first-party; OpenAPI for external; `/api/inngest` runtime-only ingress).
3. D-016 UX/productization mechanics remain deferred.
4. D4 is evidence-gated and can update lock text only when criteria are met.
5. Shared files with highest collision risk and owner lock:
   - `package.json`: D3 only.
   - `packages/core/src/orpc/runtime-router.ts`: D2 only (D4 only if triggered and strictly post-D2).
   - `apps/server/test/route-boundary-matrix.test.ts`: D3 only.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`

## Evidence Map (absolute paths + line anchors)
1. Locked route families and forward-only posture: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:34`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:37`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:15`
2. Canonical caller/auth matrix and forbidden route semantics: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:52`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:57`
3. Global invariants include explicit dedupe guidance and no `/rpc/workflows`: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:77`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:96`
4. D-009 is open with non-blocking dedupe guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:194`
5. D-010 is open with idempotent/non-critical finished guidance: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:202`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:206`
6. Phase C readiness carries D4 watchpoint into Phase D: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:13`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-c-runtime-execution-pass-01-2026-02-21/C7_PHASE_D_READINESS.md:15`
7. Phase D objective definitions for D1-D3/D4: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:151`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:162`
8. Orchestrator also locks “no route topology changes”: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:202`
9. Current host mount order constant and route registration points: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/rawr.ts:18`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/rawr.ts:227`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/rawr.ts:239`
10. Current ORPC route registrations across `/rpc` and `/api/orpc/*`: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/orpc.ts:90`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/orpc.ts:105`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/orpc.ts:120`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/orpc.ts:132`
11. Boundary context shape currently only request/correlation IDs (no explicit middleware marker contract yet): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/workflows/context.ts:11`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/src/workflows/context.ts:14`
12. Current run status contract fields (baseline for D2 extension): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/types.ts:92`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/types.ts:105`
13. Current RunStatus TypeBox schema shape: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/orpc/schemas.ts:105`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination/src/orpc/schemas.ts:126`
14. Queue dedupe lock currently exists at run queue layer: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:25`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:45`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:136`
15. Run completion and failure persistence paths in adapter: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:298`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:333`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/coordination-inngest/src/adapter.ts:351`
16. Runtime router queue failure fallback + typed error mapping: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/src/orpc/runtime-router.ts:191`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/packages/core/src/orpc/runtime-router.ts:224`
17. Existing route-negative and anti-spoof test baseline: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:24`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/route-boundary-matrix.test.ts:341`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/ingress-signature-observability.test.ts:27`
18. Host-composition static gate scaffold baseline: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/phase-a-gates.test.ts:134`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/apps/server/test/phase-a-gates.test.ts:147`
19. Existing script contract pattern is phase-c verifier based: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-c/verify-telemetry-contract.mjs:2`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/scripts/phase-c/verify-telemetry-contract.mjs:86`
20. `package.json` currently wires Phase A + C gates and has no Phase D command block yet: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/package.json:45`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/package.json:57`
21. Conditional-slice artifact discipline precedent (`depends_on_if_triggered`, disposition mandatory): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:107`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_WORKBREAKDOWN.yaml:109`
22. Conditional gate precedent (`assess` + mandatory disposition): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_ACCEPTANCE_GATES.md:80`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_C_ACCEPTANCE_GATES.md:82`

## Assumptions
1. Phase D keeps contract changes backward-compatible at API shape level unless D4 explicitly triggers lock tightening.
2. `phase-d:gate:drift-core` should reuse Phase C drift-core baseline to avoid gate regression.
3. New D1 and D2 tests can be added without changing route topology.
4. D3 owns gate script + `package.json` wiring to prevent cross-slice conflicts.
5. If D4 is deferred, only disposition artifacts are required and no DECISIONS lock text is modified.

## Risks
1. D1 and D3 can collide in server-test files unless ownership is enforced (`middleware-dedupe.test.ts` as D1-dedicated mitigates this).
2. D2 contract enrichment could break contract drift snapshots if optionality is not preserved.
3. D3 structural gates may become brittle if implemented as exact-string AST checks without stable helper patterns.
4. D4 trigger scans can under-detect if “heavy middleware” and “state-mutating side effect” are not operationally codified.
5. Introducing phase-d scripts without wiring into `phase-d:gates:full`/`phase-d:gates:exit` would create false-green progression.

## Unresolved Questions
1. For D2, should finished-hook guardrail semantics be represented on `RunStatusV1`, timeline event payloads, or both?
2. For D1, is middleware marker state canonical in `RawrBoundaryContext` or in oRPC-local middleware context extension types?
3. Should D3 require static verification of mount-order constant (`PHASE_A_HOST_MOUNT_ORDER`) in addition to runtime route tests, or is existing phase-a gate coverage sufficient?
4. If D4 triggers, should D-009 and D-010 lock independently (one can lock while the other remains open), or must they move together?
