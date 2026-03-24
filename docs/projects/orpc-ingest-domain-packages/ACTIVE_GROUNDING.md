# Active Grounding — Current Takeover / PostHog + Drizzle Stress-Test

Created: 2026-03-10
Refreshed: 2026-03-12
Status: Active grounding document for the next agent round and the current takeover

Role: current worker brief

## Active-Document Rule

This is the **only active grounding document** for the upcoming
`example-todo` integration round focused on real analytics and database
integrations.

Use this file as the primary compaction-surviving artifact for the next agent
wave, the next continuation snippet, and the next post-compaction restart.

If any other takeover, handoff, or grounding note disagrees with this file,
this file wins unless it is explicitly superseded in a later commit by another
file that clearly declares itself the active grounding document.

It supersedes these older handoff notes as the primary session grounding for
this phase:

- `./TAKEOVER_SESSION_2026-03-09.md`
- `./TAKEOVER_CURRENT_STATE.md`

Those files remain useful as historical context for the prior finishing/hardening
phase, but they are no longer the primary handoff document for the current
PostHog + Drizzle stress-test.

## Takeover Basis

This refresh was produced from:

- the pasted "Current execution context" snippet from the user
- the current live code under `services/example-todo/src/orpc/*` and
  `services/example-todo/src/service/*`
- the four current docs in the active source packet

Session history has **not** been consulted during this refresh because the
docs and live code were sufficient to resolve the current state without
opening a wider transcript scan.

## What This Document Is

This is the current grounding brief for the next step in the `example-todo`
golden-example effort.

The purpose of the next step is not merely to wire in PostHog and Drizzle. The
purpose is to use those real integrations to pressure-test the current package
shape and learn:

- which ports actually belong in the packaged SDK seam
- what host-owned concrete adapters should look like
- what should be provider middleware versus direct dependency input
- which current seams are transitional and should change
- what patterns should become standard in docs, architecture, and future
  scaffold output

There is also an active upstream semantic knot that must stay visible while
those integrations are being reasoned about:

- the current live SDK still merges service-declared deps with SDK/baseline
  caller requirements in one `deps` bag
- the active design direction is now exploring a split between:
  - service-declared caller input
  - host/framework top-level caller input
  - execution-time derived resources
- `DESIGN.md` is the structural map for the seams/axes behind that split
- `TELEMETRY_DESIGN.md` is the canonical target model for telemetry wiring and
  ownership

## Active Tension Snapshot

Keep this mental model active for the current design round:

- **Service-declared deps** must mean caller-fulfilled requirements declared by
  the servicepackage itself.
- **Host/framework caller requirements** may still be caller-fulfilled, but
  should not be mislabeled as service-declared deps.
- **Execution-time resources** are later derived/attached values and should not
  be confused with either of the above.

The current live code is best understood as a transitional merged shape rather
than as the final semantic target.

## Current Execution Context

### Observed

