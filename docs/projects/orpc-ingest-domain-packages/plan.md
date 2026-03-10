# Plan: Implement Baseline Middleware Architecture

## Purpose

This plan converts the target architecture in
[`draft-base-middleware.md`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/docs/projects/orpc-ingest-domain-packages/draft-base-middleware.md)
into an implementation sequence for `packages/example-todo`.

It is intentionally decision-complete:

- no open architecture questions are left for implementation time
- the target SDK surface is explicit
- the migration order is explicit
- tests, comments, docs, and agent workflow are part of the work, not cleanup

This plan is for the current branch state, where:

- `src/service/base.ts` is already the single-file service-definition seam
- service-wide telemetry is still partly authored there
- `defineService(...)` still owns service telemetry baseline registration
- `createServiceImplementer(...)` still takes only the contract

## Non-Goals

This plan does **not** reopen or redesign:

- the package topology
- the lane model
- provider semantics
- module shape (`contract.ts` / `setup.ts` / `router.ts`)
- the grouped service declaration categories already in `service/base.ts`

This plan also does **not** introduce compatibility layers as a final state.
Temporary internal overlap is acceptable only while a later slice removes it in
the same branch.

## Hard Decisions Locked Before Implementation

### 1. Service definition stays declarative

`src/service/base.ts` remains the declarative service-definition seam.

It keeps:

- support types
- grouped service declaration types
- metadata defaults
- policy vocabulary
- bound authoring exports

It must not keep:

- observability configuration blocks
- analytics configuration blocks
- runtime telemetry hooks
- service-wide behavioral middleware implementations

### 2. Telemetry is split across four layers

Telemetry is implemented through four layers with different responsibilities:

1. SDK baseline observability middleware
2. SDK baseline analytics middleware
3. required service observability middleware
4. required service analytics middleware

Lower-scope module/procedure telemetry remains additive.

### 3. Baseline dependencies stay SDK-owned

The SDK continues to own baseline deps through `BaseDeps`.

Concretely, these remain SDK-owned and always-present:

- `logger`
- `analytics`

Services must **not** restate those baseline deps just to satisfy required
telemetry middleware.

### 4. Required service telemetry is enforced at `createServiceImplementer(...)`

Required service runtime telemetry is not registered in `defineService(...)`.

The enforcement seam is:

```ts
createServiceImplementer(contract, {
  observability,
  analytics,
})
```

Missing required telemetry at this seam is a compile-time error.

### 5. No normal telemetry config path in `service/base.ts`

This is a hard rule, not a soft preference:

- there will never be a normal observability config block in `service/base.ts`
- there will never be a normal analytics config block in `service/base.ts`

Why this is load-bearing:

- the generic telemetry envelope is derivable from metadata defaults,
  procedure shape, stable lanes, and policy vocabulary
- recurring non-derived declarative service semantics belong in metadata or
  policy instead
- a dedicated telemetry config surface would duplicate semantics and weaken the
  architecture

### 6. `policy` remains the declarative service-wide vocabulary

`policy` stays in the declarative seam and remains distinct from:

- errors
- observability
- analytics

`policy` is the service-wide vocabulary for rule decisions that runtime
telemetry may consume.

### 7. Analytics keeps a single canonical emission path

There is one canonical analytics emitter.

That means:

- SDK baseline analytics middleware owns canonical emission
- required service analytics middleware enriches that path
- additive module/procedure analytics contribute below that path

Required service analytics middleware must not emit a competing canonical event
stream.

### 8. Observability and analytics do not use identical mechanics

They are both middleware concerns, but they are not mechanically identical.

Analytics can cleanly split into:

- SDK baseline emitter
- service/module/procedure contributors

Observability cannot fully collapse that way, because service-level start /
succeeded / failed lifecycle behavior must run as a real wrapper, not just as a
late contributor.

So the implementation target is:

- analytics: framework emitter + service/additive contributors
- observability: framework wrapper + required service wrapper + additive lower
  wrappers

That asymmetry is intentional and should not be “normalized away.”

### 9. The current grouped service declaration stays as-is in this migration

This implementation does not reopen the grouped service declaration shape.

`defineService<{ initialContext, invocationContext, metadata }>(...)` remains
the declaration posture during this change.

## Current State vs Target

### Current state

