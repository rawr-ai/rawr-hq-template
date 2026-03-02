# Guidance

## What This Document Is

- `guidance.md` is operational implementation guidance.
- It captures current defaults and conventions for building/maintaining domain example packages.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression (invariants + axes) belongs in `examples.md`.

## Package Shape (Always-On)

Use one stable top-level structure across package sizes:

- `src/index.ts` for public package exports only,
- `src/client.ts` for in-process client construction only,
- `src/router.ts` for package router composition only,
- `src/orpc-runtime/` for shared ORPC runtime scaffolding,
- `src/modules/` for capability module contracts and implementations.

Inside `src/orpc-runtime/`, `context.ts` is an always-present scaffold slot.
Inside `src/orpc-runtime/`, `module.ts` is an always-present scaffold slot.
Inside `src/orpc-runtime/`, `middleware/` is the always-on slot for package-global middleware concerns.

Do not use `src/boundary/` as the internal scaffolding folder name; it overloads
public-boundary and runtime-boundary semantics.

## Scaffold Determinism Rule

When choosing between "minimal now" vs "predictable later", prefer predictable scaffold slots for core structure.

- Keep always-present structural files that are expected as a package grows (for example `orpc-runtime/context.ts`), even if initially thin.
- Do not push structural timing decisions ("add this file later") onto agents for core package layout.
- Use templates/CLI shape flags to vary content depth, not to vary foundational topology.

## Terminology (This Repo, Not Generic oRPC)

To avoid overloaded "router" language, these terms are canonical in this doc:

- **Module contract object**: plain object exported from `modules/<name>/contract.ts`.
  Example:
  ```ts
  export const contract = {
    create: procedure({ idempotent: false }).input(...).output(...).errors(...),
    get: procedure({ idempotent: true }).input(...).output(...).errors(...),
  };
  ```
- **Contract-router builder**: optional oRPC builder form `oc.errors(...).router({...})`.
  We are not using this by default in `example-todo`.
- **Module implementation router**: server router exported from `modules/<name>/router.ts` via `createModule(contract)`.
- **Package composed router**: plain object router exported from `src/router.ts` and consumed by `createRouterClient`.
- **Shared ORPC runtime scaffolding**: reusable module-facing internals under `src/orpc-runtime/*` (base context, deps contracts, shared metadata, shared error definitions).

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
- Do not export runtime internals (`orpc-runtime/*`) from root.
- Do not export module schemas/contracts/repositories from root by default.
- Do not keep compatibility aliases in examples unless explicitly required by a migration plan.

## Module Shape: `contract.ts` + `router.ts`

Each module should split boundary definition from behavior:

- `contract.ts`: procedure names, input/output schemas, `.errors(...)` declarations.
- `router.ts`: handler implementation only (`createModule(contract)`), module-local wiring, orchestration logic.

Rules:

- Do not duplicate contract shape in `router.ts`.
- Do not place business orchestration in module `contract.ts`.
- Start each module router from `createModule(contract)` in `orpc-runtime/module.ts`.
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

- define shared package metadata once in `orpc-runtime/meta.ts`,
- expose a helper (for example `procedure({ idempotent })`) that starts procedure chains,
- keep module contracts explicit by setting `idempotent` on every procedure.

Why this baseline:

- high signal for agent/runtime decisions (safe retries, mutation awareness),
- low authoring overhead,
- avoids repeating derivable labels ad hoc in every module.

Not required in this phase:

- `sideEffects` classification (deferred until we have a concrete automated consumer and enforcement).

## Context + Middleware Layering

Use context/middleware at the level where each concern actually belongs:

- Initial context (`BaseContext`) carries `deps` at package boundary.
- `deps` should extend shared `BaseDeps` from `@rawr/hq-sdk` (mandatory `logger`).
- Module middleware injects module-local repos/services into execution context.
- Package-level middleware should be used for real runtime concerns (auth, tracing, tenant/session, transaction/request scope), not for aliasing `deps` fields.
- Keep shared ORPC setup in `orpc-runtime/module.ts` (context baseline) and reusable middleware definitions in `orpc-runtime/middleware/with-*.ts`.
- Apply package-wide middleware from each module implementer (`createModule(contract).use(withX)`), so ORPC keeps concrete per-module typing.

Practical defaults:

- Access logger/clock as `context.deps.logger` / `context.deps.clock`.
- Avoid alias-only middleware like `deps.logger -> logger` unless there is a concrete runtime reason.

### Package-Global Middleware Pattern

Use package-global middleware for cross-cutting behavior that should apply to every module router automatically.

- Define one concern per file in `src/orpc-runtime/middleware/` (for example `with-read-only-mode.ts`, `with-telemetry.ts`).
- Compose package-wide middleware in each module router immediately after `createModule(contract)`:
  `createModule(contract).use(withTelemetry).use(withReadOnlyMode)`.
- Keep module routers focused on module-local repo/service wiring and handlers.
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
- Current default is explicit per-procedure declarations in `modules/*/contract.ts`.

## neverthrow Guidance

Neverthrow is available, but not an always-on repository API contract.

Use it where it adds leverage:

- multi-step composition and recovery,
- internal pipelines where `Result` flow improves clarity.

Avoid forcing neverthrow where simple `Promise<T>` is clearer.

Boundary rule still applies either way: procedures expose ORPC boundary errors, not internal mechanics.

## Error Definition Placement

Use sharing-based placement:

- `orpc-runtime/errors.ts` for reusable cross-module boundary error definitions,
- module-specific boundary errors inline in `modules/<name>/contract.ts`,
- procedure-local errors only when truly local to one procedure.

Each procedure still declares only the errors it can throw.

## `UnexpectedInternalError` Usage

Use `UnexpectedInternalError` only when local code detects an invariant violation you want to classify in telemetry.

Do not use it as a default replacement for ordinary thrown internals.

If you do not need invariant classification, plain internal throws are sufficient.
