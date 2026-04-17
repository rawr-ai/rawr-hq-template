# Phase 2 Compaction Scratchpad

Date: 2026-04-16
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
Branch: `docs/reground-p2-for-effect-runtime-substrate`

## Current State

- The repo-backed Phase 2 docs are the source of truth we care about right now, not live Linear workspace items.
- The local Phase 2 packet is aligned on the hardened design:
  - `packages/runtime/*` is the consolidated execution family
  - `packages/hq-sdk` is the public app-runtime and authoring seam
  - `M2-U00` owns the minimum server-only compiler/app-runtime cut
  - broader compiler/process-runtime generalization stays in `M2-U02`

## What Was Found

- The main remaining gap is not architecture drift. It is verification and enforcement setup.
- The M2 docs had been written as if a `scripts/phase-2/` verifier family and `phase-2:*` gate chain already existed.
- In actual repo state, they do not exist yet.

## What Already Exists

- `nx.json` already defines `sync` and `structural` target defaults.
- `eslint.config.mjs` already uses `@nx/enforce-module-boundaries`.
- `tools/architecture-inventory/*` and the sync generator infrastructure already exist.
- `scripts/phase-03/run-structural-suite.mjs` already provides the pattern for project-owned structural ratchets.
- Older migration gate families already exist: `phase-a`, `phase-03`, `phase-2_5`, `phase-c`, `phase-d`, `phase-e`, `phase-f`.

## What Does Not Yet Exist For Phase 2

- `scripts/phase-2/`
- `phase-2:*` package scripts
- structural runner support for the planned `packages/runtime/*` family
- full carry-over of the archived enforcement posture to the new runtime migration
- cleanup of transitional lint boundary allowlist escapes
- uniform `type:*`, `role:*`, `surface:*`, `capability:*` tag coverage across the relevant projects

## Archived Enforcement Packet Reviewed

- `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/_archive/enforcement_spec.md`
- `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/_archive/guardrails.md`

## What Carried Over

- Nx as the intended control plane
- `sync` and `structural` target posture
- architecture inventory / sync-generator model
- `@nx/enforce-module-boundaries`
- partial tag model for `type:*`, `app:hq`, and some `role:*` / `surface:*` / `capability:*` usage

## What Did Not Fully Carry Over

- Phase 2 runtime-specific verifiers
- Phase 2 package-script gate chain
- runtime-family structural ratchets
- fully updated boundary rules for the new runtime family
- fully normalized tag coverage for the current migration target

## Docs Updated In This Pass

- `docs/projects/rawr-final-architecture-migration/.context/P2-execution/workflow.md`
- `docs/projects/rawr-final-architecture-migration/.context/P2-execution/context.md`
- `docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U02-generalize-runtime-compiler-and-process-runtime.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U03-install-canonical-async-runtime-path.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U05-migrate-phase-2-proof-slices.md`
- `docs/projects/rawr-final-architecture-migration/issues/M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md`

## What Those Doc Changes Did

- Fixed stale workflow/source-of-truth links.
- Replaced the stale single-worktree rule with explicit worktree indexing posture for Nx and Narsil.
- Made each M2 slice require a real closed-loop verifier and ratchet instead of assuming one already exists.
- Explicitly said each slice must land:
  - slice-local verifier(s)
  - package-script or Nx structural wiring
  - targeted typechecks and tests
  - runtime smoke where relevant
  - docs/context ratchet proving the architectural claim

## Nx Reality In This Checkout

- `bunx nx show projects` failed because `node_modules/nx` is missing in this checkout.
- That is not a conceptual blocker. It just means workspace dependencies are not installed here.
- Going forward, install deps if they are missing instead of treating that as a stop.

## Working Conclusion

The repo already has the pattern for up-front enforcement. Phase 2 runtime has simply not been wired into that pattern yet.

The minimal, non-obsessive way to drive development up front is:

- Add a small `scripts/phase-2/` verifier family slice-by-slice.
- Wire each slice into package scripts and the structural runner immediately.
- Use lint and static/structural checks for architectural claims.
- Use targeted smoke tests only where runtime behavior changes.