- [`packages/example-todo/src/orpc/base.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/base.ts)
  auto-attaches framework baseline observability only
- [`packages/example-todo/src/orpc/factory/service.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/factory/service.ts)
  accepts `baseline.observability` and `baseline.analytics`
- [`packages/example-todo/src/orpc/factory/service.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/factory/service.ts)
  builds and auto-attaches service telemetry internally inside
  `createServiceImplementer(contract)`
- [`packages/example-todo/src/service/base.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/base.ts)
  still contains service runtime observability logic
- [`packages/example-todo/src/service/impl.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/impl.ts)
  still calls `createServiceImplementer(contract)` with no required telemetry

### Target state

- SDK baseline observability and analytics are both attached below the service
  seam
- `defineService(...)` keeps only declarative baseline information
- `createServiceImplementer(contract, { observability, analytics })` is the
  runtime enforcement seam
- service-wide telemetry behavior lives in:
  - `src/service/middleware/observability.ts`
  - `src/service/middleware/analytics.ts`
- lower-scope additive telemetry remains authored with the existing additive
  service builders

## Target SDK Surface

The implementation must converge on the following shape.

### `defineService(...)`

Target options:

```ts
defineService<{
  initialContext: ...;
  invocationContext: ...;
  metadata: ...;
}>({
  metadataDefaults: { ... },
  baseline: {
    policy: { ... },
  },
});
```

`defineService(...)` no longer accepts:

- `baseline.observability`
- `baseline.analytics`

### `DefinedService`

The defined service should expose:

- `oc`
- `createMiddleware`
- `createProvider`
- `createObservabilityMiddleware` for additive module/procedure observability
- `createAnalyticsMiddleware` for additive module/procedure analytics
- `createRequiredObservabilityMiddleware` for required service-wide
  observability
- `createRequiredAnalyticsMiddleware` for required service-wide analytics
- `createImplementer(contract, { observability, analytics })`

The required service-wide builders and additive lower-scope builders must remain
distinct on purpose.

### Required middleware slots are distinct typed values

The required telemetry slots at `createServiceImplementer(...)` must not accept
plain middleware values.

Implementation rule:

- `createRequiredObservabilityMiddleware(...)` and
  `createRequiredAnalyticsMiddleware(...)` return distinct branded required
  middleware values or wrapper objects
- additive `createServiceObservabilityMiddleware(...)` and
  `createServiceAnalyticsMiddleware(...)` remain plain additive middleware and
  are **not** assignable to the required slots

This distinction is mandatory so callers cannot satisfy the required
`observability` / `analytics` slots with additive middleware by accident.

### Required telemetry context boundary

Required service telemetry builders are bound to the base service context only.

They:

- are not generic over extra required context
- can depend on `deps`, `scope`, `config`, `invocation`, metadata, and policy
- must not depend on `provided.*`

This is a hard typing rule and must be enforced with compile-time tests.

### `createServiceImplementer(...)`

Target call shape in `src/service/impl.ts`:

```ts
export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(sqlProvider)
  .use(readOnlyMode);
```

### Attachment order

SDK-owned canonical order:

1. SDK baseline observability middleware
2. SDK baseline analytics middleware
3. required service observability middleware
4. required service analytics middleware
5. explicit service-wide providers and guards
6. explicit optional extra service-wide middleware
7. module setup and lower-level additive middleware

This order is not configurable at the service call site.

## Implementation Slices

Each slice should end with a green tree for the tests relevant to that slice.

### Slice 1: Rebuild analytics around SDK baseline emission without changing the implementer signature

#### Goal

Move analytics to the target split with minimal semantic churn:

- framework baseline analytics emitter in the SDK
- required service analytics at the implementer seam
- additive module/procedure analytics unchanged in purpose
- no `createServiceImplementer(...)` signature change yet

#### Exit state

At the end of Slice 1:

- the SDK owns baseline analytics emission
- a distinct required service analytics builder exists
- `service/base.ts` no longer contains analytics configuration
- `service/middleware/analytics.ts` exists and exports `analytics`
- `service/impl.ts` attaches `analytics` explicitly as the only allowed
  temporary attachment step
- `createServiceImplementer(contract)` still uses the old signature
- service observability remains on the old path for one more slice

This is the only allowed hybrid state.

#### Mechanical changes

1. In [`packages/example-todo/src/orpc/middleware/analytics.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/middleware/analytics.ts):
   - extract the canonical emitter into `createBaseAnalyticsMiddleware()`
   - make that emitter derive generic fields from procedure metadata/path/outcome
   - keep the contributor-carrier mechanism as the shared internal primitive
   - implement `createRequiredServiceAnalyticsMiddleware(...)` as a service-wide
     contributor middleware
   - keep `createServiceAnalyticsMiddleware(...)` as the additive lower-scope
     contributor builder
   - preserve deterministic merge precedence:
     - framework baseline fields first
     - required service analytics payload second
     - additive module/procedure payload last
   - add a regression test for collision precedence so lower-scope additive
     contributors continue to win on key collisions, matching current behavior

