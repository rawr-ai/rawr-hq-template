# Guidance

## What This Document Is

- `guidance.md` is operational implementation guidance.
- It captures current defaults and conventions for building/maintaining domain example packages.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression (invariants + axes) belongs in `examples.md`.

## Agent Click Path (Recommended)

If you are an agent arriving to implement business logic fast:

- **Start at oRPC composition**: `src/service/impl.ts` (root contract implementer + package-wide middleware order)
- **Then open the service router**: `src/service/router.ts` (module router composition + single final attach)
- **Then live in a module**: `src/service/modules/<name>/{contract,setup,router}.ts`
- **When you need “the one import for service authoring”**: `src/service/base.ts` (`Service` + `ocBase` + bound service builders)
- **When you need to inspect or change service-wide baseline concerns**: `src/service/base.ts`
- **When you need “the one import for handler implementers”**: `src/service/impl.ts` (`impl.<module>` subtrees)
- **When you need kit-level middleware** (analytics, providers, generic wrappers): `src/orpc/middleware/*`

If you are wiring exports/packaging: `src/index.ts`, `src/client.ts`, and `src/router.ts` (public alias).

## Package Shape (Always-On)

Use one stable top-level structure across package sizes:

- `src/index.ts` for public package exports only,
- `src/client.ts` for in-process client construction only,
- `src/router.ts` for the stable public router export (`@rawr/<pkg>/router`) via re-export,
- `src/orpc-sdk.ts` + `src/orpc/*` for local oRPC kit primitives (domain-agnostic; future-SDK seam),
- `src/service/impl.ts` for oRPC-native contract implementation + package-wide middleware stacking,
- `src/service/` for service semantics (service definition + modules + shared constructs + contract bubble-up + router composition).

Always-on slots:

- `src/service/router.ts` is the always-on service router composition choke point (single final attach).
- `src/service/base.ts` is the always-on single-file service-definition layer.
- `src/service/base.ts` owns the grouped service declaration (`initialContext`, `invocationContext`, `metadata`), metadata defaults, baseline concern definitions, and the bound service authoring surfaces from `defineService(...)`.
- `src/service/base.ts` should prefer one canonical `defineService<{ initialContext, invocationContext, metadata }>(...)` call plus `ServiceOf<typeof service>` rather than hand-writing `ServiceDeps`, `ServiceMetadata`, and `ServiceContext` separately.
- `src/service/base.ts` should define service-specific deltas and bounded baseline hooks, not restate repetitive baseline event names or package identity that the SDK can derive automatically.
- Module/procedure-local observability and analytics are additive middleware, authored with `createServiceObservabilityMiddleware(...)` / `createServiceAnalyticsMiddleware(...)` and attached where they belong (`modules/*/setup.ts` for module-wide additions, `modules/*/router.ts` for procedure-local additions).
- `src/orpc/base.ts` is the always-on domain-package baseline definition surface.
- `src/orpc/factory/*` is the always-on internal helper layer for abstract oRPC builders.
- `src/orpc/package-boundary.ts` owns the package boundary wiring used by `src/client.ts`.
- `src/orpc/middleware/*` is the always-on slot for kit-level middleware definitions.
- `src/service/impl.ts` is the always-on oRPC composition surface (implement root contract + attach middleware).
- `src/service/impl.ts` should compose package-wide providers/guards and any extra non-baseline service middleware; it should not be the default home for baseline observability/analytics wiring that already comes from `createServiceImplementer(...)`.

## Scaffold Determinism Rule

When choosing between "minimal now" vs "predictable later", prefer predictable scaffold slots for core structure.

- Keep always-present structural files/directories that are expected as a package grows (for example `src/service/base.ts`, `src/service/router.ts`, `src/service/impl.ts`, `src/orpc/middleware/*`), even if initially thin.
- Do not push structural timing decisions ("add this file later") onto agents for core package layout.
- Use templates/CLI shape flags to vary content depth, not to vary foundational topology.

## Terminology (This Repo, Not Generic oRPC)

To avoid overloaded "router" language, these terms are canonical in this doc:

- **Module contract object**: plain object exported from `service/modules/<name>/contract.ts`.
  Example:
  ```ts
  export const contract = {
    create: procedure({ idempotent: false }).input(...).output(...).errors(...),
    get: procedure({ idempotent: true }).input(...).output(...).errors(...),
  };
  ```
