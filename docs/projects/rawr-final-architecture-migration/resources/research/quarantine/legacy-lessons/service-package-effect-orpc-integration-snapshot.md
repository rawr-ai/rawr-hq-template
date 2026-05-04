# Service Package Effect/oRPC Integration Snapshot

Status: reference snapshot / golden integration example / not runtime boundary
authority.
Source: copied from
`/Users/mateicanavra/Downloads/RAWR_Service_Package_Effect_Spec.md` on
2026-05-01.

## Authority Note

Use this document as a strong reference for service-package internals and for
the integration pattern where RAWR makes oRPC and Effect feel native while
owning the seams that matter: lifecycle, runtime ownership, import law,
diagnostics, observability, and deterministic execution.

This document is strongest for:

- service-package topology and internal file responsibilities;
- native oRPC contract/router/middleware/context authoring posture;
- native Effect authoring posture inside service internals;
- repository, middleware, context, and provided-context rules;
- service error and semantic observability posture;
- author/agent DX principles around familiar TypeScript, oRPC, and Effect
  idioms.

This document is provenance-only for:

- older handler/effect terminal split language. The current runtime-realization
  spec supersedes that detail.

This document is not authoritative over:

- runtime boundary definitions;
- runtime lifecycle or process-runtime ownership;
- public runtime SDK names;
- provider acquisition/finalization;
- adapter lowering, host mounting, harness handoff, or import law;
- proof categories or migration readiness.

When this document conflicts with the manifest-pinned runtime-realization spec,
the runtime-realization spec wins. When a workstream uses this document to
shape a future vendor integration, it must extract principles explicitly and
then re-validate them against that vendor's official docs, installed-package
behavior, and RAWR-owned runtime boundaries.

## Golden Integration Pattern

The reusable pattern is not "copy the oRPC service-package design." The pattern
is:

1. Let the vendor feel native at the author-facing surface.
2. Keep RAWR ownership at lifecycle, runtime, context, import, telemetry,
   diagnostics, and policy seams.
3. Separate excellent author DX from under-the-hood operational reality.
4. Avoid custom RAWR mini-languages when a vendor already has a strong native
   grammar.
5. Promote no integration claim until the runtime authority, vendor docs,
   installed behavior, and contained proof gate all agree on the exact claim.

Future Inngest, telemetry, and other vendor-integration workstreams should mine
this as a model for how to ask the right questions: what should feel native to
authors, what must be owned by RAWR at runtime, where the vendor should remain
vendor-shaped, and where a lab proof stops.

Known stale detail to reject:

- This snapshot discusses an older two-terminal `.handler(...)` / `.effect(...)`
  model. The current runtime-realization spec makes RAWR `.effect(...)` the
  canonical execution terminal and rejects public `.handler(...)` / Promise
  branches for runtime-realization service/plugin authoring. Preserve the
  native-fit integration principle; do not preserve the stale terminal split as
  law.

Required reconciliation whenever this exemplar is used:

| Field | Requirement |
| --- | --- |
| Authority label | `reference-only`, `normative after DRA acceptance`, or `superseded detail`. |
| Principle extracted | Name the reusable integration principle before applying it elsewhere. |
| Runtime-spec conflict check | Compare against the manifest-pinned runtime-realization spec. |
| Stale details rejected | Name any snapshot detail that must not carry forward. |
| Vendor evidence | Pair with official-docs and installed-behavior evidence where vendor behavior matters. |
| Proof ceiling | State whether the result can be `vendor-proof`, `simulation-proof`, or neither. |

---

# RAWR Service Package / Effect × oRPC Design Snapshot

Status: Investigation snapshot, not final canonical specification  
Created: 2026-04-28  
Purpose: Preserve the current best service-package proposal and decision record as input for the next session, where it will be reconciled against the updated authoritative Runtime Realization System specification.

---

## 0. How to use this snapshot

This document captures the service-package design proposal that emerged from the Runtime Realization System review, the Todo/HQ SDK/ORPC ingest investigation, and the follow-up design-question resolution.

It should be treated as:

```text
Authoritative snapshot of the current service-package proposal.
Not authoritative over runtime boundaries.
Not the final service-package canonical specification.
```

The next session should compare this document against the updated Runtime Realization System. Where that updated runtime spec speaks about runtime lifecycle, runtime-owned interfaces, process execution, provider acquisition, binding, compilation, diagnostics, import law, adapter lowering, harnesses, and runtime-owned authoring surfaces, it supersedes this document.

This snapshot should remain strongest for:

```text
service package topology
service-internal file responsibilities
native oRPC authoring posture
native Effect authoring posture at service internals
handler/effect terminal rules
repository return rules
middleware/context/provided rules
service error posture
service semantic observability and analytics posture
agent/LLM authoring DX constraints
migration from the existing Todo/HQ service package philosophy
```

---

## 1. Source provenance

Primary sources considered in the investigation:

1. Runtime Realization System document. Canonical for runtime lifecycle, runtime ownership, runtime/substrate interfaces, provider/runtime realization, process runtime, execution bridge, diagnostics, telemetry, import safety, and finalization.
2. Runtime Effect-Native Execution Layer addendum. Useful bridge document for Effect execution grammar, but subordinate to the Runtime Realization System where runtime boundaries overlap.
3. Golden Todo service package. Canonical evidence for the existing service-package philosophy, especially topology, oRPC-native composition, context flow, repository/middleware flow, and caller-facing service package shape.
4. HQ SDK. Canonical evidence for the current service authoring helpers, implementer composition, context lanes, package client shape, provider middleware style, and pre-Effect design assumptions.
5. ORPC Ingest Domain Packages. Canonical intent record for package shape, middleware seams, service context semantics, adapter posture, telemetry split, and why the Todo/HQ package is shaped the way it is.
6. oRPC documentation. Source of truth for native contract-first implementation, implementer/router shape, middleware, context, and callable contract semantics.
7. Effect documentation. Source of truth for native Effect concepts: `Effect`, `Runtime`, `Layer`, `Scope`, fibers, retry/timeout/concurrency, error channel, and lazy execution.
8. effect-orpc GitHub repository/documentation. Source of evidence that `.effect(...)` and oRPC contract leaves can be combined, but also evidence that raw effect-orpc wants a managed runtime and must therefore remain SDK/runtime-internal under RAWR.

Practical source hierarchy for the next session:

```text
1. Updated Runtime Realization System
   Canonical for runtime boundaries, lifecycle, process runtime, execution bridge,
   public runtime-facing SDK names, import law, compiled plans, and diagnostics.

2. This service-package snapshot
   Canonical proposal for service package internals, native oRPC × Effect fit,
   service module topology, repositories, middleware, context projection,
   errors, telemetry/analytics split, and authoring DX.

3. Golden Todo service package + HQ SDK
   Canonical for existing ORPC service package philosophy and migration constraints.

4. ORPC Ingest Domain Packages
   Intent/rationale layer for why the current service shape exists.

5. External oRPC / Effect / effect-orpc docs
   Native-technology source of truth, used to avoid custom DSL drift.
```

---

## 2. Sharper investigation objective

The original task is best reframed as:

```text
Determine whether the Runtime Realization System can be reduced to a pure
runtime/substrate contract by extracting service-package internals into a
companion Service Package / Service Capability Specification, while preserving
the existing oRPC service-package philosophy and adding Effect as a controlled
execution terminal.

For every difference between the Runtime doc, Todo package, HQ SDK, ORPC ingest
guidance, Effect docs, and effect-orpc, classify it as:

  runtime boundary contract
  service-package rule
  intentional Effect migration
  accidental drift
  problematic regression
  unresolved implementation proof point
```