- Active worktree:
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden`
- Active branch: `codex/example-todo-unified-golden`
- Repo state at takeover start: clean
- Latest relevant commits:
  - `c1a5dab3` `docs(example-todo): add active integration grounding`
  - `c19b36fc` `docs(example-todo): add skill grounding to agent workflow`
  - `49ce8ee3` `docs(example-todo): add grounding-first agent workflow`
  - `2e9ed075` `docs(example-todo): clarify ports adapters and providers`
  - `2e452b29` `refactor(example-todo): split analytics middleware internals`
  - `69495b78` `refactor(example-todo): split observability middleware internals`
  - `692126b5` `refactor(example-todo): separate ports from host adapters`

### Inferred

- The architectural pre-work for the ports/adapters/provider split is done
  enough to start real integration stress-tests.
- The active question is now: does the current shape remain correct under real
  PostHog and Drizzle pressure, and if not, what needs to move?
- We do not need to reopen older topology debates unless the real integrations
  expose a concrete failure in the current model.

## Primary Source Packet

Read these first and treat them as the active authoritative packet for this
phase:

1. this file
2. `./DECISIONS.md`
3. `./guidance.md`
4. `./examples.md`
5. `./DESIGN.md`
6. `./TELEMETRY_DESIGN.md`
7. `./ADAPTER_POSTURE.md`

Supporting references for this phase:

- `./TELEMETRY_MIGRATION_IMPLEMENTATION_PLAN.md`
- `./SERVICE_CONTEXT_SEMANTICS_MINI_SPEC.md`
- `./ADAPTER_AGENT_WORKFLOW.md`
- `./ADAPTER_ORCHESTRATION_WORKFLOW.md`

Use these code surfaces as the primary live package grounding:

- `../../../services/example-todo/src/orpc/ports/*`
- `../../../services/example-todo/src/orpc/host-adapters/*`
- `../../../services/example-todo/src/orpc/middleware/*`
- `../../../services/example-todo/src/service/base.ts`
- `../../../services/example-todo/src/service/impl.ts`
- `../../../services/example-todo/src/service/modules/*`

Do **not** expand into full session history unless one of those sources leaves a
critical ambiguity unresolved.

## Architecture Now Locked Enough To Start From

### Observed

- `example-todo` now encodes a hard distinction between:
  - ports
  - host adapters
  - provider middleware
- `services/example-todo/src/orpc/ports/` currently contains:
  - `db.ts`
  - `feedback.ts`
  - `logger.ts`
  - `analytics.ts`
- `services/example-todo/src/orpc/host-adapters/` currently contains:
  - `logger/embedded-placeholder.ts`
  - `analytics/embedded-placeholder.ts`
  - `feedback/embedded-placeholder.ts`
  - `sql/embedded-in-memory.ts`
- `services/example-todo/src/orpc/middleware/` currently contains:
  - provider middleware such as `sql-provider.ts` and `feedback-provider.ts`
  - framework/internal observability and analytics middleware
- `services/example-todo/src/service/impl.ts` is the one servicepackage-wide runtime
  assembly seam.
- `services/example-todo/src/service/router.ts` is the one final router
  composition seam.
- `services/example-todo/src/service/base.ts` keeps the declarative service
  definition and exports bound builders for service middleware/providers.
- Module composition remains the intended local reshaping seam:
  - `tasks/module.ts`
  - `tags/module.ts`
  - `assignments/module.ts`
- Provider-derived execution values continue to flow under
  `context.provided.*`.
- logger and analytics capability contracts now live under:
  - `src/orpc/ports/logger.ts`
  - `src/orpc/ports/analytics.ts`
- runtime telemetry bootstrap now lives above the package under:
  - `packages/core/src/orpc/telemetry.ts`
- baseline analytics emission still flows through
  `context.deps.analytics.track("orpc.procedure", ...)`.
- telemetry is now a host-bootstrap/runtime-context concern rather than a
  servicepackage-local port or servicepackage dependency seam.

### Inferred

- The current servicepackage is intentionally shaped so the next integrations should
  land by classification, not by improvising a new directory or hidden system.
- The servicepackage already teaches the target ownership line:
  - host owns concrete integrations
  - packaged SDK exposes ports only when they are truly part of the
    servicepackage
    boundary semantics
  - providers turn host prerequisites into downstream execution capability

## Current Seams Most Likely To Be Pressured

### Observed

- Database usage already follows the provider pattern:
  - host prerequisite port: `src/orpc/ports/db.ts`
  - provider middleware: `src/orpc/middleware/sql-provider.ts`
  - module-local repository construction in module `middleware.ts`
- Analytics does **not** yet follow the same model end-to-end:
  - baseline analytics currently still depends on the analytics port through
    `BaseDeps`
  - framework baseline analytics middleware still emits through
    `context.deps.analytics.track(...)`
  - service/module analytics currently contribute payload to that one emission
    path
- Observability is intentionally different:
  - host bootstrap owns OpenTelemetry SDK setup
  - oRPC instrumentation activates spans
  - service/package observability consumes active span from runtime context
- Logger, analytics, feedback, and SQL now also have explicit adapter homes,
  but only analytics/logger/feedback/SQL remain package-local capability seams;
  host/runtime telemetry bootstrap is intentionally different from those seams.
  SQL is currently backed by an in-memory/example implementation.
- Module code already demonstrates the intended execution-context reshaping
  boundary:
  - `tasks/middleware.ts` and `tags/middleware.ts` derive `repo` from
    `context.provided.sql`
  - `assignments/middleware.ts` derives `repo`, `tasks`, and `tags` from
    `context.provided.sql`

### Inferred

- Drizzle should likely pressure the existing DB port/provider seam rather than
  force a new conceptual category.
- PostHog should likely pressure the current analytics seam more aggressively,
  because the target posture says analytics should become provider-backed rather
  than remain a long-term raw `deps.analytics` dependency.
- The analytics contract has already moved out of baseline-owned type
  definitions and into the ports layer. The next learning is whether analytics
  should also move out of baseline dependency composition and into an explicit
  provider model analogous to SQL.
- The other likely pressure point is whether Drizzle should satisfy the current
  `DbPool -> Sql -> module repository` seam cleanly, or whether the typed ORM
  surface proves that the existing SQL execution port is too thin.
- Another active pressure point is whether logger/analytics should continue to
  live in the same caller-facing `deps` bag as service-declared requirements,
  or move into a separate host/baseline top-level input lane. Telemetry is now
  resolved separately and should not be folded back into that seam.

## Guardrails For The Upcoming Agent Team

Carry these forward explicitly:

- Do not invent a hidden DSL.
- Do not optimize for plugin-boundary design in this round.
- Do not preserve the current seams just because they already exist.
- Do not treat `service/adapters` as a valid default destination.
- Do not teach future scaffolds that analytics should stay as raw
  `context.deps.analytics`.
- Do not flatten provider outputs package-wide; if ergonomic reshaping is
  needed, do it in module `module.ts` or module-local middleware.
- Do not treat package-local concrete adapters as supported architecture.
- Do not duplicate generic reusable ports per package if they really belong in
  a central shared SDK.
- Do not reopen settled topology questions unless the real integrations expose a
  concrete failure in the current model.

## What The Agent Team Should Actually Learn

For Drizzle:

- whether the current `DbPool` / `Sql` split is the right package-facing port
  model
- whether Drizzle belongs only as a host-side concrete adapter or whether some
  richer typed execution contract is justified
- whether module repository providers should continue to depend on generic SQL
  or move to a different execution seam

For PostHog:

- what the package actually needs from analytics at the boundary
- whether analytics should mirror the provider pattern rather than remain a
  baseline `deps` capability
- what a host-owned PostHog adapter should look like
- whether baseline analytics emission should remain in SDK middleware or be
  re-authored around a provider-backed runtime capability

For both together:

- what patterns repeat and should become canonical architecture/doc/scaffold
  rules
- which seams are package-specific versus generically reusable
- whether any current package-local port should instead be centralized
- whether the package should keep one baseline analytics emission path but
  change where the runtime capability comes from

## Immediate Agent-Grounding Checklist

Each upcoming worker should do this in order:

1. Read `DECISIONS.md` and `guidance.md`.
2. Read `ADAPTER_POSTURE.md` and `ADAPTER_AGENT_WORKFLOW.md`.
3. Ground in the live `example-todo` package surfaces listed above.
4. Introspect the relevant skill:
   - Drizzle worker -> `drizzle`
   - PostHog worker -> `posthog`
5. Create a scratch pad plus a worker-local grounding document.
6. Compact only after grounding is complete.
7. After compaction, continue from the grounding document rather than from raw
   transcript history.

The coordinator should additionally operate from
`ADAPTER_ORCHESTRATION_WORKFLOW.md` so agent phase changes, watcher review, and
compaction rituals stay explicit.

## Open Loops

### Observed

- The docs explicitly describe analytics-as-provider as the target posture, but
  the current runtime still uses baseline `deps.analytics`.
- The DB seam is already closer to the target model than analytics.
- The package currently exposes `DbPool` and `Sql` as package-local ports, while
  OpenTelemetry remains a host-adapter-only integration.
- The service-wide analytics contribution is currently a required service
  extension in `src/service/middleware/analytics.ts`, but the actual emitter is
  still the SDK baseline analytics middleware.

### Inferred

- The next round is primarily a classification and seam-correction exercise.
- The likely highest-value outcome is not just working integrations, but a more
  defensible standard for:
  - provider-backed analytics
  - host-owned ORM/database adapters
  - package-local versus centralized ports
  - how much typed runtime capability should remain in baseline deps versus
    move behind provider middleware

## Recommended Immediate Next Actions

1. Use this file as the active brief when generating the context continuation
   snippet and when compacting.
2. Spin up one Drizzle-focused agent and one PostHog-focused agent under the
   grounding-first workflow.
3. Require each agent to report:
   - integration classification
   - seam changes required
   - code changes
   - generalized architecture/scaffold learnings
4. After both agents compact, run a synthesis pass that compares their findings
   against this grounding document and feeds the conclusions back into docs and
   scaffold posture.
