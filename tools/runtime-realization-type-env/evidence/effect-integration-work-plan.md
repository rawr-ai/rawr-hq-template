# Effect Integration TODO Lab Work Plan

This is the progress anchor for the Effect-native TODO/xfail extension. If the session compacts, resume from the first unchecked item below.

## Goal

Make the runtime realization type environment remember the remaining Effect-native integration categories without turning the lab into the production SDK, runtime substrate, deployment planner, or durable workflow engine.

The lab remains pinned to:

- `/Users/mateicanavra/Downloads/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- SHA-256: `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`

Older Effect-native and deployment specs are evidence sources only. They do not become authority for this lab.

## Work Checklist

- [x] Create the Graphite child branch `codex/runtime-realization-effect-integration-todos`.
- [x] Add this persisted work plan.
- [x] Add `evidence/effect-integration-map.md`.
- [x] Add Effect integration TODO fixtures under `fixtures/todo/`.
- [x] Add narrow public Effect facade negative assertions only where the pseudo-SDK can prove them honestly.
- [x] Update `proof-manifest.json`.
- [x] Update `focus-log.md`.
- [x] Update `spine-audit-map.md`.
- [x] Update `vendor-fidelity.md`.
- [x] Run the runtime realization type-env verification gate.
- [x] Commit through Graphite and submit with `gt submit --ai`.

## Implementation Rules

- Do not install `effect` into this repo for this TODO-only pass.
- Do not add the lab to root build, root typecheck, package workspaces, or any published export surface.
- Do not add production imports from `packages/*`, `apps/*`, `services/*`, or `plugins/*`.
- Keep every new Effect integration item as `xfail` or `todo`, not `proof`.
- Treat process-local Effect primitives as local runtime infrastructure only, never durable async, event bus, workflow, workstream, review-loop, or business-truth semantics.
- Record vendor facts from official docs plus temp package inspection. Do not use the absence of `effect` in this repo as a correctness proof.

## Expected Verification

```bash
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:typecheck
bunx nx run runtime-realization-type-env:negative
bunx nx run runtime-realization-type-env:simulate
bunx nx run runtime-realization-type-env:gate
git diff --check
git status --short
gt status --short
```