The answer from the investigation was:

```text
Yes, there is a clean boundary.
Yes, the service-package spec can be authored with high confidence.
No, the Runtime Realization System should not keep normative service-internal
implementation detail once the companion service spec exists.
```

---

## 3. Design philosophy: native fit inside each boundary

The guiding principle is:

```text
Use native idioms inside each boundary.
Use RAWR constraints only at ownership/lifecycle seams.
```

That means:

```text
oRPC boundary:
  contract / implementer / middleware / context / .handler / .use / .router

Effect execution boundary:
  generator effects / fail / tryPromise / all / retry / timeout / typed errors

RAWR boundary:
  service ownership, resource/provider ownership, runtime lifecycle,
  process runtime, import law, descriptor derivation, service binding,
  provider selection, diagnostics, telemetry correlation
```

The system should minimize custom DSL surface area because LLMs and agents can author better when the patterns resemble statistically familiar TypeScript, oRPC, and Effect idioms. RAWR should constrain the places where unconstrained native behavior would break ownership, lifecycle, observability, or runtime determinism.

Useful rule:

```text
Do not teach a custom RAWR mini-language where a native technology already has
a clear idiom. Wrap the import surface and ownership seams instead.
```

This matters most for Effect. Effect should feel like Effect in service-internal local execution, but services must not own raw Effect runtime construction.

---

## 4. Boundary model: Runtime spec vs Service Package spec

The clean separation is:

```text
Runtime Realization System owns:
  normalized graph consumption
  service binding plans
  service binding cache
  compiled execution plans
  process runtime
  ProcessExecutionRuntime
  EffectRuntimeAccess
  ManagedRuntimeHandle
  adapter lowering
  harness handoff
  runtime diagnostics
  runtime telemetry correlation
  deterministic finalization

Service Package Specification owns:
  service package topology
  public/private exports
  base / impl / contract / router / module responsibilities
  oRPC contract authoring
  service middleware
  module middleware
  context lane projection
  provided-context middleware
  repositories
  handler/effect authoring rules
  service semantic errors
  service semantic observability
  service analytics contribution
  package tests and service gates
```

The mirrored handoff should be:

```text
Service package produces:
  ServiceDefinition
  service contract
  service router / implementation descriptors
  dependency declarations
  runtime-carried lane schemas
  service binding plan inputs
  execution descriptors

Runtime consumes:
  normalized service facts
  service binding plan inputs
  execution descriptors
  dependency declarations
  runtime-carried lane schemas

Runtime produces:
  bound service clients
  execution results
  diagnostics
  runtime telemetry correlation
```

Runtime should not normatively specify:

```text
module repository implementation details
module middleware implementation examples
read-only service middleware logic
service analytics implementation details
service module collaboration examples
concrete service router bodies
```

Those belong in the companion service package specification.

---

## 5. Load-bearing service-package thesis

Canonical thesis for the service package spec:

```text
Services own truth.
oRPC owns callable contracts.
Effect owns local execution mechanics.
RAWR owns the service/runtime boundary.
```

Equivalent practical law:

```text
One service species.
One generated topology.
One contract-first oRPC implementation tree.
Two terminal execution modes.
One runtime owner.
```

Effect does not create a new species:

```text
No EffectService.
No EffectRepository species.
No EffectPlugin species.
No effect-orpc-authored service package.
```

There are normal service packages whose procedures can terminate in either `.handler(...)` or `.effect(...)`.

---

## 6. Decision record

### Decision 1 — Service declaration API

Decision:

```text
Final service declarations should use the Runtime-shaped concrete object API:
  id
  deps
  scope
  config
  invocation
  metadataDefaults
  baseline/policy vocabulary

The old HQ generic initialContext/invocationContext/metadata API becomes
migration history or a compatibility layer, not the final canonical shape.
```

Canonical shape:

```ts
export const service = defineService({
  id: "work-items",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    clock: resourceDep(ClockResource),
    logger: resourceDep(LoggerResource),
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,

  metadataDefaults: {
    idempotent: true,
    domain: "work-items",
    audience: "internal",
    audit: "basic",
  },

  baseline: {
    policy: {
      events: {
        readOnlyRejected: "work-items.policy.read_only_rejected",
      },
    },
  },
});
```

Rationale:

```text
The Runtime Realization world needs concrete derivation artifacts.
The old generic-only shape does not give the runtime enough durable facts for
resource dependencies, service dependencies, service binding plans, cache keys,
config decoding, runtime-carried schemas, or diagnostics.
```

Native-fit compromise:

```text
Service authors declare RAWR service lanes.
The SDK lowers them into native oRPC Initial Context and Execution Context.
```

---

### Decision 2 — Effect authoring surface

Current best proposal:

```text
Use native-shaped Effect authoring through a RAWR-owned import surface.
```

Preferred public import:

```ts
import { Effect, TaggedError, type RawrEffect } from "@rawr/sdk/effect";
```

Not:

```ts
import { Effect } from "effect";
import { ManagedRuntime } from "effect";
import { makeEffectORPC } from "effect-orpc";
```

The RAWR-owned facade should mirror native Effect names where allowed:

```ts
Effect.succeed
Effect.fail
Effect.gen
Effect.tryPromise
Effect.all
Effect.timeout
Effect.retry
Effect.mapError
Effect.catchTag
Effect.catchTags
Effect.orElse
Effect.match
Effect.withSpan
Effect.interruptible
```

It should not expose runtime/lifecycle authority:

```text
ManagedRuntime
Runtime.run*
Layer.launch
Context.Tag
Scope construction
raw Queue / PubSub / Fiber / Stream / Schedule constructors
unsafe daemon/fork constructors
```

Important reconciliation note:

```text
Some current Runtime/Effect documents use `fx` as the public facade.
This snapshot proposes `Effect` as the final canonical service authoring spelling
because it is more native-shaped for agents and TypeScript authors.

If the incoming authoritative Runtime spec locks `fx`, the service spec should
obey that runtime-facing public name. But the service-package design rationale
remains: the facade should mirror native Effect semantics as closely as possible.
```

If `fx` remains canonical, then the spec should at least preserve native naming internally:

```ts
fx.succeed
fx.fail
fx.gen
fx.tryPromise
fx.all
fx.retry
fx.timeout
fx.mapError
fx.catchTag
fx.catchTags
```

---

### Decision 3 — Generator-native `.effect(...)` terminal

Decision:

```text
Procedure `.effect(...)` should support generator-native authoring.
```

Preferred final service body:

```ts
export const router = module.router({
  create: module.create.effect(function* ({ input, context, errors }) {
    if (input.title.trim().length === 0) {
      return yield* Effect.fail(
        errors.INVALID_WORK_ITEM_TITLE({
          data: { title: input.title },
        }),
      );
    }

    return yield* context.repo.insert({
      workspaceId: context.workspaceId,
      title: input.title.trim(),
      createdAt: context.clock.nowIso(),
    });
  }),
});
```

Less preferred but acceptable if required by SDK mechanics:

```ts
export const router = module.router({
  create: module.create.effect(({ input, context, errors }) =>
    Effect.gen(function* () {
      if (input.title.trim().length === 0) {
        return yield* Effect.fail(
          errors.INVALID_WORK_ITEM_TITLE({
            data: { title: input.title },
          }),
        );
      }

      return yield* context.repo.insert({
        workspaceId: context.workspaceId,
        title: input.title.trim(),
        createdAt: context.clock.nowIso(),
      });
    }),
  ),
});
```

