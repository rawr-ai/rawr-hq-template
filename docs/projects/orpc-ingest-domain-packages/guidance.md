# Guidance

## What This Document Is

- `guidance.md` is operational implementation guidance.
- It captures current defaults and conventions for building/maintaining domain example packages.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression (invariants + axes) belongs in `examples.md`.

## Agent Click Path (Recommended)

If you are an agent arriving to implement business logic fast:

- **Start at oRPC composition**: `src/orpc.ts` (root contract implementer + package-wide middleware order)
- **Then open the domain router**: `src/domain/router.ts` (module router composition + single final attach)
- **Then live in a module**: `src/domain/modules/<name>/{contract,setup,router}.ts`
- **When you need “the one import for contract authoring / middleware authoring”**: `src/domain/setup.ts` (`oc` + unwrapped `os`)
- **When you need “the one import for handler implementers”**: `src/orpc.ts` (`orpc.<module>` subtrees)
- **When you need kit-level middleware** (telemetry, generic wrappers): `src/orpc/middleware/*`

If you are wiring exports/packaging: `src/index.ts`, `src/client.ts`, and `src/router.ts` (public alias).

## Package Shape (Always-On)

Use one stable top-level structure across package sizes:

- `src/index.ts` for public package exports only,
- `src/client.ts` for in-process client construction only,
- `src/router.ts` for the stable public router export (`@rawr/<pkg>/router`) via re-export,
- `src/orpc-sdk.ts` + `src/orpc/*` for local oRPC kit primitives (domain-agnostic; future-SDK seam),
- `src/orpc.ts` for oRPC-native contract implementation + package-wide middleware stacking,
- `src/domain/` for domain semantics (deps + kit instance + modules + shared constructs + contract bubble-up + router composition).

Always-on slots:

- `src/domain/router.ts` is the always-on domain router composition choke point (single final attach).
- `src/domain/setup.ts` is the always-on kit instance import surface.
- `src/orpc/middleware/*` is the always-on slot for kit-level middleware definitions.
 - `src/orpc.ts` is the always-on oRPC composition surface (implement root contract + attach middleware).

## Scaffold Determinism Rule

When choosing between "minimal now" vs "predictable later", prefer predictable scaffold slots for core structure.

- Keep always-present structural files that are expected as a package grows (for example `src/domain/setup.ts`, `src/domain/router.ts`, `src/orpc.ts`, `src/orpc/middleware/*`), even if initially thin.
- Do not push structural timing decisions ("add this file later") onto agents for core package layout.
- Use templates/CLI shape flags to vary content depth, not to vary foundational topology.

## Terminology (This Repo, Not Generic oRPC)

To avoid overloaded "router" language, these terms are canonical in this doc:

- **Module contract object**: plain object exported from `domain/modules/<name>/contract.ts`.
  Example:
  ```ts
  export const contract = {
    create: procedure({ idempotent: false }).input(...).output(...).errors(...),
    get: procedure({ idempotent: true }).input(...).output(...).errors(...),
  };
  ```
- **Contract-router builder**: optional oRPC builder form `oc.errors(...).router({...})`.
  We are not using this by default in `example-todo`.
- **Module setup**: context injection exported from `domain/modules/<name>/setup.ts` (repos/services derived from `context.deps`).
- **Module implementation router**: oRPC server router exported from `domain/modules/<name>/router.ts` via `os.router({ ... })`.
- **Domain router**: final router exported from `src/domain/router.ts` after module routers are attached once.
- **Kit seam**: domain-agnostic oRPC kit primitives under `src/orpc-sdk.ts` and `src/orpc/*`.
- **oRPC composition**: `src/orpc.ts` (implements the root contract and attaches package-wide middleware).

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
- `setup.ts`: module runtime injection only (middleware extending execution context; repos/services).
- `router.ts`: handler implementation only; exports the contract-enforced module router.

Rules:

