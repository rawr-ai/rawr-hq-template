# Agent E Final System Risk Analysis

## Skills Introspected

1. **solution-design**: I used the mandate around reframing, incentive alignment, reversibility depth calibration, and explicit escape/failure checks to prioritize which failures happen first under uncertainty.
   - Evidence: `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md#L81`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md#L83`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md#L85`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md#L89`
2. **system-design**: I used loop/boundary/second-order/incentive tests to model cascade behavior and identify high-coupling failure loops.
   - Evidence: `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md#L115`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md#L117`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md#L119`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md#L121`
3. **domain-design**: I used seam/authority/ambiguity tests to evaluate route-surface ownership drift and control-plane overlap risk.
   - Evidence: `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md#L93`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md#L95`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md#L101`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md#L137`
4. **inngest**: I used durability pitfalls around step boundaries, stable step IDs, flow-control selection, and endpoint security as concrete runtime risk criteria.
   - Evidence: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md#L52`, `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md#L55`, `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md#L57`, `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md#L59`

## Evidence Map

- **EV-01 (Route/control-plane split is mandatory)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L45`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L51`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L52`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L78`
- **EV-02 (Harness and negative-route assertions are part of safety envelope)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md#L26`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md#L27`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md#L28`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md#L119`
- **EV-03 (Ingress route is mounted directly in host path)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts#L111`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts#L113`
- **EV-04 (Queue path persists queued state before event send)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L162`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L163`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L175`
- **EV-05 (Queue failure fallback can fail silently in persistence path)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts#L200`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts#L217`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts#L229`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts#L233`
- **EV-06 (Duplicate enqueue protection is in-memory/process-local)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L25`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L27`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L136`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L137`
- **EV-07 (Retriable function writes failed status before retry re-entry)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L218`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L333`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L339`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L365`
- **EV-08 (Observability/tracing contract requires bootstrap order)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L52`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md#L123`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md#L24`
- **EV-09 (Trace links depend on configured base URL; localhost fallback exists)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts#L115`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L157`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L190`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts#L261`
- **EV-10 (Downstream drift checks are explicitly required but deferred)**
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md#L14`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md#L31`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md#L173`

## Assumptions

1. Assessment is constrained to the specified anchor docs and the three runtime files; non-scoped modules may provide additional safeguards not visible here.
2. This architecture may run in more than one server process/replica in production-like environments.
3. Runtime adapter persistence (`saveRunStatus`, `appendTimeline`) can fail independently of Inngest event enqueue.
4. Inngest ingress security guarantees depend on correct deployment configuration (signing keys, gateway policy), not only route existence.
5. Some target-state route surfaces (for example `/api/workflows/<capability>/*`) may be mounted outside the reviewed server anchor files.

## Risks

### Prioritized Failure Modes (What Gets Us First)

| Priority | Failure mode | Trigger signals | Blast radius | Mitigation direction | Evidence |
| --- | --- | --- | --- | --- | --- |
| P1 | **Route/control-plane drift exposes runtime ingress semantics to caller flows** | Non-Inngest user agents hitting `/api/inngest`; missing/weak negative-route tests; external traffic reaching `/rpc` | Security + semantic boundary erosion across caller/runtime planes | Enforce signed-ingress + gateway allow-listing on `/api/inngest`; make forbidden-route assertions blocking CI for all caller personas | EV-01, EV-02, EV-03 |
| P2 | **Queue lifecycle coupling creates ambiguous stuck states on enqueue/persistence failures** | `queued` runs aging without event IDs; `RUN_QUEUE_FAILED` errors with missing `run.failed` timeline; mismatch between queue requests and sent events | Operational blind spots + recovery uncertainty for coordination runs | Introduce explicit enqueue state machine (pending/queued/sent/failed), reconcile stale queued runs, and remove silent persistence swallow paths | EV-04, EV-05 |
| P3 | **Cross-instance duplicate enqueue race on same `runId`** | Multiple event IDs/timeline starts for one `runId`; duplicate run starts from concurrent queue calls | Duplicate execution, side-effect replay, and noisy status/timeline streams | Move idempotency boundary to shared store (unique key + conditional write) or distributed lock; enforce send idempotency keying | EV-06 |
| P4 | **Retry-cycle writes terminal-looking `failed` status before retries are exhausted** | `run.failed` followed by later `run.completed` for same `runId`; alert flapping on transient faults | False incident signals + premature compensating actions | Record attempt-scoped retry state (`retrying`) and emit terminal `failed` only when retries are exhausted; tune alerting to terminal status | EV-07 |
| P5 | **Observability baseline drift between policy and effective bootstrap path** | Missing trace continuity from trigger to durable run; inconsistent correlation context between boundary and runtime paths | Reduced incident diagnosability and slower mean-time-to-restore | Add explicit startup assertion for baseline traces middleware presence/order; keep host-composition guard checks mandatory | EV-08, EV-10 |
| P6 | **Production trace-link integrity degrades from localhost base URL fallback** | Trace links pointing to `localhost` in non-local environments | Triage friction and slower operator navigation during incidents | Fail fast on missing prod base URL; enforce env validation and telemetry checks for link host correctness | EV-09 |

## Unresolved Questions

1. Where is `extendedTracesMiddleware()` concretely initialized in the active host bootstrap path for this worktree, and is ordering asserted at startup?
2. Does the run-status/timeline persistence layer enforce a unique/atomic `runId` write contract across concurrent processes?
3. Is `/api/inngest` protected at gateway/runtime with enforced signed-ingress validation in all non-dev environments?
4. What is the intended operator semantics during retries: should interim failures be visible as terminal `failed`, or represented as retry-attempt states?
5. Are stale `queued` runs reconciled automatically (sweeper/reconciler), and what SLA defines a queue-send timeout breach?
6. Where are `/api/workflows/<capability>/*` mounts currently registered relative to `/api/inngest` and `/rpc` in executable host wiring?
