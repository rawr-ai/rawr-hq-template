# Current Issue Context

## Active Slice

- Issue: `M1-U02`
- Title: `Reserve the canonical HQ Ops seam`
- Status: implementation in place, local verification green, review/HQ validation pending
- Dependency state: `M1-U01` is complete on the stack; this slice now gates all HQ operational truth moves in `M1-U03`
- Current role of the slice: create the one canonical Phase 1 service home before any config, repo-state, journal, or security truth migrates into it

## Why This Slice Matters

This slice creates the destination before any semantic truth moves. Without a real `services/hq-ops` home, later Phase 1 work would either keep negotiating around legacy packages or silently smear logic across multiple temporary homes.

The slice is deliberately narrow. It reserves canonical space and shape only:

- one service package: `services/hq-ops`
- one service shell: `base`, `contract`, `impl`, `router`
- four internal modules: `config`, `repo-state`, `journal`, `security`
- the same internal load-bearing anchors that `services/example-todo` already proves out:
  - `service/shared/{README,errors,internal-errors}`
  - per-module `contract.ts`, `middleware.ts`, `module.ts`, `repository.ts`, `router.ts`, `schemas.ts`

If this slice starts moving logic or rewiring consumers, it has failed its own boundary and is stealing work from `M1-U03`.

## Done Bar

This slice is done only when all of the following are true:

- `services/hq-ops` exists as one canonical service package, not four separate service roots
- the package has the canonical Phase 1 service shell:
  - `src/service/base.ts`
  - `src/service/contract.ts`
  - `src/service/impl.ts`
  - `src/service/router.ts`
  - thin `src/client.ts`, `src/router.ts`, `src/index.ts`
- placeholder seams exist for:
  - `src/service/modules/config/`
  - `src/service/modules/repo-state/`
  - `src/service/modules/journal/`
  - `src/service/modules/security/`
- the public package boundary still matches `services/example-todo`:
  - `.`
  - `./router`
  - `./service/contract`
- the package shape is structurally proven by `verify-hq-ops-service-shape`
- no production logic has moved and no consumer has been rewired yet

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U02-reserve-hq-ops-seam.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
6. [RAWR_P1_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md)

## Relevant Surfaces

Primary target:

- `services/hq-ops/`

Required shell files:

- `services/hq-ops/package.json`
- `services/hq-ops/src/service/base.ts`
- `services/hq-ops/src/service/contract.ts`
- `services/hq-ops/src/service/impl.ts`
- `services/hq-ops/src/service/router.ts`
- `services/hq-ops/src/client.ts`
- `services/hq-ops/src/router.ts`
- `services/hq-ops/src/index.ts`
- `services/hq-ops/src/service/shared/README.md`
- `services/hq-ops/src/service/shared/errors.ts`
- `services/hq-ops/src/service/shared/internal-errors.ts`

Reserved module seams:

- `services/hq-ops/src/service/modules/config/`
- `services/hq-ops/src/service/modules/repo-state/`
- `services/hq-ops/src/service/modules/journal/`
- `services/hq-ops/src/service/modules/security/`

Expected proof surface:

- `scripts/phase-1/verify-hq-ops-service-shape.mjs`

Exact shell model:

- `services/example-todo/package.json`
- `services/example-todo/src/index.ts`
- `services/example-todo/src/client.ts`
- `services/example-todo/src/router.ts`
- `services/example-todo/src/service/base.ts`
- `services/example-todo/src/service/contract.ts`
- `services/example-todo/src/service/impl.ts`
- `services/example-todo/src/service/router.ts`
- `services/example-todo/src/service/shared/`
- `services/example-todo/src/service/modules/*`
- `vitest.config.ts`

Secondary workspace-target prior art only:

- `services/state/package.json`
- `tools/architecture-inventory/node-4-extracted-seams.json`

## Key Insights Already Established

- Phase 1 explicitly wants one service package with internal modules, not sibling services like `services/hq-ops-config` or `services/hq-ops-journal`.
- `services/example-todo` is the exact shell model, including thin package exports, shared anchors, and per-module `repository.ts` / `schemas.ts` files.
- `services/state` is not the shell model for U02. It is only useful for matching existing workspace targets like `sync`, `structural`, and structural-tranche inventory tagging.
- U02 is a reservation slice. Placeholder module seams are required; real logic movement belongs to `M1-U03`.
- Exact shell fidelity means no widened public exports in U02. The reserved modules stay internal for now.
- Exact shell fidelity also means giving `hq-ops` a dedicated `vitest.config.ts` project entry, like `example-todo`.
- The ledger already points the eventual moves here:
  - `packages/control-plane` -> `services/hq-ops/config`
  - `services/state` -> `services/hq-ops/repo-state`
  - `packages/journal` -> `services/hq-ops/journal`
  - `packages/security` -> `services/hq-ops/security`
- Because U02 sits immediately after the U01 archive cut, it must not reintroduce any deleted topology or old authority while creating the new seam.

## Invariants and User Constraints

- Stay in the single existing worktree only.
- Work on `agent-FARGO-M1-U02-reserve-hq-ops-seam`.
- Do not move production logic in this slice.
- Do not rewire consumers in this slice.
- Do not silently let seam reservation become partial migration.
- Keep `context.md` current-issue-only and replace it again before U03.
- Prefer Narsil for code-intel questions, but remember the indexed primary tree is `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`.
- After the next commit, move that primary tree to the new U02 commit and reindex if needed.
- Use agents for review/verification only, not for semantic seam design.

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun --cwd services/hq-ops run typecheck`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`

Add adjacent checks only if the new package wiring forces them.

## Current Status

- The branch is `agent-FARGO-M1-U02-reserve-hq-ops-seam`.
- It has been restacked on top of U01 after the `dab1b3d4` proof-band repair.
- `context.md` has now been swapped from U01 to U02.
- `services/hq-ops` does not exist yet.
- `services/hq-ops` now exists with the canonical reservation shell, dedicated Vitest project, service-shape verifier, and structural-suite registration.
- Local checks already passing:
  - `bun run --cwd services/hq-ops typecheck`
  - `bun run --cwd services/hq-ops test`
  - `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
  - `bun run sync:check --project @rawr/hq-ops`
  - `bun run --cwd services/hq-ops structural`
- Reservation shape now keeps the real `example-todo` assembly pattern:
  - each module exposes one structural `reservation` procedure
  - `module.ts` attaches `observability`, `analytics`, and `repository` through the canonical module-composition seam
  - `src/client.ts` keeps the direct `defineServicePackage(router)` boundary with no cast workaround
- Peer reviews are running on the implementation, and HQ stack validation has been delegated before commit.

## Immediate Next Actions

1. Consume the peer-review findings and fix any real fidelity or honesty issues they surface.
2. Consume the HQ runtime-validation result and fix anything it finds before commit.
3. If both are clean, update the milestone + issue checkboxes/traceability, run final verification once more, then commit the U02 slice and refresh `context.md` for the next issue.
