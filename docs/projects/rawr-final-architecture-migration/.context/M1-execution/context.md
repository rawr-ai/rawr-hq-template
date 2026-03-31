# Current Issue Context

## Active Slice

- Issue: `HQ Ops service-shape follow-up`
- Branch: `agent-FARGO-M1-U02-followup-hq-ops-service-shape`
- Status: re-grounded; implementation not started on this branch yet
- Immediate mission: make `services/hq-ops` a real service package that matches `services/example-todo` all the way down, then rewire live consumers onto the actual service boundary

## Problem Statement

`services/hq-ops` currently looks like a service shell from the outside, but it still leaks business capability ownership through package-style subpaths:

- `@rawr/hq-ops/config`
- `@rawr/hq-ops/repo-state`
- `@rawr/hq-ops/journal`
- `@rawr/hq-ops/security`

That means the repo is still treating HQ Ops as a package bucket with a decorative service shell wrapped around it, not as one service boundary with internal modules. This violates:

- the canonical architecture spec
- the U02 package-shape decision
- the user’s explicit instruction to follow `services/example-todo` exactly

## What “Right” Means Here

The fix is not a one-layer cleanup. It is done only when all of these are true at the same time:

- `services/hq-ops` keeps the same public package posture as `services/example-todo`
  - package root only
  - `./router`
  - `./service/contract`
- business capability ownership lives under `src/service/modules/*`, not top-level capability buckets
- active consumers stop importing `@rawr/hq-ops/{config,repo-state,journal,security}`
- in-process callers go through the canonical service client instead
- tests and proofs are updated so the corrected boundary is enforced and doesn’t silently drift back

## Canonical References

Read these before editing:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
4. [guidance.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/guidance.md)
5. [DECISIONS.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/DECISIONS.md)
6. [M1-U02-reserve-hq-ops-seam.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md)
7. [M1-U03-migrate-hq-ops-and-rewire-consumers.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md)
8. [services/example-todo/package.json](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/package.json)
9. [services/example-todo/src/service/base.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/base.ts)
10. [services/example-todo/src/service/modules/tasks/module.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/modules/tasks/module.ts)
11. Git tag `archive/pre-u01-last-live-coordination-support-example`

## Findings That Must Not Be Forgotten

- U02 explicitly decided that `@rawr/hq-ops` should keep the same narrow public export surface as `example-todo`. U03 broke that by adding `./config`, `./repo-state`, `./journal`, and `./security`.
- `repo-state` is already partly service-shaped because live callers use `createClient(...).repoState.getState(...)` in some places.
- `config`, `journal`, and `security` are still mostly direct library exports with no real service-boundary mediation.
- There are still top-level business-capability directories under `services/hq-ops/src/`:
  - `config`
  - `repo-state`
  - `journal`
  - `security`
- That top-level capability layout is itself evidence that the package is still acting like a bucket, not like `example-todo`.

## Live Consumer Leak Inventory

Current public leak sites to eliminate:

- `apps/server/src/bootstrap.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/config/*`
- `apps/cli/src/commands/journal/*`
- `apps/cli/src/commands/workflow/{forge-command,harden}.ts`
- `apps/cli/src/lib/security.ts`
- `plugins/cli/plugins/src/commands/plugins/web/*`
- `plugins/cli/plugins/src/commands/plugins/sync/sources/*`
- `plugins/cli/plugins/src/lib/security.ts`
- `plugins/cli/plugins/src/lib/factory.ts`
- `packages/agent-sync/src/lib/{layered-config,targets}.ts`
- `apps/server/test/{rawr.test.ts,storage-lock-route-guard.test.ts}`

## Invariants and User Constraints

- Do not compact yet.
- Do not use explorer/worker agents for this repair.
- If any agent is reused later, keep it on one clean context vector only and compact it before changing tasks.
- Use the tagged pre-archive reference if it helps with wiring/projection understanding; do not claim to be grounded in it unless it was actually inspected.
- Keep the single-worktree Graphite flow intact.
- Before any eventual commit, run the HQ runtime validation gate again with observability required.

## Immediate Next Move

- Finish the repair design note, then start the implementation by collapsing the leaked HQ Ops public API back to the canonical service boundary:
  - inventory every exported capability function still living outside `src/service/modules/*`
  - decide the service-client replacement path for each consumer cluster
  - then edit `services/hq-ops` itself before touching consumers
