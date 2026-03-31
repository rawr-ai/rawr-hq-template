# M1 Execution Workflow

This is the flight plan for completing Milestone 1 end to end in this single working checkout. It is not a generic process note. It is the execution workflow I will keep returning to while I move through the M1 slice stack.

This document, [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md), [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md), and [context.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md) are the re-entry documents for the milestone:

- `grounding.md` = milestone-level truth
- `frame.md` = remaining-runway posture and current Milestone 1 frame
- `workflow.md` = the reusable execution loop
- `context.md` = the current-issue hot swap module

## Framing

M1 is the authority-collapse milestone. The job is to force the repo into one coherent, canonical Phase 1 lane before any later runtime-substrate or generator work exists to muddy the picture again.

Good looks like:

- the repo has one live semantic story
- HQ operational truth lives in `services/hq-ops`
- the live plugin tree uses the canonical role-first topology
- the HQ app front door is canonical and authoritative
- legacy executable authority is gone or reduced to one explicitly recorded bridge
- the proof band makes the plateau durable instead of socially enforced

Done looks like:

- every M1 issue is completed in order, with its own proof band closed
- milestone and issue docs accurately reflect reality
- no slice leaves hidden cleanup for a later “final pass”
- Phase 2 receives a clean entry condition instead of unresolved semantic debt

Outcome quality is fully my responsibility. My job is not just to move files, make tests green, or submit Graphite branches. My job is to make sure each slice actually lands the intended architectural outcome, closes its own loops, and leaves the repo in a better and less ambiguous state than it found it.

## Current Milestone Posture

The milestone packet currently treats `M1-U00` through `M1-U05` as done. The active runway is therefore:

- `M1-U06` canonical HQ app shell
- `M1-U07` legacy executable authority neutralization
- `M1-U08` proof ratchet, durable docs, and plateau freeze

One important nuance: residual follow-up work may still land against a previously "done" slice if a real architectural miss is discovered later. That happened with the HQ Ops service-shape repair after `M1-U02`/`M1-U03`. When that kind of follow-up lands, close it cleanly, then immediately reset the hot context back to the next unfinished slice instead of leaving the workspace framed around already-closed fallout.

## Source-of-Truth Order

Use these in this order while executing:

1. [RAWR_Canonical_Architecture_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md)
   This is canonical for architecture.
2. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
   This is the hardened local execution packet for M1. For M1 scope, sequencing, stop-gates, and execution posture, this wins over broader framing docs.
3. The active issue doc for the current slice:
   - [M1-U00-guardrails-and-phase-1-ledger.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U00-guardrails-and-phase-1-ledger.md)
   - [M1-U01-archive-false-futures.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U01-archive-false-futures.md)
   - [M1-U02-reserve-hq-ops-seam.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md)
   - [M1-U03-migrate-hq-ops-and-rewire-consumers.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md)
   - [M1-U04-dissolve-legacy-hq-package.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U04-dissolve-legacy-hq-package.md)
   - [M1-U05-cut-canonical-plugin-topology.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U05-cut-canonical-plugin-topology.md)
   - [M1-U06-install-canonical-hq-app-shell.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U06-install-canonical-hq-app-shell.md)
   - [M1-U07-neutralize-legacy-composition-authority.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U07-neutralize-legacy-composition-authority.md)
   - [M1-U08-ratchet-phase-1-proofs-and-readjust.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U08-ratchet-phase-1-proofs-and-readjust.md)
4. [RAWR_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md)
   Use for plateau framing and downstream handoff context. It does not reopen hardened M1 decisions.

## Execution Context

Execution directory:

- [M1-execution](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution)

Current-issue context document:

- [context.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md)
- this file is canonical for the actively worked issue only
- it is replaced or rewritten between issues instead of accumulating history
- it is not a scratch pad, transcript, or dumping ground

Milestone frame document:

- [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md)
- this file is the persistent high-level continuity packet for the remaining M1 runway
- update it when the remaining-slices posture changes, not for issue-local churn

Execution worktree:

- current checkout path: `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou`
- current branch when this workflow was last refreshed: `agent-FARGO-M1-U02-followup-hq-ops-service-shape`