Rationale:

```text
If the terminal itself is already an Effect terminal, forcing every body to
manually wrap in Effect.gen/fx.gen adds syntax noise and reduces native fit.
The SDK can still derive an EffectExecutionDescriptor from either spelling.
```

Implementation proof point:

```text
Prove generator-native .effect(function*) preserves oRPC contract inference,
middleware context inference, typed errors, and RawrEffect success/error inference.
```

---

### Decision 4 — Handler/effect split

Decision:

```text
Keep `.handler(...)` and `.effect(...)` as explicit terminal branches.
Do not force Effect everywhere.
Do not allow ambiguous procedure implementation outside those branches.
```

Use `.handler(...)` for:

```text
pure business transformations
small Promise wrappers
simple projection glue
tests/fakes
route wrappers with no local execution composition
```

Use `.effect(...)` for:

```text
repository IO
multi-step local orchestration
typed internal errors
retry/timeout/concurrency
service-to-service Effect composition
resource operations returning RawrEffect
anything where cancellation/finalization matters
```

Generator/default posture:

```text
Generated service modules with repositories should default to `.effect(...)`.
Generated public API/plugin wrappers may use `.handler(...)` when they simply
translate input/output and call `client.promise`.
```

Rationale:

```text
The split prevents downstream ad hoc reinvention of Effect basics while avoiding
unnecessary overhead for trivial TS handlers.
```

Rejected alternatives:

```text
Effect everywhere:
  simpler globally, but worse for plain projection glue and higher ceremony.

Free-form Promise or Effect return from one terminal:
  easier initially, but destroys downstream legibility and execution policy.
```

---

### Decision 5 — Handler context shape

Decision:

```text
Canonical lanes exist at the service boundary.
Module-local projection is allowed and recommended for handler ergonomics.
```

Boundary context:

```ts
context.deps
context.scope
context.config
context.invocation
context.provided
```

Module-local projected handler context:

```ts
export const module = impl.items
  .use(serviceObservability)
  .use(provideItemRepository)
  .use(async ({ context, next }) =>
    next({
      context: {
        clock: context.deps.clock,
        logger: context.deps.logger,
        workspaceId: context.scope.workspaceId,
        repo: context.provided.items.repo,
      },
    }),
  );
```

Then handler bodies can be clean:

```ts
const create = module.create.effect(function* ({ context, input, errors }) {
  const now = context.clock.nowIso();

  return yield* context.repo.insert({
    workspaceId: context.workspaceId,
    title: input.title,
    createdAt: now,
  });
});
```

Rules:

```text
Canonical lanes are stable boundary truth.
Module projection is handler ergonomics.
Projection may not overwrite reserved lane names.
Projection may not become a package boundary input.
Projection belongs in module.ts or module middleware, not router.ts.
```

Rationale:

```text
The golden Todo/HQ shape intentionally used module-local context projection.
A nested-only handler context would be accidental drift and worse DX.
```

---

### Decision 6 — `provided` carrier rule

Decision:

```text
The runtime/package boundary may initialize the empty `provided` carrier.
Only service middleware may add semantic `provided.*` values.
```

Allowed:

```ts
{
  deps,
  scope,
  config,
  invocation,
  provided: {},
}
```

Forbidden at runtime/package boundary:

```ts
{
  provided: {
    repo,
    actor,
    sql,
  },
}
```

Semantic values must be added through middleware:

```ts
export const provideItemRepository = createProvidedContextMiddleware(
  "work-items.items.repository",
  async ({ context, next }) => {
    return next({
      context: {
        provided: {
          ...context.provided,
          items: {
            repo: createWorkItemRepository({ dbPool: context.deps.dbPool }),
          },
        },
      },
    });
  },
);
```

Rationale:

```text
Current HQ SDK already seeds `provided: {}` and then lets middleware add values.
The stricter wording should prohibit seeded semantic values, not prohibit the
empty carrier.
```

---

### Decision 7 — Rename service provider middleware

Decision:

```text
Reserve `Provider` for runtime providers.
Rename service-side provider middleware to `provided-context middleware`.
```

Preferred public helper:

```ts
export const createProvidedContextMiddleware = service.createProvidedContextMiddleware;
```

Instead of:

```ts
createServiceProvider
```

Final terminology:

```text
RuntimeProvider:
  Implements RuntimeResource acquisition/release.

provided-context middleware:
  Adds service execution values under context.provided.*.
```

Rationale:

```text
The service-side use of “provider” collides with RuntimeProvider, providerFx,
provider selection, provider acquisition, provider coverage, and provider
release. This will confuse agents and humans.
```

---

### Decision 8 — Repository return rule

Decision:

```text
Service-internal repositories that perform IO should return RawrEffect in final
canonical packages.
Promise-returning repositories are migration-only.
```

Canonical repository:

```ts
import { Effect, TaggedError, type RawrEffect } from "@rawr/sdk/effect";

export class TaskRepositoryError extends TaggedError("TaskRepositoryError")<{
  readonly cause: unknown;
}> {}

export interface TaskRepository {
  insert(input: InsertTaskInput): RawrEffect<Task, TaskRepositoryError>;
  findById(input: FindTaskInput): RawrEffect<Task | null, TaskRepositoryError>;
}

export function createTaskRepository(input: {
  sql: Sql;
  workspaceId: string;
}): TaskRepository {
  return {
    insert(task) {
      return Effect.tryPromise({
        try: () => input.sql.queryOne<Task>(/* ... */),
        catch: (cause) => new TaskRepositoryError({ cause }),
      });
    },

    findById(payload) {
      return Effect.tryPromise({
        try: () => input.sql.queryOne<Task>(/* ... */),
        catch: (cause) => new TaskRepositoryError({ cause }),
      });
    },
  };
}
```

Rejected:

```text
Dual Promise/Effect repository facades as a permanent standard.
```

Rationale:

```text
Repositories are the primary site of local IO. Keeping them Promise-based while
adding Effect procedures forces repeated Promise-to-Effect wrapping, weakens
error-channel discipline, and encourages agents to reinvent execution policy in
Promise code.
```

Migration carveout:

```text
Legacy Promise repositories can remain under `.handler(...)` during migration,
but new IO repositories should be RawrEffect-returning.
```

---

### Decision 9 — Read-only policy stays middleware

Decision:

```text
Read-only mode and comparable global service policies stay service middleware,
driven by metadata. Do not duplicate read-only checks inside every handler.
```

Problematic pattern:

```ts
create: module.create.effect(function* ({ context, errors }) {
  if (context.config.readOnly) {
    return yield* Effect.fail(errors.READ_ONLY_MODE());
  }

  // ...
});
```

Canonical posture:

```text
Procedure metadata says whether the procedure is mutating.
Service read-only middleware enforces the policy.
Handlers may only add procedure-local policy not covered by middleware.
```

Rationale:

```text
The Todo/HQ service philosophy centralized read-only policy in middleware.
Inlining checks in examples is a regression because it duplicates global policy
and creates inconsistent enforcement.
```

---

### Decision 10 — Error bridge

Decision:

```text
Keep oRPC contract errors as the caller boundary source of truth.
Map Effect failure-channel values into that same oRPC boundary.
Unexpected internals become diagnostics/internal boundary failures unless
explicitly mapped to declared contract errors.
```

Contract:

```ts
export const contract = {
  get: ocBase
    .input(GetTaskInputSchema)
    .output(TaskSchema)
    .errors({
      RESOURCE_NOT_FOUND,
    }),
};
```

Handler mode:

