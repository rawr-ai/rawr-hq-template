# M1: Collapse Authority onto the Canonical HQ Lane

**Position in Migration:** Phase 1 of 3 in the final architecture migration.
**Goal:** Re-establish one coherent semantic story in the repo so Phase 2 can build runtime substrate on canonical seams instead of transitional ones.
**Status:** Planned
**Target Date:** TBD
**Owner:** TBD

<!-- Path roots -->
$PROJECT = docs/projects/rawr-final-architecture-migration
$MILESTONE = $PROJECT/milestones/M1-authority-collapse.md
$ISSUES = $PROJECT/issues
$CLI = apps/cli
$SERVER = apps/server
$HQ_APP = apps/hq
$PLUGIN_CLI = plugins/cli/plugins
$AGENT_SYNC = packages/agent-sync

## Why This Milestone Exists

The migration is not blocked by uncertainty about the target architecture. It is blocked because the current repo still carries multiple competing answers to:

- what counts as a service
- what counts as runtime projection
- what owns app composition authority
- which plugin topology is canonical
- which prototypes and examples are still allowed to steer architecture

This milestone is the authority-collapse plateau in the larger three-phase migration:

1. Phase 1: authority collapse / semantic recovery
2. Phase 2: minimal canonical runtime shell
3. Phase 3: generator-ready capability foundry

Phase 1 exists to make the repo tell one story again. It should reduce the state space, remove false futures, and install canonical seams without smuggling in later substrate work.

## What Good Looks Like When This Milestone Is Done

At milestone exit, all of the following are true at the same time:

- HQ operational truth lives in one canonical home for Phase 1 execution: `services/hq-ops`.
- `config`, `repo-state`, `journal`, and `security` live inside that home as the Phase 1 execution modules.
- HQ operational truth no longer lives under semantic-smuggling packages.
- `coordination` is archived and removed from the live lane.
- `support-example` is archived and removed from the live lane.
- the current Cloud Code/Codex marketplace plugin lane remains operational but explicitly frozen in place for Phase 1.
- `packages/hq` is dissolved.
- the only live runtime plugin topology is canonical:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- the only live HQ app shell is canonical:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- old executable composition is no longer authoritative.
- Phase 1 exits with either no executable bridge or exactly one explicitly recorded executable bridge at `apps/hq/legacy-cutover.ts`.
- Phase 1 structural checks, targeted typechecks, and targeted tests all pass.
- parked lanes are explicitly frozen.
- the end-of-milestone review leaves Phase 2 with a clean, explicit entry condition.

## Source-of-Truth Rule for This Milestone

This milestone is grounded by three documents:

1. [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md): the forward-locked decision set for Phase 1 scope, sequencing, fixed decisions, and exit gate.
2. [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md): destination architecture and invariant truth.
3. [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md): overall migration framing and downstream handoff.

For this milestone, the dedicated Phase 1 plan is the execution authority. The canonical architecture spec supplies destination invariants, and the larger migration plan supplies surrounding framing and downstream handoff context. Neither document reopens or overrides Phase 1 decisions that P1 already fixed.

That means this milestone should execute, not renegotiate, the following Phase 1 decisions:

- treat `services/hq-ops` as the Phase 1 execution service package with internal modules, not as four separate services for milestone shaping
- treat `support-example` as archived in Phase 1, with later async proof work reserved for a later slice
- treat `packages/plugin-workspace` as a Phase 1 execution outcome, and treat `plugins/agents/hq` as a frozen compatibility lane whose redesign is explicitly deferred past Phase 1

## Global Guardrails and Semantic Guidance

Implementation agents should continuously anchor on these rules:

- recover authority first; do not build runtime substrate early
- prefer hard cuts over compatibility layers
- remove ambiguity instead of preserving it behind adapters
- semantic truth moves before runtime projection
- runtime projection moves before app-shell authority
- app-shell authority moves before legacy composition authority is neutralized
- each slice closes its own loops; cleanup is not a final catch-all bucket
- the designated cross-phase executable bridge path is `apps/hq/legacy-cutover.ts`
- the only allowed non-executable compatibility carryover is the frozen `plugins/agents/hq` marketplace lane
- no dual authority survives:
  - no dual manifests
  - no dual plugin registries
  - no dual executable composition paths
  - no long-lived fallback registries or shim trees