Single-worktree rule:

- do not create extra worktrees for this milestone
- all slice branches live in this one checkout
- context retention beats multi-worktree isolation for this run

Scratch-note rule:

- if I need scratch notes, they go only under [M1-execution](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution)
- use names like `notes-M1-U03.md`, `status.md`, or `investigation-<topic>.md`
- do not scatter temporary notes elsewhere in the repo

Compact rule:

- after any compact or comparable context loss, the first move is:
  1. reopen [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
  2. reopen [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md)
  3. reopen [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
  4. reopen and refresh [context.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md)
  5. identify the current slice branch and current Graphite stack state
  6. read the active issue doc again
  7. inspect `git status --short --branch`
  8. inspect milestone and issue checkboxes before touching code

Between-issue rule:

- when a slice is done and before the next slice starts, replace `context.md` with the new current-issue snapshot
- do not preserve prior-issue context in `context.md`
- if a residual follow-up lands against an earlier completed slice, close that follow-up and then reset `context.md` back to the next unfinished slice
- if prior-issue knowledge matters later, promote it into `grounding.md`, `workflow.md`, the issue doc, or a durable migration/project doc instead

## Hard Rails

- Recover authority first. Do not smuggle in Phase 2 substrate.
- Semantic truth moves before runtime projection.
- Runtime projection moves before app-shell authority.
- App-shell authority moves before legacy executable authority is neutralized.
- Prefer hard cuts over compatibility layers.
- No dual authority survives.
- Parked lanes only get deletions, rewires, compile fixes, and explicit unblockers.
- The frozen Cloud Code/Codex marketplace lane at `plugins/agents/hq` stays in place during M1.
- Each slice closes its own loops. M1-U08 is a ratchet and review slice, not a deferred cleanup dump.
- Do not silently reopen earlier slices while executing `M1-U06` through `M1-U08`; if earlier fallout blocks progress, record it explicitly as blocker fallout.
- If the intended branch shows unexpected working tree changes, stop. Do not stash, reset, or improvise around them.

## Carry-Forward Watch Item

Phase 1 closed with one known architectural watch item that is intentionally deferred, not resolved:

- `services/hq-ops` is externally shaped correctly for Phase 1, but its internal module structure still looks materially less canonical than `services/example-todo`.
- Do not treat the passing Phase 1 proof band as proof that HQ Ops internals are clean. The current proofs ratchet the authority boundary, not the internal service-package ergonomics.
- Before adding broader HQ Ops verification, especially runtime verification, re-audit:
  - `services/hq-ops/src/service/modules/*`
  - `services/example-todo/src/service/modules/*`
  - `docs/projects/rawr-final-architecture-migration/.context/M1-execution/HQ-OPS-service-shape-followup.md`
  - `docs/projects/orpc-ingest-domain-packages/guidance.md`
- Assume that fake modules, shims, and helper-bucket workarounds inside HQ Ops may be the root cause until disproven.

## Adapted Dev-Parallel Loop

This is the baseline `dev-loop-parallel` workflow adapted for a single existing worktree and one Graphite branch per issue.

### 1. Re-ground Before Every Slice

- Read [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
- Read [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md)
- Read this workflow
- Read [context.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md)
- Read the active issue doc in full
- Re-read the milestone section that frames the slice and its dependency
- State the exact slice goal, stop-gate, and proof bar before editing anything

### 2. Confirm Repo and Stack State

- `git status --short --branch`
- `git branch --show-current`
- `gt ls`
- confirm I am still in the single execution worktree and understand which stack branch is active
- confirm the next slice really is the next unfinished issue in milestone order

### 3. Create the Next Graphite Slice Branch

- stay in the same worktree
- create a new Graphite branch for the issue
- branch naming must reflect the milestone and issue cleanly
- do not create side worktrees or “quick fix” branches outside the milestone stack

### 4. Acquire Slice-Specific Context and Skills

- identify the symbols, files, boundaries, and proofs that matter for the slice
- use Narsil first for symbol definitions, references, import surfaces, similar code, and call-path questions
- use Nx/native tooling for workspace truth, bulk inventory, scripts, and broad static scans
- explicitly reload any skill bodies needed for the slice if the slice changes the kind of work being done

### 5. Plan the Slice Before Editing

- define the exact authority that is moving, freezing, or dying
- define what would count as dual authority or partial migration for this slice
- define the minimum verification band for “working order”
- decide where decision logging is needed before making calls with side effects or architectural implications

### 6. Implement in Stable Steps

- work in meaningful, behavior-stable increments
- do not commit half-working states
- prefer direct cuts over transitional facades unless the issue explicitly allows the one sanctioned bridge
- keep the issue doc, milestone, and proof expectations in view while editing

### 7. Verify Before Committing

- run the issue’s required checks
- run any adjacent proof that could easily regress because of the cut
- before committing actual code changes, have a validation agent bring up the managed HQ stack with `bun run rawr hq up`, require observability when the slice touches runtime/host/app composition, inspect the managed logs, and confirm the stack is still healthy after the slice
- do not treat a green typecheck alone as completion when the slice is fundamentally structural

### 8. Commit at Real Boundaries

- commit frequently, but only when behavior is stable
- each commit should correspond to a meaningful state change:
  - guardrail landed
  - direct consumer cut complete
  - proof rewritten and passing
  - old authority removed
- if more than one meaningful boundary exists inside a slice, use more than one commit

### 9. Update the Slice Paper Trail

- update the issue doc checkboxes or notes if the slice workflow expects it
- update the milestone task tracking when the slice truly lands
- add implementation decisions where ambiguity was resolved
- update scratch notes in the execution directory if they help resume later
- rewrite `context.md` so it accurately reflects the current issue state before stepping away

### 10. Submit and Restack Inside the Single Worktree

- `gt ss --draft` after slice completion or meaningful stack updates
- use `gt sync --no-restack` only
- restack only the owned stack as needed
- keep the milestone stack coherent inside this one checkout

### 11. Refresh Narsil’s Indexed Primary Tree

Narsil is indexing the primary repo tree here:

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`

It is not indexing this worktree directly. That means after each new commit, or any time I want fresh Narsil code intel on a new Graphite slice, I must move the primary tree to the latest commit/branch I need indexed and let watch-mode catch up before relying on Narsil for post-change truth.

Operational rule:

- commit in this worktree
- update the primary tree to the same branch/commit I want indexed
- wait briefly for Narsil watch-mode to ingest the change
- then use Narsil for the next round of symbol/reference/call-path work

### 12. Re-ground Before the Next Slice

- confirm the slice is actually done
- confirm no hidden cleanup was pushed forward
- replace `context.md` with the next issue's canonical snapshot before starting the next slice
- reopen the next issue doc
- repeat the loop

## Current-Issue Context Rules

`context.md` is the bootstrapping document for the one issue that is actively in flight.

It must contain:

- the issue framing and stop-gate
- the exact documents/resources that matter right now
- the important invariants and user constraints that are easy to forget
- the key insights already established for the current issue
- the current status and next required move

It must not become:

- a scratch notebook
- a running diary
- a rationale dump
- a cross-issue archive

If `context.md` starts accumulating stale material, replace it instead of editing around the clutter.

## Agent Usage Rules

Use agents carefully and only where they lower risk instead of increasing it.

- do not delegate semantic decisions or boundary-setting work
- mechanical changes are acceptable only when easily reviewable and verifiable
- for each issue, spin up a couple of peer/review agents by default once the implementation exists:
  - one focused on overall intent / architecture drift
  - one focused on concrete implementation and proof coverage
- when a slice changes live runtime behavior, add a validation-only agent that exercises `bun run rawr hq up`, confirms observability status, and checks the managed HQ log stream before commit
- review every agent contribution thoroughly before accepting it
- if agent work changes meaning rather than mechanics, re-check the issue doc, milestone, and architecture spec before keeping it
- when a slice archives or deletes a meaningful package/service/plugin and lessons need to survive, close any no-longer-needed agents first and then spin up a grounded 3-4 agent lesson-extraction team for that archive target:
  - ground them in `grounding.md`, this workflow, the active issue doc, and the canonical architecture
  - have them capture wiring, integration, technology-fit, and system-placement lessons without preserving legacy architecture or whole implementations
  - assign one agent as integrator for the final lessons artifact
  - keep the team asynchronous so mainline milestone execution keeps moving
  - never exceed six active agents total at once

## High-Level Milestone Plan

The milestone implementation plan is deliberately sequential. The dependency chain is load-bearing:

1. `M1-U00` installs the ledger and the first hard proof rails.
2. `M1-U01` archives false futures so dead lanes stop exerting authority.
3. `M1-U02` reserves `services/hq-ops` as the single Phase 1 semantic destination.
4. `M1-U03` moves HQ operational truth into HQ Ops and cuts real consumers over.
5. `M1-U04` deletes `packages/hq` after its legitimate support surfaces are re-homed.
6. `M1-U05` moves the live runtime lane onto the canonical plugin topology.
7. `M1-U06` makes the canonical HQ app shell the real composition front door.
8. `M1-U07` removes or quarantines legacy executable composition authority.
9. `M1-U08` ratchets proofs, lands durable docs, freezes the plateau, and performs the formal handoff review.

The milestone will fail if I try to reorder the semantic heart of the work. In particular:

- plugin topology before HQ Ops migration is wrong
- app shell before canonical plugin topology is premature
- host-authority neutralization before the new front door is proven is reckless
- closure docs before the plateau is actually real is fake progress

## Slice-by-Slice Playbook

### M1-U00: Guardrails and Phase 1 Ledger

Primary intent:

- define the live lane, archived lane, parked lane, prohibited directions, and first root-owned proof scripts

Relevant skills and tools:

- `information-design` for the ledger shape and signal hierarchy
- `narsil-mcp` for finding existing verification scripts, proof entrypoints, and import surfaces
- `nx-workspace` and `bunx nx show projects` for concrete workspace truth
- native `find`, `rg`, and repo inventory files for bulk classification

How I will apply them:

- use Nx/native inventory first to establish the classified surface set
- use Narsil to find where current proof machinery, structural targets, and legacy imports already live
- shape the ledger so it is both human-usable and script-consumable

Closure bar:

- the ledger is authoritative, proof scripts exist, and the repo can mechanically reject obvious Phase 1 drift

### M1-U01: Archive False Futures

Primary intent:

- remove `coordination` and `support-example` from the live lane while preserving evidence and freezing `plugins/agents/hq`

Relevant skills and tools:

- `narsil-mcp` for references/imports/registrations touching coordination and support-example
- `graphite` for clean slice isolation and later stack submission
- native `rg`, filesystem inspection, and `rawr plugins sync @rawr/plugin-hq --dry-run`
- `decision-logging` if archive/evidence tradeoffs surface

How I will apply them:

- use Narsil to map remaining code references and runtime registration edges
- use native tools for bulk archive moves, path removal, and sync validation
- preserve only the sanctioned evidence artifacts and explicitly freeze the marketplace lane in place

Closure bar:

- the false-future lanes are absent from live build/test/runtime truth, and the plugin-hq compatibility lane still resolves

### M1-U02: Reserve the Canonical HQ Ops Seam

Primary intent:

- create the one service package that will receive HQ operational truth without prematurely migrating logic

Relevant skills and tools:

- `narsil-mcp` for reading `services/state` and canonical service-shell prior art
- `typescript` for shaping service shell exports and placeholder seams cleanly
- `nx-workspace` for project wiring and typecheck expectations
- native `bun --cwd services/hq-ops run typecheck`

How I will apply them:

- use Narsil to compare existing service shells and avoid inventing a new one
- keep this slice structural only: no logic migration, no rewires

Closure bar:

- `services/hq-ops` exists with the reserved canonical shell and module seams, and a proof script enforces that reservation

### M1-U03: Migrate HQ Operational Truth and Rewire Consumers

Primary intent:

- move config, repo-state, journal, and security into HQ Ops and cut direct consumers over

Relevant skills and tools:

- `narsil-mcp` for consumer inventory, import/reference search, and old-owner deletion planning
- `typescript` for module moves and stable subpath exports
- `decision-logging` for any cutover choices that might create hidden transitional facades
- native `rg`, targeted typechecks, and targeted tests

How I will apply them:

- use Narsil as the primary map of consumers and ownership edges
- migrate behavior with proofs, not just imports
- delete old owners in the same slice once behavior continuity is preserved

Closure bar:

- no live imports from old operational owners remain, active consumers point at HQ Ops, and the owner-specific behavior proofs still hold

### M1-U04: Dissolve `packages/hq`

Primary intent:

- split `packages/hq` by earned ownership and delete it entirely

Relevant skills and tools:

- `narsil-mcp` for all `@rawr/hq/*` references and for locating surviving support surfaces
- `typescript` for re-homing exports/tests without creating a new junk-drawer package
- native `rg`, targeted tests, and package-level typechecks

How I will apply them:

- use Narsil to separate true support/tooling usage from semantic facades
- move workspace/plugin-discovery support into `packages/plugin-workspace`
- keep plugin-CLI-only helpers with plugin CLI ownership

Closure bar:

- `packages/hq` is deleted, `@rawr/hq/*` imports are gone, and survivor surfaces live in the right owners

### M1-U05: Cut the Canonical Plugin Topology

Primary intent:

- leave exactly one live runtime-projection tree under the canonical roots

Relevant skills and tools:

- `narsil-mcp` for import updates, project references, and old plugin-root usages
- `nx-workspace` for project metadata, target discovery, and tag truth
- native workspace/inventory files, `rg`, and filesystem operations

How I will apply them:

- use Narsil to map code import fallout
- use Nx/native files for the actual project/workspace/tag/inventory cuts
- move imports, tags, and filesystem truth together so no second tree remains authoritative

Closure bar:

- old plugin roots are gone from the live lane, imports and project metadata match the new topology, and the canonical-topology proof passes

### M1-U06: Install the Canonical HQ App Shell

Primary intent:

- make the HQ manifest and thin entrypoints the real composition authority

Relevant skills and tools:

- `narsil-mcp` for current manifest/host-composition references and app-shell touchpoints
- `typescript` for manifest and thin entrypoint authoring
- native tests and proof scripts for manifest purity and entrypoint thinness

How I will apply them:

- use Narsil to trace the current app shell and old host-authority overlap
- reserve only the seams needed for Phase 2; do not implement runtime compiler or bootgraph substrate here

Sequencing sanity rule:

- if the existing U06/U07 split creates an artificial complication that would make the app shell decorative instead of real, pull forward the minimum downstream work needed to make U06 truthful
- acceptable pull-forward work:
  - rebasing live app authority onto `apps/hq/rawr.hq.ts`
  - introducing the one sanctioned executable bridge at `apps/hq/legacy-cutover.ts`
  - updating proofs so U06 asserts real app-shell authority rather than old `src/manifest.ts` authority
- forbidden pull-forward work:
  - deleting or quarantining `apps/server/src/host-composition.ts`, `host-seam.ts`, or `host-realization.ts` as live authority surfaces
  - removing the current runtime fallback before the new shell is proven by smoke checks and managed HQ validation
  - rewriting U07 proof surfaces as if legacy host authority is already dead

Phase-scoped workflow:

1. create the next Graphite slice branch for `M1-U06` in this same worktree
2. re-read the canonical spec sections on manifest posture and entrypoint posture, plus the Phase 1 bridge rule and the `M1-U06`/`M1-U07` issue docs
3. move app composition authority to `apps/hq/rawr.hq.ts` and reduce `apps/hq/src/manifest.ts` to a compatibility forwarder or non-authoritative shim only
4. create `apps/hq/server.ts`, `apps/hq/async.ts`, and `apps/hq/dev.ts` as thin entrypoints; if executable delegation is needed, route it only through `apps/hq/legacy-cutover.ts`
5. keep current `apps/server` host-composition execution live during this slice; do not neutralize it here
6. add `verify-manifest-purity` and `verify-entrypoint-thinness`, and rewrite HQ app proof surfaces so they ratchet the new shell truth
7. run the slice verification band plus managed HQ validation with `rawr hq up --observability required --open none`, status/log inspection, first-party state RPC `200`, and archived coordination/support-example route probes still `404`
8. commit only once the new shell is authoritative, the old runtime still works, and the new proof band is green

Immediate continuation rule:

- when `M1-U06` closes, do not stop
- rewrite `context.md` for `M1-U07`, carry forward the exact bridge outcome, and continue the same closed loop through `M1-U07` and `M1-U08`
- the milestone is not done until the U07 legacy-authority cut and the U08 plateau freeze both close with their own proof bands

Closure bar:

- `apps/hq/rawr.hq.ts`, `server.ts`, `async.ts`, and `dev.ts` are authoritative, thin, and smoke-tested

### M1-U07: Neutralize Legacy Executable Composition Authority

Primary intent:

- cut execution over to the HQ app shell and kill the old host-composition authority path

Relevant skills and tools:

- `narsil-mcp` for remaining call paths/imports around `host-composition`, `host-seam`, and `host-realization`
- `decision-logging` if the one sanctioned bridge becomes necessary
- `testing-design` for rewriting stale proof assumptions into real authority-neutralization proofs
- native `rg`, smoke tests, and proof scripts

How I will apply them:

- use Narsil to identify all remaining non-test callers and test-only scaffolding
- only keep `apps/hq/legacy-cutover.ts` if it is truly necessary and explicitly temporary
- rewrite proof surfaces so they assert new authority, not old file names

Closure bar:

- production boot flows through the HQ shell, old host-composition files are no longer authoritative, and only the sanctioned bridge remains if any bridge remains at all

### M1-U08: Ratchet Proofs, Land Durable Docs, and Readjust

Primary intent:

- freeze the plateau truthfully and record the real Phase 2 handoff

Relevant skills and tools:

- `information-design` for durable plateau-state docs
- `narsil-mcp` for confirming stale references and final current-state fallout
- `graphite` for final stack submission/update
- native verification scripts, typechecks, tests, and plugin sync dry-run

How I will apply them:

- run the full Phase 1 proof band together
- land only docs that describe settled current state or archive evidence
- perform the explicit readjustment review without reopening Phase 1 scope

Closure bar:

- the full proof band passes together, the docs reflect settled Phase 1 reality, the parked-lane freeze is real, and Phase 2 entry conditions are explicit

## Tooling Expectations

Narsil posture:

- prefer Narsil for:
  - symbol discovery
  - reference search
  - call-path tracing
  - definition lookup
  - import/use fallout mapping
  - finding similar prior art
- use Narsil especially before broad rewires or deletions so the actual dependency surface is known first

Native-tool posture:

- use native tools where they are faster, more exact, or better for bulk work:
  - `git` and `gt` for repo/stack inspection and submission
  - `rg` and `find` for bulk path scans
  - `bunx nx show projects` and `bunx nx show project <name> --json` for workspace truth
  - repo verification scripts under `scripts/phase-1/`
  - targeted `bun --cwd ... run typecheck` and `bun --cwd ... run test`

Affected-change and boundary posture:

- use `git diff --stat`, `git diff`, `git show --stat`, and explicit proof scripts as needed to inspect affected changes and enforce boundaries
- use repo inventory files and Nx metadata when filesystem motion must stay aligned with project truth

## Branching and Commit Discipline

- each issue gets its own Graphite branch
- all of those issue branches live in this one worktree
- commit frequently within a slice, but only at stable behavior boundaries
- no commit should represent a half-working state
- when a slice naturally contains multiple stable state changes, use multiple commits
- submit/update draft PRs during the milestone so the stack stays inspectable
- never run `gt sync` without `--no-restack`

## Resume Checklist

When resuming after time away, compact, or interruption:

1. Open [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md).
2. Open [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md).
3. Open and refresh [context.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md).
4. Run `git status --short --branch`.
5. Run `git branch --show-current`.
6. Run `gt ls`.
7. Re-read the active issue doc.
8. Re-check milestone progress and any issue checkboxes or local notes.
9. Confirm whether the primary Narsil tree is indexing the latest commit needed for this slice.

If any of those steps reveal ambiguity, stop and re-ground before editing code.