2. In [`packages/example-todo/src/orpc/base.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/base.ts):
   - attach `createBaseAnalyticsMiddleware()` alongside baseline observability
     inside the base implementer path

3. In [`packages/example-todo/src/orpc/factory/service.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/factory/service.ts):
   - introduce the new required analytics builder on the defined service
   - keep `createServiceImplementer(contract)` unchanged in this slice
   - stop building service analytics from `baseline.analytics`

4. In [`packages/example-todo/src/service/base.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/base.ts):
   - remove analytics config from the service definition
   - export the bound required analytics builder

5. Add [`packages/example-todo/src/service/middleware/analytics.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/middleware/analytics.ts):
   - export `analytics`
   - author it with the new required analytics builder
   - keep it service-wide and runtime-only

6. Update [`packages/example-todo/src/service/impl.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/impl.ts):
   - import `analytics` from `src/service/middleware/analytics.ts`
   - attach `.use(analytics)` explicitly after `createServiceImplementer(contract)`
   - treat this explicit analytics attachment as temporary and remove it in
     Slice 2 when the required telemetry object becomes the enforcement seam

#### Acceptance criteria

- the canonical analytics event still emits exactly once
- service-wide analytics can enrich that event without creating a second emitter
- module/procedure additive analytics continue to contribute payload fields
- baseline analytics deps remain SDK-owned
- the `createServiceImplementer(contract)` signature is unchanged at this stage
- service-wide analytics enrichment remains active through the temporary
  explicit attachment in `impl.ts`

#### Verification for Slice 1

- `bun run --cwd packages/example-todo typecheck`
- `bunx vitest run --project example-todo packages/example-todo/test/observability.test.ts`
- `bunx vitest run --project example-todo packages/example-todo/test/todo-service.test.ts`

### Slice 2: Move observability out of the declarative seam and flip implementer enforcement

#### Goal

Move service-wide observability behavior out of `service/base.ts` while
preserving current lifecycle coverage and policy-aware behavior.

#### Mechanical changes

1. In [`packages/example-todo/src/orpc/middleware/observability.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/middleware/observability.ts):
   - keep `createBaseObservabilityMiddleware()` as the framework wrapper
   - add `createRequiredServiceObservabilityMiddleware(...)` for required
     service-wide wrapper behavior
   - keep `createServiceObservabilityMiddleware(...)` as additive lower-scope
     middleware
   - make the required builder return a distinct branded required middleware
     value or wrapper object, not a plain additive middleware value
   - ensure the required service builder supports the full current service-wide
     behavior set:
     - service-level attributes
     - structured log enrichment
     - one service logger event per call (`todo.procedure`-style stream)
     - started event fields
     - succeeded event fields
     - failed event fields
     - policy-aware failure hooks

2. In [`packages/example-todo/src/orpc/factory/service.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc/factory/service.ts):
   - add the bound required observability builder
   - keep the bound required analytics builder branded as a required middleware
     value
   - finalize `createServiceImplementer(contract, { observability, analytics })`
     as the only signature
   - auto-attach required observability and analytics in SDK-owned order
   - require those slots to accept only the branded required middleware values,
     not additive middleware
   - keep required telemetry bound to base service context only; the builders are
     not generic over extra required context and must reject `provided.*`
     dependencies

3. In [`packages/example-todo/src/service/base.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/base.ts):
   - remove observability config from the service definition
   - lift policy vocabulary into a named exported constant so service
     observability middleware can import it directly
   - export the bound required observability builder