- **Contract-router builder**: optional oRPC builder form `oc.errors(...).router({...})`.
  We are not using this by default in `example-todo`.
- **Module setup**: context injection exported from `service/modules/<name>/setup.ts` (repos/services derived from `context.deps`).
- **Module implementation router**: oRPC server router exported from `service/modules/<name>/router.ts` via `os.router({ ... })`.
- **Service router**: final router exported from `src/service/router.ts` after module routers are attached once.
- **Kit seam**: domain-agnostic oRPC kit primitives under `src/orpc-sdk.ts` and `src/orpc/*`.
- **oRPC composition**: `src/service/impl.ts` (implements the root contract and attaches package-wide middleware).

## Naming Conventions

Default scaffold naming is generic for singleton package surfaces and helpers.

- package entry exports: `router`, `createClient`, `Router`, `Client`,
- module contract exports: `contract`,
- module router exports: `router`,
- module repository exports: `createRepository`,
- ORPC runtime helper names: `procedure` (and only helpers used outside the defining file).

Use local generic names inside each module. When importing multiple modules into one file, alias at the import site for disambiguation.

Example:
```ts
import { contract as tasksContract } from "../tasks/contract";
import { contract as tagsContract } from "../tags/contract";
import { createRepository as createTaskRepository } from "../tasks/repository";
```

Minimal-export rule:

- export only symbols consumed by another file/package boundary.
- do not export convenience type aliases (`Contract`, `Repository`) by default.
- do not export internal constants/types from runtime helpers unless another file imports them.

## Public Export Surface

Package root (`src/index.ts`) is boundary-only by default.

- Export: `createClient`, `router`, `Client`, `Router`.
- Do not export runtime internals (`orpc/*`) from root.
- Do not export module schemas/contracts/repositories from root by default.
- Do not keep compatibility aliases in examples unless explicitly required by a migration plan.

## Module Shape: `contract.ts` + `setup.ts` + `router.ts`

Each module should split boundary definition from behavior:

- `contract.ts`: procedure names, input/output schemas, `.errors(...)` declarations.
- `setup.ts`: module runtime composition only; this is the scaffolding entry point that prepares the module-local implementer/exported `os`.
- `middleware.ts` (optional): standalone module-local middleware/provider definitions when they are worth naming separately.
- `router.ts`: handler implementation only; exports the contract-enforced module router.

Rules:

- Do not duplicate contract shape in `router.ts`.
- Do not place business orchestration in module `contract.ts`.
- Start each module setup from the central implementer subtree in `src/service/impl.ts` (`impl.<module>`), then attach any standalone module middleware and/or inline middleware there.
- Use `createServiceObservabilityMiddleware(...)` / `createServiceAnalyticsMiddleware(...)` for additive local instrumentation at module/procedure scope; use `createServiceMiddleware(...)` for other additive observers/guards; keep `service/base.ts` for service-wide defaults only.
- Keep module `router.ts` readable as execution logic, not as schema-definition boilerplate.
- Keep module `contract.ts` fully inline for procedure definitions (`.input(...)`, `.output(...)`, `.errors(...)`) in the same chain.
- In procedure chains, place `.errors(...)` after `.input(...)` and `.output(...)` for consistent scan order.
- Prefer TypeBox `description` metadata on schema objects/properties for semantic documentation; avoid extra schema-only JSDoc noise.
- `setup.ts` should make it obvious that both patterns are valid:
  - attach standalone module middleware from `middleware.ts`
  - author inline middleware directly in `setup.ts`
- Do not treat the presence of `middleware.ts` as meaning inline middleware is forbidden.

## Procedure Metadata Standard

Use oRPC-native procedure metadata (`.meta(...)`) to encode small, agent-useful execution semantics.

Current required baseline:

- shared package metadata: `domain: "todo"` and `audience: "internal"`,
- per-procedure required field: `idempotent: boolean`.

Recommended pattern:

- define the grouped service declaration once in `src/service/base.ts`:
  - `initialContext` for construction-time `deps` / `scope` / `config`
  - `invocationContext` for per-call invocation input
  - `metadata` for static procedure metadata