```ts
throw errors.RESOURCE_NOT_FOUND({
  data: { entity: "Task", id: input.id },
});
```

Effect mode:

```ts
return yield* Effect.fail(
  errors.RESOURCE_NOT_FOUND({
    data: { entity: "Task", id: input.id },
  }),
);
```

Repository/internal failure:

```ts
export class TaskRepositoryError extends TaggedError("TaskRepositoryError")<{
  readonly cause: unknown;
}> {}
```

Procedure mapping example:

```ts
const task = yield* context.repo.findById({ id: input.id });

if (!task) {
  return yield* Effect.fail(
    errors.RESOURCE_NOT_FOUND({
      data: { entity: "Task", id: input.id },
    }),
  );
}

return task;
```

Rule:

```text
Expected business states stay values until the procedure maps them into caller
contract errors.
Unexpected repository failures stay internal by default.
```

Required facade support:

```ts
Effect.mapError
Effect.catchTag
Effect.catchTags
Effect.orElse
Effect.match
```

---

### Decision 11 — Telemetry and analytics split

Decision:

```text
Runtime/host owns telemetry bootstrap and correlation.
Services own semantic observability enrichment.
Product analytics is explicit, not hidden universal BaseDeps.
```

Runtime/host owns:

```text
OpenTelemetry bootstrap
runtime lifecycle spans
provider/provisioning spans
execution descriptor spans
service binding spans
adapter/harness spans
runtime telemetry correlation
```

Service package owns:

```text
service-wide observability middleware
module/procedure semantic span attributes
domain-moment events
structured log enrichment
```

Analytics decision:

```text
Do not keep hidden universal `BaseDeps.analytics` as canonical.
If a service emits product analytics, declare an explicit analytics sink/resource.
```

Example:

```ts
export const service = defineService({
  id: "work-items",

  deps: {
    analytics: resourceDep(AnalyticsSinkResource),
  },

  // ...
});
```

Rationale:

```text
Runtime telemetry and product analytics have different owners and privacy/
meaning semantics. Collapsing them into a hidden base dependency creates
ambiguity and makes analytics emission look universal even when it is not.
```

---

### Decision 12 — effect-orpc posture

Decision:

```text
RAWR should mimic effect-orpc’s native authoring shape, but effect-orpc must not
own public service execution.
```

Rules:

```text
Service/plugin authors never import effect-orpc.
Service/plugin authors never receive ManagedRuntime.
RAWR SDK may use effect-orpc internally only if it preserves import safety,
descriptor derivation, ProcessExecutionRuntime ownership, EffectRuntimeAccess
ownership, runtime diagnostics, telemetry bridge, and finalization semantics.
```

Preferred implementation direction:

```text
Descriptor-first RAWR execution.

.service/.plugin .effect(function*) authoring
  -> RAWR SDK captures EffectExecutionDescriptor
  -> oRPC route/procedure wrapper remains contract-shaped
  -> invocation calls ProcessExecutionRuntime
  -> ProcessExecutionRuntime lowers/runs RawrEffect via EffectRuntimeAccess
```

Caution:

```text
Do not make direct `implementEffect(contract, runtime)` the core service authoring
engine unless a spike proves it can operate behind RAWR descriptor-first
execution without leaking ManagedRuntime or bypassing ProcessExecutionRuntime.
```

Implementation proof point:

```text
Prove descriptor-first oRPC integration preserves native oRPC router/client
behavior while routing `.effect(...)` execution through ProcessExecutionRuntime.
```

---

### Decision 13 — Service client API

Decision:

```text
Bound service clients expose explicit `.promise` and `.effect` facades.
No ambiguous default call shape inside RAWR execution contexts.
```

Canonical:

```ts
client.promise.tasks.get(input)
client.effect.tasks.get(input)
```

Rejected as canonical inside execution contexts:

```ts
client.tasks.get(input)
```

Usage:

```ts
// inside .handler(...)
const task = await context.deps.workItems.promise.tasks.get({ id });

// inside .effect(...)
const task = yield* context.deps.workItems.effect.tasks.get({ id });
```

Invocation refinement:

```text
Construction-bound service client:
  cached by deps/scope/config
  invocation not baked in
  requires invocation per call when used outside an execution context

Invocation-bound service client:
  created per procedure call as a cheap view over the cached binding
  auto-forwards current invocation inside service/plugin execution
```

Outside execution:

```ts
await client.promise.tasks.get(
  { id },
  { invocation: { traceId } },
);
```

Inside `.effect(...)`:

```ts
const task = yield* context.deps.workItems.effect.tasks.get({ id });
```

Rationale:

```text
The return type is operationally meaningful. A single ambiguous call shape makes
it unclear whether work is executing now or returning a lazy Effect value.
```

---

### Decision 14 — Execution policy defaults

Decision:

```text
Both handler and effect execute through ProcessExecutionRuntime.
Only Effect mode gets full local execution policy semantics.
No hidden retries by default.
Detached fibers are forbidden in authoring.
Durable retries belong to Inngest, not local Effect.
```

Default policy matrix:

```text
service.procedure:
  retry: none
  timeout: request default
  interruption: interrupt-on-request-close
  detachedFibers: forbidden

plugin.server-api:
  retry: none
  timeout: public request default
  interruption: interrupt-on-request-close
  detachedFibers: forbidden

plugin.server-internal:
  retry: explicit only
  timeout: internal request default
  interruption: interrupt-on-request-close
  detachedFibers: forbidden

plugin.async-step:
  retry: Inngest first
  local Effect retry: explicit transient only
  interruption: interrupt-on-step-cancel
  detachedFibers: forbidden

plugin.cli-command:
  retry: explicit only
  timeout: command policy
  interruption: interrupt-on-process-stop

plugin.agent-tool:
  retry: explicit only
  timeout: strict tool policy
  interruption: interrupt-on-request-close

plugin.desktop-background:
  retry: explicit only
  cadence: desktop-local
  interruption: interrupt-on-process-stop
  durable semantics: forbidden

provider.acquire:
  retry: provider policy / transient only
  timeout: provider policy
  interruption: complete-before-stop
  detachedFibers: runtime-owned-only
```

---

### Decision 15 — Migration from current HQ SDK

Migration path:

```text
1. Keep the service topology.
   Do not refactor the Todo package shape.

2. Rename package authority.
   @rawr/hq-sdk prototype concepts move into @rawr/sdk modules.

3. Replace generic defineService declaration.
   initialContext/invocationContext/metadata -> concrete id/deps/scope/config/invocation.

4. Introduce RuntimeSchema for runtime-carried lanes.
   scope/config/invocation become decodable runtime-carried schemas.

5. Replace raw host deps with resourceDep/serviceDep/semanticDep.
   dbPool, clock, logger, analytics become explicit resource or service dependencies.

6. Rename service provider middleware.
   createServiceProvider -> createProvidedContextMiddleware.

7. Add Effect facade.
   Prefer native-shaped Effect import from @rawr/sdk/effect.
   Keep fx only if runtime spec locks it or as compatibility alias.

8. Convert IO repositories.
   Promise-returning repositories -> RawrEffect-returning repositories.

9. Convert IO-backed handlers.
   module.foo.handler(async ...) -> module.foo.effect(function* ...).

10. Preserve middleware policy.
    Read-only stays middleware-driven from metadata.

11. Split telemetry and analytics.
    Runtime telemetry bootstrap moves runtime/host-side.
    Analytics becomes explicit resource/sink if needed.

12. Add descriptor/runtime tests.
    Prove .effect creates descriptors and only ProcessExecutionRuntime runs them.
```