4. Add [`packages/example-todo/src/service/middleware/observability.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/middleware/observability.ts):
   - export `observability`
   - author it with the new required observability builder
   - port the existing service runtime hooks from `service/base.ts`
   - consume exported policy vocabulary from `service/base.ts`

5. Update [`packages/example-todo/src/service/impl.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/impl.ts):
   - pass both required telemetry middleware
   - keep `sqlProvider` and `readOnlyMode` as explicit `.use(...)` calls after
     required telemetry
   - remove the temporary explicit `.use(analytics)` from Slice 1

#### Acceptance criteria

- service-wide observability no longer lives in `service/base.ts`
- service-wide observability still sees read-only failures and policy events
- service-wide observability still emits one service logger event per call
- module/procedure additive observability remains additive-only
- SDK-owned ordering preserves both framework and service telemetry coverage
- `createServiceImplementer(...)` now rejects missing required telemetry
- additive telemetry middleware is not assignable to the required slots
- required service telemetry builders cannot depend on `provided.*`

#### Verification for Slice 2

- `bun run --cwd packages/example-todo typecheck`
- `bunx vitest run --project example-todo packages/example-todo/test/context-typing.ts`
- `bunx vitest run --project example-todo packages/example-todo/test/observability.test.ts`
- `bunx vitest run --project example-todo packages/example-todo/test/provider-middleware.test.ts`
- `bunx vitest run --project example-todo packages/example-todo/test/todo-service.test.ts`

### Slice 3: Surface hardening, migration cleanup, docs, and regression enforcement

#### Goal

Finish the declarative vs runtime split in the public seam, clean up the old
telemetry profile path, and align the docs/comments with the implemented
architecture.

#### Mechanical changes

1. Narrow `defineService(...)` options so `baseline` contains only `policy`.
2. Migrate ad hoc/test-only service definitions off the old telemetry profile
   path:
   - update test-local services to build required telemetry with
     `service.createRequiredObservabilityMiddleware(...)` and
     `service.createRequiredAnalyticsMiddleware(...)`
   - update test implementer assembly to pass `{ observability, analytics }`
3. Remove:
   - `defineServiceObservabilityProfile`
   - `defineServiceAnalyticsProfile`
   - `ServiceObservabilityProfile`
   - `ServiceAnalyticsProfile`
   from the primary public seam and from package usage.
4. Remove service baseline telemetry types that only existed to support the old
   `defineService(...).baseline` path.
5. Keep additive middleware input types if still needed for lower-scope
   builders.
6. Update [`packages/example-todo/src/orpc-sdk.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/orpc-sdk.ts)
   so the public seam matches the new architecture exactly.
7. Update [`packages/example-todo/test/context-typing.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/test/context-typing.ts):
   - `defineService(...)` should reject `baseline.observability`
   - `defineService(...)` should reject `baseline.analytics`
   - `createServiceImplementer(contract)` without required telemetry should be a
     type error
   - `createServiceImplementer(contract, { observability, analytics })` should
     typecheck
   - required telemetry slots should reject additive middleware values
   - required telemetry builders should see `context.deps.logger` and
     `context.deps.analytics` without the service restating baseline deps
   - required telemetry builders should still preserve service-specific deps
     such as `dbPool`
   - required telemetry builders should reject dependencies on `provided.*`
   - additive observability/analytics builders should preserve their current
     constraints

8. Update [`packages/example-todo/test/observability.test.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/test/observability.test.ts):
   - reflect the new implementer signature
   - verify framework + service + additive observability behavior still appears
   - verify analytics still emits once and service/module/procedure enrichment
     is merged correctly
   - verify policy-aware service observability still works
   - verify the service log stream still exists distinctly from the framework
     log stream

9. Update [`packages/example-todo/test/provider-middleware.test.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/test/provider-middleware.test.ts):
   - reflect the new implementer signature
   - keep provider-lane protections intact

10. Update [`packages/example-todo/test/todo-service.test.ts`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/test/todo-service.test.ts):
   - keep the no-active-span and read-only-failure telemetry assertions through
     the real client path

11. Extend the existing test files above so they explicitly prove:
   - baseline deps remain SDK-owned
   - service telemetry is impossible to forget at implementer assembly
   - analytics keeps one canonical emission path

12. Update agent-facing code comments and local READMEs:
   - [`packages/example-todo/src/service/shared/README.md`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/packages/example-todo/src/service/shared/README.md)
   - stale `@remarks` / `@agents` in `service/base.ts`, `service/impl.ts`,
     service telemetry middleware files, and related SDK files