- define base metadata defaults once in `src/service/base.ts` as `metadataDefaults`,
- bind service-local contract/middleware/implementer authoring once in `src/service/base.ts` via `defineService(...)`,
- keep module contracts explicit by setting `idempotent` on every procedure,
- read metadata in middleware via `procedure["~orpc"].meta` (oRPC runtime metadata surface).

Why this baseline:

- high signal for agent/runtime decisions (safe retries, mutation awareness),
- low authoring overhead,
- avoids repeating derivable labels ad hoc in every module.

Not required in this phase:

- `sideEffects` classification (deferred until we have a concrete automated consumer and enforcement).

## Context + Middleware Layering

Use context/middleware at the level where each concern actually belongs:

- Initial context carries explicit semantic lanes at the kit boundary.
- `deps` should extend the kit baseline `BaseDeps` (mandatory `logger`), exported via the kit seam (`src/orpc-sdk.ts`).
- `scope` should hold stable business/client-instance scope bound at `createClient(...)` time.
- `config` should hold stable package behavior/configuration bound at `createClient(...)` time.
- `invocation` should hold required per-call input passed through native oRPC client context.
- Module setup injects module-local repos/services into execution context (`src/service/modules/<name>/setup.ts`).
- Kit-level middleware should be used for cross-cutting concerns that should be reusable across domain packages (analytics, import-fault classification, request scoping).
- Domain-wide middleware should be used for domain guards/semantics (read-only mode, authz policy, tenancy invariants) that need procedure metadata awareness.
- Apply middleware at most once per concern: attach package-wide middleware in `src/service/impl.ts`, then attach module routers once in `src/service/router.ts`.

### Runtime Context Model

At the service-definition seam, these runtime concerns are authored as two separate categories:

- **`initialContext`**: the construction-time context supplied when the in-process client is created
- **`invocationContext`**: the per-call context supplied at invocation time

Downstream inside handlers and middleware, both categories appear on the unified procedure `context` object under their established runtime lanes.

Use these runtime context categories consistently:

- **`context.deps`**: host-provided, stable dependencies. This is the explicit dependency bag for injected services/capabilities the host owns.
- **`context.scope`**: stable business/client-instance scope bound when the client is created.
- **`context.config`**: stable package behavior/configuration bound when the client is created.
- **`context.invocation`**: per-call invocation input supplied through native oRPC client context.
- **`context.provided`**: execution-time provider output bag for any downstream values attached/derived by middleware or setup (for example `provided.sql`, `provided.feedbackSession`, `provided.repo`, `provided.tasks`, `provided.tags`).

Do **not** create a second runtime dependency bag such as `context.base`.
Do **not** use a generic runtime `metadata` bag by default. oRPC procedure metadata (`.meta(...)`) is separate from runtime context; if runtime grouping is needed later, use a specific name like `request`, not a generic `metadata` bucket.
Do **not** use ad hoc top-level request input as the normal package-boundary pattern.
Do **not** use middleware-context as the repo-default way to satisfy required invocation input. oRPC supports it, but this repo does not currently have a legitimate use case for it, so treat it as strongly discouraged unless the broader architecture changes.
Do **not** write back into `deps`, `scope`, `config`, or `invocation` from middleware. Those semantic lanes are input-only.

Practical defaults:

- Access logger/clock as `context.deps.logger` / `context.deps.clock`.
- Access stable scope as `context.scope.*`.
- Access stable behavior config as `context.config.*`.
- Access required invocation input as `context.invocation.*`.
- Access provider-derived execution context as `context.provided.*`.
- Treat `context.provided` keys as append-only. Providers must not overwrite an existing provided key.
- Avoid alias-only middleware like `deps.logger -> logger` unless there is a concrete runtime reason.
- Keep baseline deps and service deps as a type-authoring distinction (`BaseDeps` extended by service deps), not as separate runtime keys.

### Middleware Categories

Treat middleware categories as behavioral roles, not just naming conventions:

- **Provider middleware** is the only middleware category allowed to add downstream execution context.
  - Providers write under `context.provided.*`
  - Examples: `sqlProvider`, `feedbackProvider`, module-local `repo` setup
- **Guard/policy middleware** consumes context and metadata to allow/block/shape execution, but does not add execution context.
  - Example: `readOnlyMode`
- **Observer/instrumentation middleware** consumes context and metadata to emit side effects, but does not add execution context.
  - Examples: `createBaseObservabilityMiddleware`, `createAnalyticsMiddleware`, `readOnlyMode`