- Do not duplicate contract shape in `router.ts`.
- Do not place business orchestration in module `contract.ts`.
- Start each module setup from the central implementer subtree in `src/orpc.ts` (`orpc.<module>`), then inject repos/services.
- Keep module `router.ts` readable as execution logic, not as schema-definition boilerplate.
- Keep module `contract.ts` fully inline for procedure definitions (`.input(...)`, `.output(...)`, `.errors(...)`) in the same chain.
- In procedure chains, place `.errors(...)` after `.input(...)` and `.output(...)` for consistent scan order.
- Prefer TypeBox `description` metadata on schema objects/properties for semantic documentation; avoid extra schema-only JSDoc noise.

## Procedure Metadata Standard

Use oRPC-native procedure metadata (`.meta(...)`) to encode small, agent-useful execution semantics.

Current required baseline:

- shared package metadata: `domain: "todo"` and `audience: "internal"`,
- per-procedure required field: `idempotent: boolean`.

Recommended pattern:

- define base metadata defaults once in `src/domain/setup.ts`,
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

- Initial context carries `deps` at the kit boundary (the `InitialContext` type in `src/orpc/*`).
- `deps` should extend the kit baseline `BaseDeps` (mandatory `logger`), exported via the package kit seam (`src/orpc.ts`).
- Module setup injects module-local repos/services into execution context (`domain/modules/<name>/setup.ts`).
- Kit-level middleware should be used for cross-cutting concerns that should be reusable across domain packages (telemetry/tracing, import-fault classification, request scoping).
- Domain-wide middleware should be used for domain guards/semantics (read-only mode, authz policy, tenancy invariants) that need procedure metadata awareness.
- Apply middleware at most once per concern: attach package-wide middleware in `src/orpc.ts`, then attach module routers once in `src/domain/router.ts`.

Practical defaults:

- Access logger/clock as `context.deps.logger` / `context.deps.clock`.
- Avoid alias-only middleware like `deps.logger -> logger` unless there is a concrete runtime reason.

### Kit-Level Middleware Pattern

Use kit-level middleware for cross-cutting behavior that should be reusable across domain packages.

- Define one concern per file in `src/orpc/middleware/` (for example `with-telemetry.ts`).
- Wire truly “applies everywhere” middleware into `src/orpc.ts` so it is consistent and obvious across packages.
- Keep domain router middleware authoring focused on domain semantics (read-only mode, authz/tenancy guards).

### Domain-Wide Middleware Pattern

Use domain-wide middleware for domain semantics that should apply uniformly across modules.

- Define one concern per file in `src/domain/middleware/`.
- Apply domain middleware in `src/orpc.ts` so middleware order is centralized and oRPC-native.

### Module-Local Middleware Pattern

Use module-local middleware only when it is truly local to one module (or sub-tree of a module).

- Keep it next to the module in `src/domain/modules/<name>/setup.ts` (or an optional `src/domain/modules/<name>/middleware/*`).
- Promote to `src/domain/middleware/*` only when two+ modules genuinely share it.
- Read-only policy should use procedure metadata (`idempotent`) plus runtime config (`deps.runtime.readOnly`) to block mutations.
- Telemetry middleware should log and rethrow; it must not remap boundary errors.

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
- Current default is explicit per-procedure declarations in `domain/modules/*/contract.ts`.

## neverthrow Guidance

Neverthrow is available, but not an always-on repository API contract.

Use it where it adds leverage:

- multi-step composition and recovery,
- internal pipelines where `Result` flow improves clarity.

Avoid forcing neverthrow where simple `Promise<T>` is clearer.

Boundary rule still applies either way: procedures expose ORPC boundary errors, not internal mechanics.

## Error Definition Placement

Use sharing-based placement:

- `domain/shared/errors.ts` for reusable cross-module boundary error definitions,
- module-specific boundary errors inline in `domain/modules/<name>/contract.ts`,
- procedure-local errors only when truly local to one procedure.

## Shared Construct Placement

When a construct is shared by multiple modules, choose the directory based on semantics:

- `domain/shared/`: domain semantics (errors, schemas/types, invariants).
- `domain/adapters/`: shared adapter/infrastructure helpers (SQL helpers, mapping utilities).

Each procedure still declares only the errors it can throw.

## `UnexpectedInternalError` Usage

Use `UnexpectedInternalError` only when local code detects an invariant violation you want to classify in telemetry.

Do not use it as a default replacement for ordinary thrown internals.

If you do not need invariant classification, plain internal throws are sufficient.