- parked lanes may receive only deletions, rewires, compile fixes, or explicit unblockers
- do not move, rename, or expand `plugins/agents/hq` during this milestone
- preserve current Cloud Code/Codex sync-install behavior for `@rawr/plugin-hq`; future topology redesign belongs to the next stage
- documentation updates must describe only settled outcomes or archived evidence; avoid doc churn for surfaces that are not done migrating
- do not leak Phase 2 or Phase 3 work into this milestone:
  - no bootgraph implementation
  - no runtime compiler
  - no process runtime
  - no canonical harness buildout
  - no generator/codemod infrastructure
  - no web/cli/agent runtime rebuilds
  - no rich topology/catalog work

## Domino Order

This milestone is deliberately sequenced to make each next move safer than the previous one:

1. install guardrails before code motion
2. archive false futures before creating new authority
3. reserve canonical HQ Ops space before moving semantic truth
4. move semantic truth before deleting ambiguous support layers
5. cut plugin topology only after semantic ownership is stable
6. install app-shell authority before neutralizing old executable authority
7. ratchet proofs, land durable docs, and review the migration only after the plateau is real

That order is load-bearing. If issue hardening later changes the issue count, it should still preserve this dependency structure.

## Issue Inventory

```yaml
issues:
  - id: M1-U00
    title: "Guardrails and Phase 1 ledger"
    status: done
    blocked_by: []
  - id: M1-U01
    title: "Archive false futures"
    status: planned
    blocked_by: [M1-U00]
  - id: M1-U02
    title: "Reserve the canonical HQ Ops seam"
    status: planned
    blocked_by: [M1-U01]
  - id: M1-U03
    title: "Move HQ operational truth into HQ Ops and rewire consumers"
    status: planned
    blocked_by: [M1-U02]
  - id: M1-U04
    title: "Dissolve packages/hq and land purpose-named tooling boundaries"
    status: planned
    blocked_by: [M1-U03]
  - id: M1-U05
    title: "Cut the canonical plugin topology"
    status: planned
    blocked_by: [M1-U04]
  - id: M1-U06
    title: "Install the canonical HQ app shell"
    status: planned
    blocked_by: [M1-U05]
  - id: M1-U07
    title: "Neutralize old executable composition authority"
    status: planned
    blocked_by: [M1-U06]
  - id: M1-U08
    title: "Ratchet proofs, land durable docs, freeze the plateau, and review the rest of the migration"
    status: planned
    blocked_by: [M1-U07]
```

These IDs are the stable local anchors for the next workflow steps. The breakout step should preserve them rather than inventing a new issue tree.

## Milestone Slices

The detailed slice bodies now live in local issue docs under `$ISSUES`. The milestone remains the index-level authority for framing, sequencing, and slice stop-gates; the issue docs own the leaf-level implementation detail, prework, and proof obligations.

| ID | Issue Doc | Blocked By | Why This Slice Exists |
| --- | --- | --- | --- |
| `M1-U00` | [Guardrails and Phase 1 ledger](../issues/M1-U00-guardrails-and-phase-1-ledger.md) | none | Install the ledger and proof rails that freeze the migration lane before any authority moves begin. |
| `M1-U01` | [Archive false futures](../issues/M1-U01-archive-false-futures.md) | `M1-U00` | Remove `coordination` and `support-example`, then freeze the current Cloud Code/Codex marketplace plugin lane so it stops steering Phase 1 topology decisions. |
| `M1-U02` | [Reserve the canonical HQ Ops seam](../issues/M1-U02-reserve-hq-ops-seam.md) | `M1-U01` | Create the one canonical service home for Phase 1 so semantic truth has a real destination before it moves. |
| `M1-U03` | [Migrate HQ operational truth into HQ Ops and rewire consumers](../issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md) | `M1-U02` | Collapse config, repo-state, journal, and security authority into HQ Ops before any runtime projection or app-shell work proceeds. |
| `M1-U04` | [Dissolve the legacy HQ package and land purpose-named tooling boundaries](../issues/M1-U04-dissolve-legacy-hq-package.md) | `M1-U03` | Delete the ambiguous `packages/hq` layer once real semantic authority is installed elsewhere. |
| `M1-U05` | [Cut the canonical plugin topology](../issues/M1-U05-cut-canonical-plugin-topology.md) | `M1-U04` | Move the runtime-projection tree onto the canonical role-first plugin layout after semantic owners and tooling boundaries are stable. |
| `M1-U06` | [Install the canonical HQ app shell](../issues/M1-U06-install-canonical-hq-app-shell.md) | `M1-U05` | Make the canonical HQ front door real only after service truth and plugin topology are trustworthy. |
| `M1-U07` | [Neutralize legacy executable composition authority](../issues/M1-U07-neutralize-legacy-composition-authority.md) | `M1-U06` | Remove the old host-composition path only after the new app shell is already live and smoke-tested. |
| `M1-U08` | [Ratchet Phase 1 proofs, land durable docs, and readjust the migration](../issues/M1-U08-ratchet-phase-1-proofs-and-readjust.md) | `M1-U07` | Freeze the Phase 1 plateau, land only settled docs, and run the formal review that hands off into Phase 2. |