---

## 7. Original service-package specification bones

This section preserves the proposed standalone service package spec outline.

### 7.1 Purpose and scope

The service package specification should define:

```text
service package topology
service ownership law
public/private exports
service declaration API
context lanes
provided-context middleware
central implementer pattern
module-local implementer pattern
contract/router separation
repository rules
handler/effect terminal rules
service client rules
error handling
telemetry and analytics
Effect/oRPC adapter posture
package gates
migration guidance
```

It should not define:

```text
runtime compiler
bootgraph
ProcessExecutionRuntime implementation
EffectRuntimeAccess implementation
ManagedRuntimeHandle construction
provider acquisition internals
surface adapter lowering
harness mounting
runtime catalog persistence
multi-process placement
```

---

### 7.2 Canonical topology

Every service uses the same generated topology, even when it has one module.

```text
services/<service>/
  src/
    index.ts
    client.ts
    router.ts
    service/
      base.ts
      impl.ts
      contract.ts
      router.ts
      middleware/
      shared/
      modules/
        <module>/
          schemas.ts
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
```

Why it does not collapse:

```text
Generate the scalable shape.
Let some files be thin.
Do not introduce alternate shapes.
```

This prevents:

```text
single-module flat service -> later refactor
one-file controller/service/repository collapse
contract/router/implementation blur
agent-generated alternate promotion paths
```

---

### 7.3 File responsibilities

Service root files:

| File | Responsibility | Forbidden |
| --- | --- | --- |
| `src/index.ts` | Public service package boundary exports | Repositories, migrations, private modules |
| `src/client.ts` | Package client creation / service package binding facade | Service implementation logic |
| `src/router.ts` | Thin public router alias | Procedure implementations |
| `src/service/base.ts` | Service identity, lanes, schemas, metadata, helpers | Runtime acquisition, provider selection |
| `src/service/impl.ts` | Central package-wide implementer and service-wide `.use(...)` chain | Root contract composition, procedure behavior |
| `src/service/contract.ts` | Root contract composition from modules | Handler/effect bodies |
| `src/service/router.ts` | Root router composition from modules | Module business logic |
| `src/service/middleware/*` | Service-wide middleware | Concrete provider acquisition |
| `src/service/shared/*` | Service-private shared errors/helpers | Public API projection |

Module files:

| File | Responsibility | Forbidden |
| --- | --- | --- |
| `schemas.ts` | Module data schemas and inferred types | Runtime config/provider selection |
| `contract.ts` | Module procedure contracts | Procedure implementation |
| `middleware.ts` | Module-specific middleware and provided values | Provider acquisition |
| `module.ts` | Module-local composition from `impl.<module>` and `.use(...)` chain | Root service composition |
| `repository.ts` | Service-internal persistence mechanics | Cross-service table writes |
| `router.ts` | Module procedure implementation using `.handler(...)` or `.effect(...)` | Sibling service internals, app membership |

---

### 7.4 Service base example

```ts
import {
  defineService,
  resourceDep,
  serviceDep,
  semanticDep,
  type ServiceOf,
} from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";

import { ClockResource } from "@rawr/resources/clock";
import { LoggerResource } from "@rawr/resources/logger";
import { SqlPoolResource } from "@rawr/resources/sql";

export const WorkItemsScopeSchema = RuntimeSchema.struct({
  workspaceId: RuntimeSchema.string({ minLength: 1 }),
});

export const WorkItemsConfigSchema = RuntimeSchema.struct({
  readOnly: RuntimeSchema.boolean(),
  limits: RuntimeSchema.struct({
    maxAllocationsPerItem: RuntimeSchema.number({ min: 1 }),
  }),
});

export const WorkItemsInvocationSchema = RuntimeSchema.struct({
  traceId: RuntimeSchema.string(),
  actorId: RuntimeSchema.optional(RuntimeSchema.string()),
});

export const service = defineService({
  id: "work-items",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    clock: resourceDep(ClockResource),
    logger: resourceDep(LoggerResource),
  },

  scope: WorkItemsScopeSchema,
  config: WorkItemsConfigSchema,
  invocation: WorkItemsInvocationSchema,

  metadataDefaults: {
    idempotent: true,
    domain: "work-items",
    audience: "internal",
    audit: "basic",
  },

  baseline: {
    policy: {
      events: {
        readOnlyRejected: "work-items.policy.read_only_rejected",
        allocationLimitReached: "work-items.policy.allocation_limit_reached",
      },
    },
  },
});

export type WorkItemsService = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createProvidedContextMiddleware = service.createProvidedContextMiddleware;
export const createServiceImplementer = service.createImplementer;
```

Rules:

```text
base.ts does not import Effect/fx unless the runtime spec explicitly allows it.
base.ts does not import providers.
base.ts does not import app profiles.
base.ts does not import plugins.
base.ts does not construct runtime values.
```

---

### 7.5 Central implementer example

```ts
import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { serviceObservability } from "./middleware/observability";
import { serviceAnalytics } from "./middleware/analytics";
import { serviceReadOnlyMode } from "./middleware/read-only-mode";

export const impl = createServiceImplementer(contract)
  .use(serviceObservability)
  .use(serviceAnalytics)
  .use(serviceReadOnlyMode);
```

Rules:

```text
impl.ts is the package-wide implementer choke point.
impl.ts owns service-wide `.use(...)` composition.
impl.ts does not implement individual procedures.
impl.ts does not import raw Effect or effect-orpc.
```

---

### 7.6 Root contract and router examples

Root contract:

```ts
import { contract as allocations } from "./modules/allocations/contract";
import { contract as items } from "./modules/items/contract";
import { contract as labels } from "./modules/labels/contract";

export const contract = {
  items,
  labels,
  allocations,
};

export type WorkItemsContract = typeof contract;
```

Root router:

```ts
import { impl } from "./impl";
import { router as allocations } from "./modules/allocations/router";
import { router as items } from "./modules/items/router";
import { router as labels } from "./modules/labels/router";

export const router = impl.router({
  items,
  labels,
  allocations,
});

export type WorkItemsRouter = typeof router;
```

Rules:

```text
Root contract composes module contracts only.
Root router composes module routers only.
Procedure behavior lives in module router.ts.
```

---

### 7.7 Package boundary exports

```ts
// src/router.ts
export { router } from "./service/router";
export type { WorkItemsRouter } from "./service/router";
```

```ts
// src/client.ts
import { defineServicePackage } from "@rawr/sdk/service";
import { router } from "./service/router";

export const workItemsPackage = defineServicePackage({
  serviceId: "work-items",
  router,
});

export const createClient = workItemsPackage.createClient;
export type WorkItemsClient = ReturnType<typeof createClient>;
```

```ts
// src/index.ts
export { service } from "./service/base";
export { contract } from "./service/contract";
export { router } from "./service/router";
export { createClient } from "./client";

export type { WorkItemsContract } from "./service/contract";
export type { WorkItemsRouter } from "./service/router";
export type { WorkItemsClient } from "./client";
```

Forbidden exports:

```text
repositories
private module schemas
private middleware
migrations
provider internals
EffectRuntimeAccess
raw Effect types
raw effect-orpc builders
```

---

### 7.8 Module contract example

