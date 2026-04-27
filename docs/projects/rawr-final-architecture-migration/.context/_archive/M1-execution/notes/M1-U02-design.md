# M1-U02 Design Packet

## Purpose

This is the hardened pre-implementation design for `M1-U02` on `agent-FARGO-M1-U02-reserve-hq-ops-seam`.

It exists so the slice can be reviewed, hardened, and re-entered cleanly before code is written. It is not a scratchpad. It is the exact shell plan for reserving `services/hq-ops`.

## Canonical Inputs

The design is constrained by these sources, in this order:

1. `docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md`
2. `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`
3. `docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md`
4. `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
5. `docs/projects/orpc-ingest-domain-packages/guidance.md`
6. `docs/projects/orpc-ingest-domain-packages/DECISIONS.md`
7. `services/example-todo/*` as the exact shell/model reference

## Design Intent

`services/hq-ops` must be created as a real ORPC service package, following `services/example-todo` exactly in external shell and internal load-bearing structure, while remaining a reservation slice only.

That means:

- one package boundary: `@rawr/hq-ops`
- one service definition seam
- one central implementer seam
- one service router composition choke point
- service-wide required middleware split into `service/middleware/*`
- each reserved module gets the same `contract.ts` + `middleware.ts` + `module.ts` + `repository.ts` + `router.ts` + `schemas.ts` shell as `example-todo`
- thin package boundary files stay thin:
  - `src/index.ts`
  - `src/client.ts`
  - `src/router.ts`

The shape must feel like `example-todo`, not like a reduced “placeholder service.”

## Hard Constraints

- Do not move production logic in U02.
- Do not rewire any consumer in U02.
- Do not split `hq-ops` into multiple service packages.
- Do not invent a simpler one-off structure just because the modules are placeholders.
- Do not skip canonical shell bones that `example-todo` already proved are load-bearing.
- Keep comments intentional and structurally explanatory, following the `example-todo` style.

## Chosen Shape

Create this package:

```text
services/hq-ops/
  package.json
  tsconfig.json
  src/
    index.ts
    client.ts
    router.ts
    service/
      base.ts
      contract.ts
      impl.ts
      router.ts
      middleware/
        analytics.ts
        observability.ts
      shared/
        README.md
        errors.ts
        internal-errors.ts
      modules/
        config/
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
          schemas.ts
        repo-state/
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
          schemas.ts
        journal/
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
          schemas.ts
        security/
          contract.ts
          middleware.ts
          module.ts
          repository.ts
          router.ts
          schemas.ts
  test/
    service-shape.test.ts
```

Also create:

- `scripts/phase-1/verify-hq-ops-service-shape.mjs`

Also update:

- `tools/architecture-inventory/node-4-extracted-seams.json`
- `docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md`
- `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md` when the slice lands

## Exact Modeling Rule

Use `services/example-todo` as the exact reference model for:

- package-level file layout
- service-base comment posture
- central implementer structure
- package boundary thinness
- required service middleware split
- per-module `contract/middleware/module/repository/router/schemas` split
- service-router composition style

Do not follow `services/state` for shell layout when it diverges from `example-todo`.

`services/state` remains structural prior art only for:

- a simpler repo-root scope shape
- narrow repo-root observability payload ideas

## Package Boundary Plan

`package.json`

- name: `@rawr/hq-ops`
- tags:
  - `type:service`
  - `role:servicepackage`
  - `migration-slice:structural-tranche`
- scripts:
  - `build`
  - `sync`
  - `structural`
  - `typecheck`
  - `test`
- exports:
  - `.`
  - `./router`
  - `./service/contract`

Do not widen the package boundary beyond the `example-todo` model in U02. The
reserved module seams remain internal until a later slice explicitly proves they
must be exported.

## Service Definition Plan

`src/service/base.ts`

- mirror `example-todo` structure and comment style
- define one canonical `defineService<{ initialContext, invocationContext, metadata }>(...)`
- keep the declaration intentionally narrow and structural

Planned context lanes:

- `deps: {}`
- `scope: { repoRoot: string }`
- `config: {}`
- `invocation: { traceId: string }`
- metadata entity vocabulary:
  - `"service"`
  - `"config"`
  - `"repoState"`
  - `"journal"`
  - `"security"`

The purpose is not semantic completeness. The purpose is to reserve the correct service language and package-wide middleware seam without inventing fake business behavior.

## Middleware Plan

Create the same service-wide middleware split as `example-todo`:

- `src/service/middleware/observability.ts`
- `src/service/middleware/analytics.ts`

These remain lightweight and structural:

- observability adds repo-root / trace-id fields
- analytics adds repo-root / trace-id payload

No extra service-wide providers or guards in U02 unless the shell requires them.

`src/service/impl.ts` should therefore mirror the `example-todo` shape but likely only supply the required service middleware extensions, with no additional `.use(...)` layers beyond what the reservation slice actually needs.

## Module Plan

Each reserved module gets the exact `example-todo` module topology:

- `contract.ts`
- `middleware.ts`
- `module.ts`
- `repository.ts`
- `router.ts`
- `schemas.ts`

But the content remains reservation-only:

- `contract.ts` exports one structural reservation procedure per module so the package can preserve the canonical `example-todo` contract/router/module assembly pattern without pulling real operational logic forward
- `middleware.ts` exports the generic no-op additive placeholders:
  - `observability`
  - `analytics`
  - `repository`
  - re-export helpers like `createProcedureObservability` / `createProcedureAnalytics`
- `repository.ts` exports the placeholder repository constructor for the module seam
- `schemas.ts` reserves the module-local schema anchor, even if it is minimal
- `module.ts` starts from `impl.<module>` and attaches the placeholder middleware exactly the way `example-todo` does
- `router.ts` implements the one structural reservation procedure and exports the contract-enforced module router

This is deliberately not “minimum shell.” It is the full service package skeleton with module bones already present.

## Root Composition Plan

`src/service/contract.ts`

- compose the four module contracts into the root contract object:
  - `config`
  - `repoState`
  - `journal`
  - `security`

`src/service/router.ts`

- compose the four module routers into the root router object in the same style as `example-todo`

`src/router.ts`

- thin re-export only

`src/index.ts`

- thin re-export only

`src/client.ts`

- mirror `example-todo`’s `defineServicePackage(router)` boundary shape exactly

## Shared Anchor Plan

Reserve the same `service/shared` anchors that `example-todo` already treats as
load-bearing:

- `src/service/shared/README.md`
- `src/service/shared/errors.ts`
- `src/service/shared/internal-errors.ts`

These stay intentionally thin in U02, but they must exist so the package shape
does not under-model the future service boundary.

## Proof Plan

`scripts/phase-1/verify-hq-ops-service-shape.mjs` will prove:

- `services/hq-ops` exists
- package name / tags / targets / exports are correct
- service shell files exist
- service middleware files exist
- shared service anchors exist
- all four module directories exist with the exact placeholder shell files
- each reserved module exposes exactly one structural reservation procedure through the canonical module composition seam
- root contract and root router compose the four modules
- the package is structurally reservation-only:
  - no consumer rewires
  - no imports from `packages/control-plane`, `packages/journal`, `packages/security`, or `services/state`
  - no module-local business implementation beyond the placeholder shell

`test/service-shape.test.ts` will give the package a local shell test so the package is not only verified by an external script.

## Architecture Inventory Plan

Add `@rawr/hq-ops` to `tools/architecture-inventory/node-4-extracted-seams.json` with:

- config: `services/hq-ops/package.json`
- tags:
  - `type:service`
  - `role:servicepackage`
  - `migration-slice:structural-tranche`
- targets:
  - `build`
  - `sync`
  - `structural`
  - `typecheck`
  - `test`

This makes `sync:check --project @rawr/hq-ops` real immediately.

## Review Questions Before Implementation

These are the only things that should be challenged before code lands:

1. Should the package expose module subpaths in U02 already?
   Current answer: no. `example-todo` is the exact shell model, and U02 does not yet need a widened package boundary.
2. Should module placeholders be the full `contract/middleware/module/router` shell or something smaller?
   Current answer: full shell plus `repository.ts` and `schemas.ts`, because `example-todo` is the exact model and the user explicitly rejected conservative minimization.
3. Should the reservation slice keep module middleware composition fully live even before business logic moves?
   Current answer: yes. Each module reserves one structural reservation procedure so `module.ts` can still attach the canonical module middleware/provider chain and the package can keep the direct `defineServicePackage(router)` boundary.
4. Should `impl.ts` include any extra `.use(...)` providers beyond required service middleware?
   Current answer: no, not unless type/system shape forces one; U02 is reservation only.
5. Should the service-wide context be richer than `{ deps: {}, scope: { repoRoot }, config: {}, invocation: { traceId } }`?
   Current answer: no for U02; reserve only what the skeleton needs now.
6. Does exact shell fidelity imply a dedicated Vitest project entry?
   Current answer: yes. Add an `hq-ops` project to `vitest.config.ts` and use `vitest run --project hq-ops` in the package test script.

## Implementation Sequence

1. Create package shell and module shell.
2. Add package scripts/exports/tags and architecture inventory entry.
3. Add Phase 1 verifier script and local service-shape test.
4. Run:
   - `bun run sync:check`
   - `bun --cwd services/hq-ops run typecheck`
   - `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
5. Review the implementation against `example-todo` again before any commit.