### M1-U00: Guardrails and Phase 1 ledger

- Issue doc: [M1-U00](../issues/M1-U00-guardrails-and-phase-1-ledger.md)
- Focus: establish the checked-in ledger, classify the minimum concrete Phase 1 surface set, and install the first proof rails.
- Stop-gate: the repo enforces what is live, archived, parked, and forbidden before any semantic code moves start.
- Traceability: branch `agent-FARGO-M1-U00-guardrails-and-phase-1-ledger`; PR `#204` (`https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/204`); `sync:check`, `phase-1:gates:baseline`, and `nx show projects` passed; `lint:boundaries` remains red on the pre-existing `apps/server` boundary issue and unused-disable warnings.

### M1-U01: Archive false futures

- Issue doc: [M1-U01](../issues/M1-U01-archive-false-futures.md)
- Focus: remove live `coordination` and `support-example`, while freezing the current HQ marketplace plugin lane in place for operational continuity.
- Stop-gate: false futures are no longer present in live inventory, runtime, or registration paths.

### M1-U02: Reserve the canonical HQ Ops seam

- Issue doc: [M1-U02](../issues/M1-U02-reserve-hq-ops-seam.md)
- Focus: create `services/hq-ops` as one service package with reserved `config`, `repo-state`, `journal`, and `security` module seams.
- Stop-gate: canonical HQ Ops space exists, but no logic move or consumer rewire has happened yet.

### M1-U03: Migrate HQ operational truth into HQ Ops and rewire consumers