```ts
import { ocBase } from "../../base";
import {
  CreateWorkItemInputSchema,
  GetWorkItemInputSchema,
  InvalidWorkItemTitleErrorDataSchema,
  WorkItemSchema,
} from "./schemas";
import { READ_ONLY_MODE, RESOURCE_NOT_FOUND } from "../../shared/errors";

export const contract = {
  create: ocBase
    .meta({ idempotent: false, entity: "item", audit: "full" })
    .input(CreateWorkItemInputSchema)
    .output(WorkItemSchema)
    .errors({
      READ_ONLY_MODE,
      INVALID_WORK_ITEM_TITLE: {
        status: 400,
        message: "Invalid work item title",
        data: InvalidWorkItemTitleErrorDataSchema,
      },
    }),

  get: ocBase
    .meta({ idempotent: true, entity: "item", audit: "basic" })
    .input(GetWorkItemInputSchema)
    .output(WorkItemSchema)
    .errors({
      RESOURCE_NOT_FOUND,
    }),
};
```

Contract files remain cold:

```text
no Effect
no repositories
no providers
no runtime access
no env reads
no handler bodies
```

---

### 7.9 Module repository example

```ts
import { Effect, TaggedError, type RawrEffect } from "@rawr/sdk/effect";
import type { WorkItem } from "./schemas";

export class WorkItemRepositoryError extends TaggedError("WorkItemRepositoryError")<{
  readonly cause: unknown;
}> {}

export interface WorkItemRepository {
  insert(input: {
    workspaceId: string;
    title: string;
    description?: string;
    createdAt: string;
  }): RawrEffect<WorkItem, WorkItemRepositoryError>;

  findById(input: {
    workspaceId: string;
    id: string;
  }): RawrEffect<WorkItem | null, WorkItemRepositoryError>;

  markDone(input: {
    workspaceId: string;
    id: string;
    updatedAt: string;
  }): RawrEffect<WorkItem, WorkItemRepositoryError>;
}

export function createWorkItemRepository(input: {
  dbPool: SqlPool;
}): WorkItemRepository {
  return {
    insert(payload) {
      return Effect.tryPromise({
        try: () =>
          input.dbPool.insert("work_items", {
            workspace_id: payload.workspaceId,
            title: payload.title,
            description: payload.description ?? null,
            status: "open",
            created_at: payload.createdAt,
            updated_at: payload.createdAt,
          }),
        catch: (cause) => new WorkItemRepositoryError({ cause }),
      });
    },

    findById(payload) {
      return Effect.tryPromise({
        try: () =>
          input.dbPool.queryOne<WorkItem>(
            "select * from work_items where workspace_id = $1 and id = $2",
            [payload.workspaceId, payload.id],
          ),
        catch: (cause) => new WorkItemRepositoryError({ cause }),
      });
    },

    markDone(payload) {
      return Effect.tryPromise({
        try: () =>
          input.dbPool.updateOne<WorkItem>("work_items", {
            where: {
              workspace_id: payload.workspaceId,
              id: payload.id,
            },
            set: {
              status: "done",
              updated_at: payload.updatedAt,
            },
          }),
        catch: (cause) => new WorkItemRepositoryError({ cause }),
      });
    },
  };
}
```

Rules:

```text
repository.ts is service-internal.
repository.ts may use the curated RAWR Effect facade.
repository.ts does not import raw Effect.
repository.ts does not import effect-orpc.
repository.ts does not import sibling service repositories.
repository.ts does not own cross-service writes.
```

---

### 7.10 Module middleware and projection example

```ts
import { createProvidedContextMiddleware } from "../../base";
import { createWorkItemRepository } from "./repository";

export const provideItemRepository = createProvidedContextMiddleware(
  "work-items.items.repository",
  async ({ context, next }) => {
    const repo = createWorkItemRepository({
      dbPool: context.deps.dbPool,
    });

    return next({
      context: {
        provided: {
          ...context.provided,
          items: {
            repo,
          },
        },
      },
    });
  },
);
```

Module composition with projected context:

```ts
import { impl } from "../../impl";
import { provideItemRepository } from "./middleware";

export const module = impl.items
  .use(provideItemRepository)
  .use(async ({ context, next }) =>
    next({
      context: {
        clock: context.deps.clock,
        workspaceId: context.scope.workspaceId,
        repo: context.provided.items.repo,
      },
    }),
  );
```

Rules:

```text
module.ts starts from impl.<module>.
module.ts attaches module-local middleware.
module.ts may project nested lanes into ergonomic handler context.
module.ts does not implement procedure bodies.
```

---

### 7.11 Module router example

```ts
import { Effect } from "@rawr/sdk/effect";
import { module } from "./module";

export const router = module.router({
  create: module.create.effect(function* ({ input, context, errors }) {
    if (input.title.trim().length === 0) {
      return yield* Effect.fail(
        errors.INVALID_WORK_ITEM_TITLE({
          data: { title: input.title },
        }),
      );
    }

    return yield* context.repo.insert({
      workspaceId: context.workspaceId,
      title: input.title.trim(),
      description: input.description,
      createdAt: context.clock.nowIso(),
    });
  }),

  get: module.get.effect(function* ({ input, context, errors }) {
    const item = yield* context.repo.findById({
      workspaceId: context.workspaceId,
      id: input.id,
    });

    if (!item) {
      return yield* Effect.fail(
        errors.RESOURCE_NOT_FOUND({
          data: { id: input.id, kind: "work-item" },
        }),
      );
    }

    return item;
  }),
});
```

Rules:

```text
router.ts owns procedure behavior.
router.ts chooses `.handler(...)` or `.effect(...)` per procedure.
router.ts does not import providers.
router.ts does not import sibling service internals.
router.ts should not duplicate global middleware policy.
```

---

### 7.12 N > 1 service module collaboration

Within one service, modules may collaborate through provided module context because they share one semantic service truth.

Example allocation module:

```ts
import { Effect } from "@rawr/sdk/effect";
import { module } from "./module";

export const router = module.router({
  allocateLabel: module.allocateLabel.effect(function* ({ input, context, errors }) {
    const item = yield* context.items.repo.findById({
      workspaceId: context.workspaceId,
      id: input.itemId,
    });

    if (!item) {
      return yield* Effect.fail(
        errors.RESOURCE_NOT_FOUND({
          data: { id: input.itemId, kind: "work-item" },
        }),
      );
    }

    const label = yield* context.labels.repo.findById({
      workspaceId: context.workspaceId,
      id: input.labelId,
    });

    if (!label) {
      return yield* Effect.fail(
        errors.RESOURCE_NOT_FOUND({
          data: { id: input.labelId, kind: "label" },
        }),
      );
    }

    return yield* context.allocations.repo.insert({
      workspaceId: context.workspaceId,
      itemId: item.id,
      labelId: label.id,
      createdAt: context.clock.nowIso(),
    });
  }),
});
```

Rule:

```text
Within-service module repository collaboration is allowed.
Cross-service repository access is forbidden.
Cross-service collaboration uses serviceDep(...) and bound service clients.
```

---

### 7.13 N = 1 service remains same species

Simple service topology:

```text
services/notifications/
  src/
    index.ts
    client.ts
    router.ts
    service/
      base.ts
      impl.ts
      contract.ts
      router.ts
      middleware/
        observability.ts
        read-only-mode.ts
      shared/
        errors.ts
        internal-errors.ts
      modules/
        messages/
          schemas.ts
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
```

Root contract still composes one module:

```ts
import { contract as messages } from "./modules/messages/contract";

export const contract = {
  messages,
};

export type NotificationsContract = typeof contract;
```

Root router still composes one module:

```ts
import { impl } from "./impl";
import { router as messages } from "./modules/messages/router";

export const router = impl.router({
  messages,
});

export type NotificationsRouter = typeof router;
```

---