The semantic line is simple:

- if middleware creates new downstream context, it is a provider
- if it only observes, guards, or records, it is not a provider
- raw inline oRPC middleware remains an escape hatch; prefer the provider/non-provider builders unless you intentionally need to step outside the enforced model

### Middleware Authoring Pattern

Author middleware against the mirrored required-context shape directly:

- bind service-local authoring surfaces once in `src/service/base.ts` via `defineService(...)`
- use `createServiceImplementer(contract)` in `src/service/impl.ts` so service context and baseline implementer options stay bound in one place
- shared/framework non-providers via `createBaseMiddleware<{ ...lane fragments... }>()`
- shared/framework providers via `createBaseProvider<{ ...lane fragments... }>()`
- service non-providers via `createServiceMiddleware<{ ...lane fragments... }>()`
- service-local providers via `createServiceProvider<{ ...lane fragments... }>()`
- if a middleware has no required context, call the helper with no type argument

Declare only the minimal lane fragments a middleware needs. Examples:

- `deps` fragment when middleware depends on host capabilities
- `config` fragment when middleware enforces stable package behavior
- `invocation` fragment when middleware consumes required per-call input
- combinations when a middleware legitimately spans multiple lanes

Do **not** create one helper per lane (`createScopeMiddleware`, `createConfigMiddleware`, etc.). The lane model is for clarity and typing, not for multiplying authoring APIs.
Do **not** use non-provider builders to add context; they intentionally expose only `next()`.

Name middleware by what it is:

- zero-config middleware exports a ready-to-use value (`sqlProvider`, `feedbackProvider`, `readOnlyMode`)
- configurable middleware exports an explicit constructor (`createAnalyticsMiddleware`)

Keep middleware filenames short and semantic:

- plain concern names for configurable middleware (`analytics.ts`)
- provider/guard names where the role matters (`sql-provider.ts`, `feedback-provider.ts`, `read-only-mode.ts`)

Keep providers flat in `src/orpc/middleware/` unless the provider set becomes large enough to justify a second routing layer.

### Attach-Time Mental Model

Context requirements are checked at the point where middleware is attached.

That means a provider's required context fragment does **not** automatically
become a new public entry requirement for the package.

What matters is whether the required context already exists in the current
context at the attachment site.

Concrete example:

- `sqlProvider` is attached earlier in `src/service/impl.ts`
- it creates `context.provided.sql`
- later, a module-local service provider in `setup.ts` may require
  `provided.sql` plus `scope.workspaceId`
- that works because both are already present by the time the module provider is
  attached

The key consequence:

- if a required context fragment is already satisfied upstream, attaching a
  downstream provider does **not** expand the package's public initial context
- if the fragment is **not** already satisfied, the type system surfaces that at
  the attachment site and the missing context would need to come from earlier in
  the pipeline

This is the intended oRPC usage model:

- middleware declares dependent context
- `.use(...)` checks that dependency against the current context where the
  middleware is attached
- our provider-builder typing reinforces that model; it does not bypass or
  replace it

### Provider Middleware Rule

Use exactly two provider shapes:

- **Self-provisioning provider**: allowed when the middleware can fully create its output on its own, so any input it reads is optional.
- **Input-requiring provider**: allowed when the middleware needs a host-provided prerequisite before it can produce its output; that prerequisite must already exist in initial context before the middleware is attached.

Rule of thumb:

- If the middleware can fall back and provision the capability itself, make the input optional and let the provider own the output.
- If the middleware cannot self-provision, do **not** pretend it can “create” its own prerequisite; declare the prerequisite in initial context and let the provider only create the downstream execution key.

Why this rule exists:

- oRPC distinguishes [initial context](https://orpc.dev/docs/context) from [execution context](https://orpc.dev/docs/context#execution-context).
- Middleware may declare [dependent context](https://orpc.dev/docs/middleware#dependent-context), and any context passed to `next({ context })` is [merged with the existing context](https://orpc.dev/docs/middleware#middleware).
- That means middleware can add downstream execution context, but it cannot magically satisfy its own missing required input. The official playground DB provider works because it uses an optional input and can self-provision when absent ([playground example](https://github.com/middleapi/orpc/blob/main/playgrounds/contract-first/src/middlewares/db.ts)).

**Self-provisioning provider**

```ts
const withDb = os
  .$context<{ db?: DB }>()
  .middleware(async ({ context, next }) => {
    const db = context.db ?? createFakeDB()

    return next({
      context: { db },
    })
  })

implement(contract).$context<{}>().use(withDb) // works
```

- **Receives**: optional `db`
- **Creates**: downstream `db`
- **Why it works**: the middleware can satisfy its own seam because the input is optional

**Input-requiring provider**

```ts
const withDb = os
  .$context<{ dbPool: DBPool }>()
  .middleware(async ({ context, next }) => {
    return next({
      context: { db: makeDb(context.dbPool) },
    })
  })

implement(contract).$context<{}>().use(withDb) // does not type-check
implement(contract).$context<{ dbPool: DBPool }>().use(withDb) // works
```

- **Receives**: required `dbPool`
- **Creates**: downstream `db`
- **Why the first case fails**: the provider cannot satisfy its own prerequisite; `dbPool` must already be part of initial context

### Execution Context Output Rule

Provider middleware should return only the new execution keys it introduces.

- Do **not** spread the existing `context` back into `next({ context })`.
- Rely on oRPC’s merge behavior instead: the additional `context` you pass to `next` is merged with the existing context.
- Providers write into `context.provided.*`; they do not write arbitrary top-level execution keys.
- The provider helpers in this repo accept only the new fragment and merge it into the existing `provided` bag internally.
- If you want ergonomic access, reshape locally in setup/handler code rather than creating global alias middleware for semantic lanes.

For typing the provided execution context:

- keep provider outputs lightweight under `provided` (`{ sql }` -> `context.provided.sql`)
- use an explicit shape check only when the output is non-trivial or easy to drift
- `satisfies` is acceptable as a local guardrail, but it is not mandatory for every provider

### What This Enables

- Reusable providers that can either self-bootstrap or consume host-provided prerequisites.
- A clean split between **what must exist at the boundary** (initial context) and **what middleware makes available downstream** (execution context).
- Clear authoring choices for agents: either make a provider self-contained, or make its prerequisite explicit and keep the provider focused on downstream capability creation.

### Choosing Between The Two

- Choose **self-provisioning** for local/test/dev conveniences or defaultable capabilities.
  - Example: fake/in-memory DB, fallback feedback session.
- Choose **input-requiring** when the capability depends on a real host-owned prerequisite.
  - Example: `dbPool -> db`, `authClient -> user`, `feedbackClient + invocation.traceId -> feedbackSession`.

Down the road, this gives us a stable rule for SDK authoring:

- providers may add execution keys,
- but required host-owned inputs remain explicit initial-context requirements unless the provider can truly self-provision.

### Dependency vs Middleware Rule

When deciding where something belongs:

- Put it in **`deps`** when the host/environment must provide it directly and stably.
- Put it in **`scope`** when it describes what a client instance is stably scoped to.
- Put it in **`config`** when it is stable package behavior/configuration for that client instance.
- Put it in **`invocation`** when it must be provided per call and enforced by the package boundary.
- Make it **provider middleware** when middleware derives or attaches a new execution capability for downstream use.
- Keep simple dependency-consuming middleware reading from `context.deps.*`; do not wrap a dependency in provider middleware unless the middleware actually creates or normalizes something new.

Examples:

- `deps.logger`, `deps.analytics`, `deps.dbPool` are host-owned dependencies.
- `scope.workspaceId` is stable business scope.
- `config.readOnly` and `config.limits.maxAssignmentsPerTask` are stable package behavior config.
- `invocation.traceId` is required per-call input.
- `provided.sql`, `provided.feedbackSession`, and `provided.repo` are execution keys created/attached by middleware or module setup.

### Kit-Level Middleware Pattern

Use kit-level middleware for cross-cutting behavior that should be reusable across domain packages.

- Define one concern per file in `src/orpc/middleware/` when the concern is still package-local middleware (for example `analytics.ts`).
- Wire truly “applies everywhere” package middleware into `src/service/impl.ts` so it is consistent and obvious across packages.
- Keep service middleware authoring focused on domain semantics (read-only mode, authz/tenancy guards).

### Telemetry Posture

For this repo, baseline tracing should come from the host/runtime via the
official oRPC OpenTelemetry integration, not from package-local middleware.

- The canonical host seam should be a shared bootstrap helper above domain
  packages (for example `installRawrOrpcTelemetry(...)`), called before app and
  route composition.
- Treat package-local telemetry middleware as the wrong default for the golden
  example.
- Keep domain packages compatible with required per-call invocation input, but
  do not make custom tracing middleware the source of truth for baseline
  telemetry.
- Use package/service middleware only for observability side effects or span
  enrichment that sit on top of the baseline runtime instrumentation.
- Keep one framework-level observability middleware in the package SDK seam and
  one package-level observability middleware in the service seam so every domain
  package gets both by default.

### Domain-Wide Middleware Pattern

Use domain-wide middleware for domain semantics that should apply uniformly across modules.

- Define one concern per file in `src/service/middleware/`.
- Apply service middleware in `src/service/impl.ts` so middleware order is centralized and oRPC-native.

### Module-Local Middleware Pattern

Use module-local middleware only when it is truly local to one module (or sub-tree of a module).

- Keep standalone module-local middleware next to the module in `src/service/modules/<name>/middleware.ts` when that middleware is worth naming separately.
- Keep module-local composition/attachment in `src/service/modules/<name>/setup.ts`.
- Promote to `src/service/middleware/*` only when two+ modules genuinely share it.
- Read-only policy should use procedure metadata (`idempotent`) plus stable package config (`config.readOnly`) to block mutations.
- Invocation-trace middleware should consume `context.invocation.traceId` through native client context, not through middleware-context attachment.

## Boundary Error Standard

### Caller Contract

- ORPC procedure `.errors(...)` declarations are the canonical caller contract.
- Procedures throw only caller-actionable boundary errors.

### Inside Boundary

- Expected business states should be values (`null`, `exists`, result objects).
- Procedure handlers decide when those states become caller-actionable errors.

### Internal Failures

- Unexpected internals should not be part of typed boundary error contracts by default.
- Default posture: allow unexpected internals to bubble; rely on logging/tracing for diagnosis.

### On Mapping Layers

- No standing domain-catalog/unwrap translation layer in active examples.
- Inline conversion at the procedure boundary is the intended pattern.

### Contract-Router / Global Error Policy

Do not define a mandatory "every package must expose these errors" set by default.

Use **contract-router-level** shared `.errors(...)` (`oc.errors(...).router({...})`) only when all conditions are true:

- the error is truly cross-cutting and can occur on every procedure,
- the failure is enforced by shared middleware/infrastructure (not ad hoc handler logic),
- callers should branch on it consistently across procedures.

Examples that may justify router-level shared errors later:

- uniform auth failures (`UNAUTHENTICATED`, `FORBIDDEN`),
- uniform platform guards (`RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `PACKAGE_DISABLED`).

Do not promote domain/business errors (for example `RESOURCE_NOT_FOUND`) to package-wide/global by default.
Those remain **procedure-level on module contract procedures** unless a package has a real universal guard that makes them universally possible.

For `example-todo` in this phase: no package-wide global error set.

Precision notes:

- `.errors(...)` lives on **contract procedures** (and optional contract-router builder), not on the package composed router object in `src/router.ts`.
- Current default is explicit per-procedure declarations in `service/modules/*/contract.ts`.

## neverthrow Guidance

Neverthrow is available, but not an always-on repository API contract.

Use it where it adds leverage:

- multi-step composition and recovery,
- internal pipelines where `Result` flow improves clarity.

Avoid forcing neverthrow where simple `Promise<T>` is clearer.

Boundary rule still applies either way: procedures expose ORPC boundary errors, not internal mechanics.

## Error Definition Placement

Use sharing-based placement:

- `service/shared/errors.ts` for reusable cross-module boundary error definitions,
- module-specific boundary errors inline in `service/modules/<name>/contract.ts`,
- procedure-local errors only when truly local to one procedure.

## Shared Construct Placement

When a construct is shared by multiple modules, choose the directory based on semantics:

- `service/shared/`: domain semantics (errors, schemas/types, invariants).
- `service/adapters/`: shared adapter/infrastructure helpers (SQL helpers, mapping utilities).

Each procedure still declares only the errors it can throw.

## `UnexpectedInternalError` Usage

Use `UnexpectedInternalError` only when local code detects an invariant violation you want to classify in telemetry.

Do not use it as a default replacement for ordinary thrown internals.

If you do not need invariant classification, plain internal throws are sufficient.