13. Update active docs packet:
   - [`DECISIONS.md`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/docs/projects/orpc-ingest-domain-packages/DECISIONS.md)
   - [`guidance.md`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/docs/projects/orpc-ingest-domain-packages/guidance.md)
   - [`examples.md`](/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-example-todo-unified-golden/docs/projects/orpc-ingest-domain-packages/examples.md)

#### Acceptance criteria

- `service/base.ts` no longer offers telemetry config surfaces
- the public SDK seam does not advertise superseded profile helpers
- service code uses runtime telemetry middleware files instead of declarative
  telemetry profile objects
- compile-time tests enforce the required telemetry seam and boundary
  restrictions
- active docs packet matches the code

#### Enforcement posture

Prefer:

- compile-time tests
- runtime behavior tests
- SDK signature constraints

Do not add lint rules for things the type surface can already forbid.

#### Verification for Slice 3

- `bun run --cwd packages/example-todo typecheck`
- `bunx vitest run --project example-todo`
- `bun run --cwd packages/example-todo build`
- `bun run --cwd packages/hq-sdk typecheck`
- `rg -n \"baseline observability|baseline analytics|service-wide baseline|createServiceImplementer\\(contract\\)\" docs/projects/orpc-ingest-domain-packages packages/example-todo/src packages/example-todo/test -g '!dist'`

## Validation Matrix

Run these checks during implementation, not just at the end.

The final grep remains a cleanup check only; it is not the primary enforcement
mechanism.

## Appendix: Safe Parallelism During Implementation

This implementation should use a small, explicit agent team with disjoint
ownership.

### Orchestrator responsibilities

The main rollout should own the critical-path seam work:

- SDK API changes in `orpc/factory/service.ts`
- implementer signature changes
- attachment order changes
- final integration decisions when slices touch each other

Do not hand off the core type seam blindly; that is the highest-risk area.

### Agent roles

#### Agent 1: SDK telemetry split reviewer/worker

Scope:

- `src/orpc/middleware/analytics.ts`
- `src/orpc/middleware/observability.ts`
- `src/orpc/base.ts`

Focus:

- baseline vs service split mechanics
- dependency ownership preservation
- canonical emission / wrapper behavior

#### Agent 2: service migration worker

Scope:

- `src/service/base.ts`
- `src/service/impl.ts`
- `src/service/middleware/*`

Focus:

- move runtime telemetry out of `base.ts`
- wire required telemetry at implementer seam
- preserve service/package readability

#### Agent 3: tests + docs + comment discipline worker

Scope:

- `test/*`
- `docs/projects/orpc-ingest-domain-packages/*`
- nearby READMEs and `@remarks` / `@agents` updates

Focus:

- hard-boundary enforcement
- docs/code alignment
- agent readability

### Collaboration order

1. Slice 1 should stay mostly local to the orchestrator because it defines the
   analytics split mechanics.
2. After Slice 1 is green, Agent 3 can start the corresponding test updates
   that do not depend on the observability cutover.
3. Slice 2 should stay orchestrator-owned until the required telemetry seam and
   branded types are stable.
4. Once Slice 2 is green, Agent 2 can help with service file cleanup while
   Agent 3 updates tests/comments/docs in parallel on disjoint files.
5. Slice 3 is the safe window for broader parallel cleanup and docs alignment.

Do not run parallel agents against the same write surface.

### Agent output expectations

Each agent should return:

- what changed
- what assumptions they made
- what risks remain in their slice

If an agent discovers a real design mismatch instead of an implementation bug,
they should stop and surface it rather than improvising a new architecture.

## Final Exit Criteria

The work is complete when all of the following are true:

1. `service/base.ts` is declarative-only and no longer hosts telemetry config.
2. SDK baseline observability and analytics are both SDK-owned and attached
   below the service seam.
3. `createServiceImplementer(...)` requires service `observability` and
   `analytics` and auto-attaches them in canonical order.
4. Service telemetry lives in `src/service/middleware/observability.ts` and
   `src/service/middleware/analytics.ts`.
5. Baseline deps remain SDK-owned.
6. Additive module/procedure telemetry still works.
7. The active docs packet matches the code.
8. The full validation matrix is green.
9. Required telemetry slots reject additive middleware and reject dependencies on
   `provided.*`.