## 8. Service-to-service dependency rules

Service dependency declaration:

```ts
import { defineService, resourceDep, serviceDep } from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";

import { SqlPoolResource } from "@rawr/resources/sql";
import { service as BillingService } from "@rawr/services/billing";
import { service as EntitlementsService } from "@rawr/services/entitlements";

export const service = defineService({
  id: "user-accounts",

  deps: {
    dbPool: resourceDep(SqlPoolResource),
    billing: serviceDep(BillingService),
    entitlements: serviceDep(EntitlementsService),
  },

  scope: RuntimeSchema.struct({
    workspaceId: RuntimeSchema.string(),
  }),

  config: RuntimeSchema.struct({
    allowSelfService: RuntimeSchema.boolean(),
  }),

  invocation: RuntimeSchema.struct({
    traceId: RuntimeSchema.string(),
  }),
});
```

Rules:

```text
serviceDep(...) creates service binding dependency edges.
It is not a runtime resource.
It is not selected through RuntimeProfile.
It does not permit importing sibling repositories or module internals.
```

Inside `.effect(...)`:

```ts
const entitlement = yield* context.deps.entitlements.effect.users.check({
  userId: input.userId,
});
```

Inside `.handler(...)`:

```ts
const entitlement = await context.deps.entitlements.promise.users.check({
  userId: input.userId,
});
```

---

## 9. Error handling model

Error taxonomy:

```text
Declared service contract errors:
  Caller-facing, schema-backed, oRPC-owned boundary shape.

Expected business states:
  Usually values inside repositories/services, mapped by procedures when needed.

Internal service errors:
  Tagged internal failures, often repository/provider failures.
  Diagnostics/internal boundary by default.

Runtime errors:
  Runtime/provisioning/binding/execution failures owned by runtime diagnostics.
```

Contract error pattern:

```ts
export const contract = {
  get: ocBase
    .input(GetTaskInputSchema)
    .output(TaskSchema)
    .errors({
      RESOURCE_NOT_FOUND,
      READ_ONLY_MODE,
    }),
};
```

Effect mapping pattern:

```ts
const item = yield* context.repo.findById({ id: input.id });

if (!item) {
  return yield* Effect.fail(
    errors.RESOURCE_NOT_FOUND({
      data: { id: input.id, kind: "work-item" },
    }),
  );
}

return item;
```

Internal failure mapping pattern:

```ts
return yield* context.repo.insert(payload).pipe(
  Effect.catchTag("WorkItemRepositoryError", (error) =>
    Effect.fail(
      errors.WRITE_FAILED({
        data: { reason: "database-write-failed" },
        cause: error,
      }),
    ),
  ),
);
```

Rule:

```text
Only explicitly declared contract errors become typed caller errors.
Everything else becomes diagnostics/internal failure unless mapped.
```

---

## 10. Telemetry, observability, analytics

Final split:

```text
Runtime telemetry:
  lifecycle, provisioning, execution, binding, adapter, harness, correlation.

Service semantic observability:
  service-level and module/procedure-level spans, attributes, logs, and domain events.

Product analytics:
  explicit product/service analytics sink when needed; not hidden universal base dep.
```

Service observability middleware example:

```ts
export const serviceObservability = createServiceMiddleware(
  "work-items.observability",
  async ({ procedure, context, next, telemetry }) => {
    return telemetry.span(
      `service.${procedure.path}`,
      {
        serviceId: "work-items",
        procedurePath: procedure.path,
        workspaceId: context.scope.workspaceId,
        actorId: context.invocation.actorId ?? null,
      },
      () => next(),
    );
  },
);
```

Analytics pattern:

```ts
export const serviceAnalytics = createServiceMiddleware(
  "work-items.analytics",
  async ({ procedure, context, next }) => {
    const result = await next();

    if (procedure.metadata.analyticsEvent) {
      await context.deps.analytics.track({
        event: procedure.metadata.analyticsEvent,
        actorId: context.invocation.actorId,
        workspaceId: context.scope.workspaceId,
      });
    }

    return result;
  },
);
```

But analytics dependency is explicit:

```ts
analytics: resourceDep(AnalyticsSinkResource)
```

Not hidden in `BaseDeps`.

---

## 11. oRPC × Effect native-fit posture

Desired service authoring should still feel oRPC-native:

```text
contract-first
implement(contract)
.use(middleware)
.router({ ... })
procedure.handler(...)
procedure.effect(...)
context injected through middleware
errors from contract
```

Desired Effect bodies should feel Effect-native:

```text
generator style
failure channel
tagged errors
tryPromise for Promise boundaries
all/retry/timeout for local orchestration
catchTag/catchTags for typed error mapping
```

RAWR constraints:

```text
no raw Effect imports
no raw effect-orpc imports
no ManagedRuntime in authoring
no local runtime construction
no service-owned adapter wiring
no raw effect layers as app composition
```

---

## 12. Implementation proof points before final lock

The design is high-confidence. These are proof points, not major unresolved design questions:

```text
1. Generator-native .effect(function*) typing
   Prove SDK preserves oRPC contract inference, middleware context inference,
   typed errors, and RawrEffect success/error inference.

2. Descriptor-first oRPC integration
   Prove oRPC-native router/client behavior remains intact while .effect execution
   routes through ProcessExecutionRuntime.

3. Error bridge
   Prove declared oRPC errors failed through Effect arrive as defined oRPC errors.
   Prove repository/internal errors become runtime diagnostics/internal caller
   failures unless explicitly mapped.

4. Client facades
   Prove .promise/.effect clients preserve invocation forwarding and binding cache
   law while being ergonomic inside handlers/effects.

5. Import gates
   Prove raw Effect/effect-orpc/ManagedRuntime cannot leak into services/plugins/apps.
```

---

## 13. Gate plan

Static/import gates:

```text
no raw Effect imports in services/plugins/apps
no effect-orpc imports outside SDK internals
no ManagedRuntime construction outside runtime substrate
canonical service topology exists
service root exports only boundary surfaces
contracts are cold
providers are cold
no service imports sibling service internals
```

Type gates:

```text
defineService infers deps/scope/config/invocation
oRPC initial/execution context is derived correctly
provided-context middleware cannot overwrite reserved lane names
module projection cannot overwrite reserved lane names
.handler cannot return RawrEffect
.effect must return/yield RawrEffect
.promise client not usable as RawrEffect
.effect client not awaitable without runtime bridge
contract errors are typed in handler and effect mode
```

Runtime behavior gates:

```text
read-only middleware blocks mutating procedures by metadata
handler procedure executes through ProcessExecutionRuntime
effect procedure executes through ProcessExecutionRuntime
EffectRuntimeAccess is SDK/runtime internal only
repository failure becomes diagnostic/internal unless mapped
declared boundary error remains defined oRPC error
service binding cache excludes invocation
invocation-bound client forwards invocation per call
provider acquire/release finalizes in reverse order
```

Fixture/plan gates:

```text
NormalizedAuthoringGraph snapshot
ServiceBindingPlan snapshot
CompiledExecutionPlan snapshot
RuntimeCatalog snapshot
telemetry labels snapshot
startup rollback snapshot
finalization snapshot
```

Mandatory service-specific gates:

```text
service.topology.n1
service.topology.n_gt_1
service.contract-coldness
service.impl-central-chokepoint
service.module-provided-context
service.module-projection
service.repository-rawr-effect
service.handler.procedure
service.effect.procedure
service.read-only-middleware
service.contract-error.effect-bridge
service.internal-error.diagnostic
service.client.promise-effect-facades
service.serviceDep.no-sibling-internals
service.analytics-explicit-resource
```