For `M2-U00`, the likely minimum is:

- `scripts/phase-2/verify-no-legacy-cutover.mjs`
- `scripts/phase-2/verify-server-role-runtime-path.mjs`
- `scripts/phase-2/verify-runtime-public-seams.mjs`
- one `phase-2:gate:u00` script in `package.json`
- one structural-runner hook for affected projects
- one focused server boot smoke test

## Next Topic After Compaction

- install workspace deps if needed
- run Nx properly
- inspect current targets, tags, boundary rules, and structural runner
- design the minimal Phase 2 verifier setup
- likely create `scripts/phase-2/*`
- add `phase-2:*` package scripts
- update structural runner and target wiring
- tighten `@nx/enforce-module-boundaries` where appropriate
- decide what should be static/lint/structural vs smoke/runtime tests
- use agents if useful, but do real research and repo-grounded work

## Context Continuation Snippet

Paste this after compaction:

```text
Continue from this compacted state:

Repo: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
Branch: docs/reground-p2-for-effect-runtime-substrate
Graphite repo, trunk = main.

We are focused on the repo-backed Phase 2 docs and enforcement posture, not the live Linear workspace.

Settled design:
- packages/runtime/* = execution family
- packages/hq-sdk = public app-runtime/authoring seam
- M2-U00 = minimum server-only compiler/app-runtime cut
- M2-U02 = broader compiler/process-runtime generalization

What we found:
- Phase 2 docs are aligned on design.
- The real remaining gap is verification/enforcement setup.
- The docs had been assuming scripts/phase-2/* and phase-2:* gates already existed. They do not yet exist.

What already exists in the repo:
- nx.json sync/structural target defaults
- eslint.config.mjs with @nx/enforce-module-boundaries
- tools/architecture-inventory + sync generator
- scripts/phase-03/run-structural-suite.mjs
- older migration gates (phase-a, phase-03, phase-2_5, etc.)

What is missing for Phase 2 runtime:
- scripts/phase-2/
- phase-2:* package scripts
- structural ratchets for the planned packages/runtime/* family
- full carry-over of archived enforcement posture to the new runtime migration
- cleanup of transitional boundary-rule allowlist escapes
- uniform tag coverage

Archived enforcement docs already reviewed:
- /Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/_archive/enforcement_spec.md
- /Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/_archive/guardrails.md

Docs updated in the last pass:
- docs/projects/rawr-final-architecture-migration/.context/P2-execution/workflow.md
- docs/projects/rawr-final-architecture-migration/.context/P2-execution/context.md
- docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md
- docs/projects/rawr-final-architecture-migration/issues/M2-U00..M2-U06

Those doc changes established:
- each M2 slice must land a real closed-loop verifier and ratchet
- workflow now explicitly says to use Nx first for workspace truth, Narsil for code/proof tracing
- workflow now explicitly handles worktrees: if using a secondary worktree and relying on Nx/Narsil indexing, advance the primary checkout to the latest relevant commit first

Nx/tool reality:
- bunx nx show projects previously failed because node_modules/nx was missing in this checkout
- next step: if deps are missing, install them and continue; do not stop there

Git state:
- branch currently contains the prior Phase 2 alignment work plus the verification-loop hardening pass
- pre-existing untracked local files should stay untracked:
  - .claude/
  - docs/projects/rawr-final-architecture-migration/briefs/
  - the-reactive-codebase.html
  - the-reactive-codebase.md

Next task:
- actually research and implement the minimal up-front verification setup for Phase 2
- install deps if needed
- run Nx properly
- inspect tags/targets/boundary rules/structural runner
- design and likely add scripts/phase-2/*
- add phase-2:* package scripts
- update run-structural-suite / project scripts / target wiring as needed
- improve @nx/enforce-module-boundaries for the runtime migration without overcomplicating it
- decide what should be static/lint/structural vs smoke/runtime tests
- use narsil-mcp and nx-workspace
- use agents if useful, but do real research and concrete repo-grounded work
```
