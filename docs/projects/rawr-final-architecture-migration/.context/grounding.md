# Phase 1 Architecture Migration Grounding

This is the canonical entry point for the upcoming conversation about turning Phase 1 into a milestone, decomposing that milestone into Linear issues, and later handing execution to an agent team.

## Source-of-truth order

1. [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md): target-state architecture and invariant source of truth.
2. [Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md): operational source of truth for Phase 1 scope, sequence, fixed decisions, and exit gate.
3. [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md): multi-phase context, plateau model, and downstream handoff.

Current repo docs are context only. They are not canonical architectural truth during this migration unless they align with the documents above.

## Overall migration problem

The migration exists because the repo is semantically mixed, not because the target architecture is unknown. The codebase currently carries multiple answers to:

- what counts as a service
- what counts as runtime projection
- what owns app composition authority
- which plugin topology is canonical
- which prototypes/examples are still allowed to steer the architecture

The full migration fixes that in three plateaus:

1. Phase 1: authority collapse / semantic recovery
2. Phase 2: minimal canonical runtime shell
3. Phase 3: generator-ready capability foundry

The architecture we are driving toward is stable and simple:

- `packages/` = support/tooling matter
- `services/` = semantic capability truth
- `plugins/` = runtime projection
- `apps/` = app identity, manifest, and entrypoints

## What Phase 1 must deliver

Phase 1 is not substrate work. It is the authority-collapse milestone that makes later substrate work safe.

At Phase 1 exit, the repo should have one canonical migration lane and one coherent semantic story:

- `services/hq-ops` exists as the canonical HQ operational service package
- `config`, `repo-state`, `journal`, and `security` live as internal modules inside that one service package
- HQ operational truth no longer lives under `packages/`
- `coordination` is archived and removed from the live lane
- `support-example` is archived and removed from the live lane
- non-runtime agent content is removed from `plugins/`
- `packages/hq` is dissolved
- the live plugin topology is canonical:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- the live app shell is canonical:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- old executable composition authority is no longer authoritative
- Phase 1 structural checks, targeted typechecks, and targeted tests all pass
- parked lanes are explicitly frozen

This is the milestone outcome. If a task does not help reach that plateau, it probably does not belong in Phase 1.

## What Phase 1 is explicitly not delivering

Do not let Phase 2 or Phase 3 work leak into the Phase 1 milestone. Phase 1 does not build:

- the real bootgraph
- the real runtime compiler
- the real process runtime
- canonical Elysia or Inngest harnesses
- generator or codemod infrastructure
- `agent` runtime / OpenShell integration
- steward activation runtime
- rich topology/catalog features
- web/cli/agent runtime rebuilds
- the replacement async proof slice (`example-async`)

Phase 1 may reserve seams for later work. It may not pretend that later work is part of the milestone.

## Guardrails

- Treat the canonical architecture spec as the source of truth for architecture, even if current repo docs or code suggest otherwise.
- Treat the dedicated Phase 1 plan as the source of truth for Phase 1 execution details when it is more specific than the larger migration plan.
- Prefer hard cuts over compatibility layers.
- Only one bridge is allowed across the Phase 1 -> Phase 2 boundary, and only if absolutely necessary:
  - `apps/hq/legacy-cutover.ts`
- No dual authority is allowed to survive:
  - no dual manifests
  - no dual plugin registries
  - no dual executable composition paths
  - no long-lived shim tree or fallback registry
- `coordination` is archived, not migrated.
- `support-example` is archived, not normalized in Phase 1.
- Non-runtime content does not remain under canonical `plugins/`.
- Parked lanes may receive only deletions, rewires, compile fixes, or explicit unblockers. They do not get to steer architecture.
- Every Phase 1 slice must land with its own verification band before the next slice starts.

## Phase 1 planning posture for milestone and issues

The default decomposition backbone is the Phase 1 slice sequence:

1. Guardrails and Phase 1 ledger
2. Archive false futures
3. Reserve the canonical HQ Ops seam
4. Move HQ operational truth into `services/hq-ops` and rewire consumers
5. Dissolve `packages/hq` and land purpose-named tooling boundaries
6. Cut the canonical plugin topology
7. Install the canonical HQ app shell
8. Neutralize old executable composition authority
9. Ratchet proofs, close docs, and freeze the plateau

When we shape the milestone and Linear issues, preserve this dependency order unless there is a very strong reason not to. The sequence is load-bearing:

- semantic truth moves before runtime projection
- runtime projection moves before app shell authority
- app shell authority moves before legacy host authority is neutralized
- proof ratchets land before the plateau is declared done

Each issue should carry:

- a narrow slice outcome
- explicit non-goals
- exact verification requirements
- the specific authorities being removed or installed
- the docs/archive updates that must land in the same slice

## Important doc-tension to resolve correctly

The larger migration plan uses `services/hq-ops/...` family language in places.

The dedicated Phase 1 plan is more specific and fixes the executable Phase 1 decision as:

- one service package: `services/hq-ops`
- four internal modules:
  - `config`
  - `repo-state`
  - `journal`
  - `security`

For milestone and issue shaping, follow the dedicated Phase 1 plan. Do not accidentally decompose HQ Ops into four separate service packages unless the architecture is explicitly re-decided later.

## Relevant grounding documents

- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)
  - Use for ontology, invariants, ownership laws, manifest/entrypoint rules, and what belongs in later phases.
- [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md)
  - Use for the three-plateau framing, overall migration problem, and Phase 2/3 handoff context.
- [Dedicated Phase 1 plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
  - Use for Phase 1 scope, fixed decisions, slice ordering, verification band, and exit gate.

## Working reminder

The conversation that follows should stay focused on one question:

How do we turn the Phase 1 authority-collapse plan into a milestone and a set of executable Linear issues without smuggling in Phase 2 runtime-substrate work or trusting stale repo-local architecture docs over the canonical spec?
