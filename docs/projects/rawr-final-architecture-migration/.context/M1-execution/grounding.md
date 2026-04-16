# M1 Execution Grounding

This document is the canonical re-entry point for executing Milestone 1 of the final architecture migration. Read it at the start of every issue and any time context gets thin.

## Problem statement

The repo is not blocked because the target architecture is unclear. It is blocked because the live codebase still carries competing answers to the basic architectural questions that matter most:

- what counts as semantic capability truth
- what counts as runtime projection
- what owns app composition authority
- which plugin topology is canonical
- which legacy or prototype lanes are still allowed to steer current decisions

That mixed state creates false futures, preserves dual authority, and makes every subsequent runtime or generator decision less trustworthy.

## Overall framing

Milestone 1 is the authority-collapse plateau for the migration. Its job is not to finish the final runtime substrate. Its job is to make the repo tell one coherent story again so later runtime work can happen on canonical seams instead of transitional ones.

The larger migration has three plateaus:

1. Phase 1 / Plateau 1: semantic recovery and authority collapse
2. Phase 2 / Plateau 2: minimal canonical runtime shell
3. Phase 3 / Plateau 3: generator-ready capability foundry

M1 is the hardened local execution packet for Plateau 1. It is where semantic ambiguity is removed, false futures are archived, the canonical HQ lane is installed, and the repo is forced into one forward-only live architecture lane.

## Source-of-truth precedence

Use these documents in this order:

1. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
   Architecture is canonical here. This document fixes the ontology, separations, invariants, and what each top-level kind means.
2. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
   This is the hardened local execution packet for Milestone 1. If it conflicts with broader migration framing, the milestone packet wins for M1 execution scope, sequencing, and stop-gates.
3. [RAWR_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md)
   Use this for the three-phase migration framing, plateau logic, and downstream handoff context. It does not reopen hardened M1 execution decisions.

## What you are trying to accomplish

By the end of M1, the repo should no longer be semantically mixed. It should have:

- one canonical home for HQ operational truth in `services/hq-ops`
- one canonical live runtime plugin topology for the active lane
- one canonical HQ app shell front door in `apps/hq`
- no live false-future lanes steering architecture
- no dual authority for semantic truth, plugin topology, or executable composition
- a frozen, explicit Plateau 1 that Phase 2 can build on without renegotiating basic meaning

This milestone is fundamentally about authority recovery, not feature delivery.

## What you will be asked to do

Execution is issue-by-issue, but the work stays within one narrow kind of move: install or remove authority.

At a high level, the milestone asks you to:

1. Lock the repo down with explicit guardrails and a checked-in classification ledger.
2. Archive false futures so dead or deferred lanes stop steering active architecture.
3. Reserve the canonical HQ Ops seam before moving any semantic truth.
4. Move HQ operational truth into `services/hq-ops` and cut consumers over directly.
5. Delete ambiguous support layers that only existed because semantic truth was misplaced.
6. Move the live runtime lane onto the canonical plugin topology.
7. Install the canonical HQ app shell so manifest authority and entrypoint authority become real.
8. Neutralize legacy executable composition authority so only the new front door remains authoritative.
9. Ratchet proofs, freeze the plateau, and hand Phase 2 a clean entry condition.

The milestone’s issue packet is:

- `M1-U00`: guardrails and Phase 1 ledger
- `M1-U01`: archive false futures
- `M1-U02`: reserve the canonical HQ Ops seam
- `M1-U03`: move HQ operational truth into HQ Ops and rewire consumers
- `M1-U04`: dissolve `packages/hq` and land purpose-named tooling boundaries
- `M1-U05`: cut the canonical plugin topology
- `M1-U06`: install the canonical HQ app shell
- `M1-U07`: neutralize legacy executable composition authority
- `M1-U08`: ratchet proofs, land durable docs, freeze the plateau, and review the migration

## Design constraints, intentions, and hard rails

These are load-bearing. Do not treat them as suggestions.

- Recover authority first. Do not smuggle runtime-substrate work into M1.
- The architecture ontology is fixed:
  `packages` are support matter, `services` are semantic truth, `plugins` are runtime projection, and `apps` are composition authority.
- Semantic truth moves before runtime projection.
- Runtime projection moves before app-shell authority.
- App-shell authority moves before legacy executable authority is neutralized.
- Prefer hard cuts over compatibility layers.
- No dual authority survives:
  no dual manifests, no dual plugin registries, no dual executable composition paths, no long-lived shim trees.
- `services/hq-ops` is the Phase 1 execution home for HQ operational truth in this milestone.
- `config`, `repo-state`, `journal`, and `security` are the operative HQ Ops execution modules for this milestone.
- `coordination` is archived, not normalized forward.
- `support-example` is archived in Phase 1, not promoted as an active architectural future here.
- The current Cloud Code/Codex marketplace lane under `plugins/agents/hq` is frozen in place for continuity; it is not redesigned in M1.
- Parked lanes may receive only deletions, rewires, compile fixes, or explicit unblockers. They do not get to influence architecture.
- Documentation changes must describe settled outcomes or archived evidence, not speculative futures.
- M1 does not build Phase 2 or Phase 3 substrate:
  no real bootgraph buildout, no real runtime compiler, no real process runtime, no generator/foundry work, no agent/runtime rebuild, no rich topology/catalog work.

## Canonical architectural anchors

Keep these in your head while executing.

- Stable architecture: `app -> manifest -> role -> surface`
- Runtime realization: `entrypoint -> runtime compiler -> bootgraph -> process runtime -> harness -> process -> machine`
- Service boundary first, projection second, composition third.
- Plugins project service truth; they do not own business truth.
- Apps compose roles and surfaces; they do not redefine service truth.
- Harnesses are downstream of semantics and do not define ontology.
- The file tree should follow semantic architecture, not deployment shape.

For M1, the most important practical consequence is this: do not solve semantic confusion by adding more runtime cleverness. Solve it by putting ownership in the right place and deleting ambiguity.

## Milestone 1 in the overall migration