---

## 14. Forbidden patterns

```yaml
- id: forbidden.raw-effect-service
  description: Defining a RAWR service as an Effect.Service.
  replacement: defineService(...) + oRPC contracts + .handler/.effect terminals.

- id: forbidden.raw-effect-orpc-authoring
  description: Service or plugin imports effect-orpc and creates its own effect builder.
  replacement: Use RAWR implementers.

- id: forbidden.managed-runtime-in-authoring
  description: Service, plugin, app, provider declaration, or entrypoint creates ManagedRuntime.
  replacement: Runtime substrate creates one root ManagedRuntime per process.

- id: forbidden.effect-layer-app-composition
  description: Effect Layer composition used as app membership or provider selection.
  replacement: defineApp(...) and defineRuntimeProfile(...).

- id: forbidden.effect-in-contract
  description: Contracts import or execute Effect.
  replacement: Contracts stay cold; implementation files use .handler or .effect.

- id: forbidden.provider-selection-in-service
  description: Service imports concrete provider or selects provider implementation.
  replacement: Service uses resourceDep(...); app profile selects provider.

- id: forbidden.plugin-provider-acquisition
  description: Plugin constructs native provider client.
  replacement: Plugin declares resource requirement; runtime provisions selected provider.

- id: forbidden.raw-effect-public-export
  description: Public service/plugin/app export exposes Effect/Layer/Scope/ManagedRuntime.
  replacement: Expose RAWR descriptors and RawrEffect only where needed.

- id: forbidden.collapsed-service-topology
  description: Service collapses root contract/router/impl/module files because N=1.
  replacement: Generate the same service package topology for N=1 and N>1.

- id: forbidden.duplicated-readonly-policy
  description: Mutating handlers manually duplicate read-only checks everywhere.
  replacement: Service read-only middleware enforces metadata-driven policy.

- id: forbidden.dual-repository-facades
  description: Permanent Promise and Effect repository APIs for the same IO operations.
  replacement: RawrEffect-returning repositories for IO; Promise repositories only migration-only.

- id: forbidden.ambiguous-client-call
  description: client.tasks.get(...) used in execution contexts without promise/effect distinction.
  replacement: client.promise.tasks.get(...) or client.effect.tasks.get(...).
```

---

## 15. Drift classification from investigation

| Area | Finding | Classification | Correction |
| --- | --- | --- | --- |
| Runtime doc includes service internals | Runtime examples specify topology, repositories, middleware, routers | Boundary pollution | Move to companion service spec |
| `defineService` API | Runtime-shaped lanes differ from old HQ generic API | Intentional platform elevation | Migrate or compatibility layer |
| Context lanes | Runtime examples were nested-only; Todo/HQ supports projection | Accidental drift if nested-only | Allow module projection |
| `provided.*` source | Runtime wording implied boundaries cannot seed `provided` at all | Wording issue | Allow empty carrier, prohibit semantic seeded values |
| Provider terminology | Service provider middleware conflicts with RuntimeProvider | Real ambiguity | Rename to provided-context middleware |
| Repository return type | Todo Promise repos vs Effect repos | Intentional Effect migration | IO repos return RawrEffect |
| Read-only checks | Runtime examples duplicate checks inside handlers | Problematic regression | Preserve middleware enforcement |
| Errors | Handler throws vs effect fails | Intentional bridge | Define error bridge precisely |
| Telemetry/analytics | Runtime telemetry and service analytics blurred | Partial drift | Runtime correlation vs service semantic observability |
| Client shape | Some examples used ambiguous clients | Problematic ambiguity | Lock `.promise` / `.effect` |
| effect-orpc posture | effect-orpc wants ManagedRuntime | Intentional supersession | SDK-internal only |
| Raw Effect imports | Runtime bans raw Effect imports | Correct | Keep gates |

---

## 16. Readiness verdict

Verdict:

```text
Ready to author a strong standalone service package specification.
Not ready to treat every implementation detail as final until the updated
Runtime Realization System is reconciled.
```

Major design decisions are resolved in this snapshot:

```text
service topology
service declaration direction
handler/effect split
Effect facade philosophy
repository return rule
provided-context rule
context projection
service client facades
error bridge posture
telemetry/analytics split
effect-orpc internal-only posture
migration plan
gates
```

Remaining work before final canonical spec:

```text
1. Reconcile public Effect facade name with updated Runtime spec.
   This snapshot prefers `Effect` from @rawr/sdk/effect.
   Existing docs may lock `fx`.

2. Reconcile generator-native `.effect(function*)` with SDK/runtime execution
   descriptor typing.

3. Reconcile exact Runtime-owned execution interfaces with incoming runtime spec.

4. Spike descriptor-first oRPC integration.

5. Spike error bridge and typed contract error preservation.

6. Update examples to avoid read-only duplication and ambiguous clients.
```

---

## 17. Next-session reconciliation checklist

When the updated Runtime Realization System arrives, compare it against this snapshot on these axes:

```text
1. Public Effect facade:
   Effect vs fx vs both; canonical spelling; native-fit tradeoff.

2. `.effect(...)` terminal shape:
   generator-native function* vs callback returning RawrEffect.

3. Runtime-owned names:
   ExecutionDescriptor, CompiledExecutionPlan, ProcessExecutionRuntime,
   EffectRuntimeAccess, ManagedRuntimeHandle, error/telemetry bridge names.

4. Service lanes:
   deps/scope/config/invocation/provided exact names and schemas.

5. provided-context middleware:
   exact helper name and overwrite semantics.

6. Module context projection:
   whether runtime spec permits projection or implies nested-only.

7. Repository rule:
   whether runtime examples require RawrEffect IO repositories.

8. Read-only and policy examples:
   ensure middleware, not handler duplication.

9. Client facades:
   `.promise` / `.effect` exact naming and invocation forwarding rules.

10. Telemetry and analytics:
    runtime correlation vs service semantic observability vs product analytics.

11. effect-orpc adapter:
    descriptor-first vs direct makeEffectORPC/implementEffect integration.

12. Import gates:
    raw Effect/effect-orpc/ManagedRuntime allowed paths.
```

---

## 18. Condensed canonical picture

```text
services
  own capability truth
  use canonical generated topology
  declare runtime-carried lanes and service dependencies
  author oRPC contracts
  implement procedures through .handler(...) or .effect(...)

service modules
  own schemas, contracts, middleware, repositories, and routers
  use module-local middleware and projected context for ergonomic handler bodies
  keep repositories service-internal

Effect inside services
  is local execution composition
  is expressed through a RAWR-owned native-shaped facade
  is run only by the runtime-owned process execution bridge

Repositories
  return RawrEffect for IO in final packages
  map Promise/native IO through tryPromise
  expose typed internal errors

Errors
  caller-facing errors stay oRPC contract errors
  Effect failure channel maps into those errors when declared
  internal failures become diagnostics/internal unless explicitly mapped

Telemetry
  runtime owns correlation and lifecycle telemetry
  services own semantic observability
  analytics is explicit, not hidden universal base dependency

Clients
  expose explicit promise and effect facades
  avoid ambiguous execution timing

Runtime
  binds services
  caches construction-time service bindings
  excludes invocation from binding cache
  executes handler/effect descriptors centrally
  owns raw Effect runtime and effect-orpc adapter internals
```

Final law:

```text
Native oRPC where contracts and middleware live.
Native-shaped Effect where local execution lives.
RAWR-owned boundaries where lifecycle, ownership, and runtime access live.
```