- Issue doc: [M1-U03](../issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md)
- Focus: move operational truth into HQ Ops, cut active consumers directly to it, and delete the old operational owners.
- Stop-gate: no live imports remain from `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, or `@rawr/security`.

### M1-U04: Dissolve the legacy HQ package and land purpose-named tooling boundaries

- Issue doc: [M1-U04](../issues/M1-U04-dissolve-legacy-hq-package.md)
- Focus: split `packages/hq` by earned ownership, preserve only legitimate support/tooling surfaces, and delete the package.
- Stop-gate: no live `@rawr/hq/*` imports remain and `packages/plugin-workspace` is support-only.

### M1-U05: Cut the canonical plugin topology

- Issue doc: [M1-U05](../issues/M1-U05-cut-canonical-plugin-topology.md)
- Focus: move the live runtime-projection tree to the canonical `plugins/server/api/*` and `plugins/async/*` topology.
- Stop-gate: the old plugin roots are gone and workspace, Nx, tag, and import truth all align with the new topology.

### M1-U06: Install the canonical HQ app shell

- Issue doc: [M1-U06](../issues/M1-U06-install-canonical-hq-app-shell.md)
- Focus: install `apps/hq/rawr.hq.ts`, `server.ts`, `async.ts`, and `dev.ts` as the new composition front door.
- Stop-gate: manifest-purity, entrypoint-thinness, and app-shell smoke proofs all pass before legacy executable authority is touched.

### M1-U07: Neutralize legacy executable composition authority

- Issue doc: [M1-U07](../issues/M1-U07-neutralize-legacy-composition-authority.md)
- Focus: route execution through the new app shell and quarantine or delete the old host-composition path.
- Stop-gate: no dual executable composition path remains; Phase 1 exits either with no executable bridge or with exactly one explicitly recorded executable bridge at `apps/hq/legacy-cutover.ts`.

### M1-U08: Ratchet Phase 1 proofs, land durable docs, and readjust the migration

- Issue doc: [M1-U08](../issues/M1-U08-ratchet-phase-1-proofs-and-readjust.md)
- Focus: ratchet the full Phase 1 proof band, land only durable docs, freeze parked lanes, and run the structured milestone review.
- Stop-gate: the plateau is explicit, verifiable, and ready to hand off into Phase 2 without reopening Phase 1.

## Milestone-Wide Acceptance Criteria

- [ ] The milestone preserves the dedicated Phase 1 plan’s slice order and fixed decisions.
- [ ] Every slice lands as a forward-only slice with its own proof band before the next dependent slice begins.
- [ ] Every slice closes its own cleanup loops; Phase 1 exits either with no executable bridge or with exactly one explicitly recorded executable bridge at `apps/hq/legacy-cutover.ts`.
- [ ] The frozen `plugins/agents/hq` marketplace lane is recorded as the only allowed non-executable compatibility carryover into the next stage.
- [ ] No dual authority survives for service truth, runtime projection, plugin topology, or app composition.
- [ ] No Phase 2 or Phase 3 substrate work is smuggled into this milestone.
- [ ] Legacy behavior, paths, imports, registrations, roots, and mentions that were supposed to die in Phase 1 are actually gone or archived by milestone end.
- [ ] Documentation work is limited to settled outcomes and archive evidence.
- [ ] The end-of-milestone review produces a concrete Phase 2 entry condition and a disciplined readjustment point for the rest of the migration.

## Common Verification Band

Each slice should end with the verification band appropriate to the surfaces it changed:

- `bun run sync:check`
- `bun run lint:boundaries`
- targeted typecheck for every changed live project
- targeted tests for every changed live project
- the structural verification introduced in or before that slice
- targeted static scans proving removed authorities actually disappeared

In addition, the slice-specific proof obligations from the Phase 1 plan must remain explicit during issue hardening:

- behavior continuity for config, repo-state, journal, and security during HQ Ops migration
- app-shell smoke proof before legacy executable authority is removed
- smoke boot paths through the new `server` and `async` entrypoints when legacy authority is neutralized

## Sequencing and Parallelization Guidance

The default posture is sequential. This milestone is primarily dependency collapse, not throughput maximization.

Safe parallelism is limited to narrow sub-slices after their prerequisite stop-gates exist:

- after M1-U00 lands, archive work inside M1-U01 may parallelize if each archive path still closes its own loops
- after M1-U02 lands, the four operational module migrations inside M1-U03 may parallelize if consumer rewires and old-owner removal close coherently
- after M1-U04 lands, limited plugin-topology prep inside M1-U05 may parallelize if it does not recreate `packages/hq` or other ambiguous temporary homes
- M1-U06 and M1-U07 should remain mostly sequential because app authority and legacy-authority neutralization are tightly coupled

If later issue hardening wants to change the issue count, it should preserve the slice order and the stop-gates above.

## Open Questions

No cross-cutting design questions should be reopened in this milestone. Remaining uncertainty should be handled as prework prompts attached to the specific slice that needs discovery.

## End-of-Milestone Review / Readjustment Point

When M1-U08 completes, perform one structured review before starting Phase 2:

- confirm the Phase 1 plateau that actually landed matches the intended authority-collapse outcome
- confirm the executable bridge outcome is explicit: either no executable bridge survives, or the only surviving executable cross-phase debt is `apps/hq/legacy-cutover.ts`
- confirm the only surviving non-executable compatibility carryover is the frozen `plugins/agents/hq` marketplace lane
- confirm the larger migration plan still lines up with the frozen plateau
- record any needed Phase 2 or Phase 3 readjustments as downstream planning updates, not as reopened Phase 1 scope

This review is the formal handoff point from semantic recovery into runtime-substrate work.

## References

- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)
- [Workflow scaffold](../.context/workflow.md)
