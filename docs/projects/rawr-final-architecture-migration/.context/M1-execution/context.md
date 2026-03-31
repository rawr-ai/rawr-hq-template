# Current Issue Context

## Active Slice

- Issue: `M1-U03`
- Title: `Migrate HQ operational truth into HQ Ops and rewire consumers`
- Status: implementation complete; commit/submit closeout on `agent-FARGO-M1-U03-migrate-hq-ops-and-rewire-consumers`
- Dependency state: `M1-U02` is done and supplies the canonical HQ Ops shell; this slice now moves real authority into that shell and deletes the old owners from the live lane
- Current role of the slice: collapse four operational owners (`control-plane`, `state`, `journal`, `security`) into one canonical service package without introducing new facade packages or leaving dual authority behind

## Why This Slice Matters

This is the semantic heart of Phase 1. If operational truth still lives across four old owners, later plugin-topology and app-shell work would be resting on split meaning.

U03 therefore has to do three things at the same time:

- move the old owner logic into `services/hq-ops`
- cut live consumers directly to `@rawr/hq-ops` root or thin HQ Ops module subpaths
- delete the old owners honestly enough that the proof band can verify they are actually gone

This is not import cleanup. This is the authority collapse that makes later slices legitimate.

## Done Bar

This slice is done only when all of the following are true:

- no live imports remain from `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, or `@rawr/security`
- `services/hq-ops` owns the migrated config, repo-state, journal, and security code
- active CLI, server, plugin, and tooling consumers cut directly to `@rawr/hq-ops` root or explicit thin subpaths
- the old owners are removed from the live lane instead of being preserved as wrappers
- continuity proof exists for:
  - config validation / layered config merge behavior
  - repo-state locking and mutation behavior
  - journal search / snippet write behavior
  - security gate / report behavior
- the HQ stack still comes up cleanly with observability required and the archived false-future routes still stay dead

## Canonical References

Read these before starting or resuming:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
4. [M1-U03-migrate-hq-ops-and-rewire-consumers.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md)
5. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
6. [guidance.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/guidance.md)
7. [DECISIONS.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/DECISIONS.md)

## Relevant Surfaces

Canonical destination:

- `services/hq-ops/`

Old owners being collapsed:

- `packages/control-plane/`
- `services/state/`
- `packages/journal/`
- `packages/security/`

Live consumer zones:

- `apps/server/src/bootstrap.ts`
- `apps/server/src/host-satisfiers.ts`
- `apps/server/test/{rawr.test.ts,storage-lock-route-guard.test.ts}`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/config/*`
- `apps/cli/src/commands/journal/*`
- `apps/cli/src/commands/reflect.ts`
- `apps/cli/src/commands/workflow/{forge-command,harden}.ts`
- `plugins/api/state/src/*`
- `plugins/cli/plugins/src/commands/plugins/sync/sources/*`
- `plugins/cli/plugins/src/commands/plugins/web/*`
- `plugins/cli/plugins/src/lib/{factory,security}.ts`
- `packages/agent-sync/src/lib/{layered-config,targets}.ts`
- `packages/hq/src/{scaffold/factory.ts,security/module.ts}`

Proof / workspace wiring that must change with the cut:

- `scripts/phase-1/verify-no-old-operational-packages.mjs`
- `vitest.config.ts`
- root `package.json`
- `tools/architecture-inventory/node-4-extracted-seams.json`

## Key Insights Already Established

- `services/example-todo` remains the exact shell model for the service package itself; U03 must not blow up the root boundary just because four old owners are being folded in.
- The honest public boundary for U03 is:
  - package root stays thin (`createClient`, `router`, `Client`, `Router`)
  - service contract stays at `./service/contract`
  - migrated operational support APIs land on thin subpaths only:
    - `@rawr/hq-ops/config`
    - `@rawr/hq-ops/repo-state`
    - `@rawr/hq-ops/journal`
    - `@rawr/hq-ops/security`
- `repo-state` is the only currently live transport-facing service surface among the old owners. Its service contract/client move into HQ Ops while the other three owners move as support APIs inside the same package.
- `packages/hq` is not deleted in this slice, but any of its live imports from old operational owners must still be rewired now so U03 can actually eliminate those owners.
- No compatibility owner packages should survive this slice. If an API is still needed, it belongs in `services/hq-ops`, not behind a new alias package.

## Invariants and User Constraints

- Stay in this single worktree only.
- Work on `agent-FARGO-M1-U03-migrate-hq-ops-and-rewire-consumers`.
- Keep the milestone packet as execution authority and the architecture spec as canonical architecture truth.
- Keep `context.md` current-issue-only and replace it again before U04.
- Use Narsil for structural code-intel where helpful, but remember the indexed primary tree is `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` and must be advanced after the next commit.
- Use agents for review and bounded validation, not for semantic migration decisions.
- Before committing code changes, have an agent validate the managed HQ stack with:
  - `bun run rawr hq up --observability required --open none`
  - status / health checks
  - log inspection
  - confirmation that first-party state still works
  - confirmation that archived coordination/support-example routes still return `404`

## Verification Bar

Run at minimum:

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/agent-sync run typecheck`
- `bun --cwd apps/server run test`
- `bun --cwd apps/cli run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `rg -n '@rawr/(control-plane|state|journal|security)\\b' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

Add targeted package-local HQ Ops tests as the migrated code lands.

## Current Status

- Branch is `agent-FARGO-M1-U03-migrate-hq-ops-and-rewire-consumers`.
- U03 code motion is complete:
  - `services/hq-ops` owns config, repo-state, journal, and security
  - live consumers cut to HQ Ops root or thin subpaths
  - `packages/control-plane`, `services/state`, `packages/journal`, and `packages/security` are gone from the live tree
- Proof upgrades also landed:
  - direct HQ Ops security cwd propagation tests
  - stronger CLI journal tail coverage
  - hard delete verification for old owner roots
  - stale Phase D/F proofs retargeted to the archived-coordination and HQ Ops reality
- Review findings were incorporated:
  - CLI security path no longer goes through `@rawr/hq/security`
  - plugin/web security gating passes the discovered workspace root into HQ Ops
  - the managed HQ stack came back healthy after one restart during validation

## Immediate Next Actions

1. Commit the U03 slice with the completed paper trail.
2. Run `gt ss --draft` to refresh the stack PR.
3. Move the primary Narsil tree to the new U03 commit and let it reindex.
4. Replace `context.md` for `M1-U04` before starting the next slice.
