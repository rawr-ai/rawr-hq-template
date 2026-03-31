# Current Issue Context

## Active Slice

- Issue: `M1-U06` — `Install the canonical HQ app shell`
- Current branch: `agent-FARGO-M1-U02-followup-hq-ops-service-shape`
- Current status:
  - `M1-U00` through `M1-U05` are treated as done in the milestone packet.
  - residual HQ Ops service-shape fallout from the done `M1-U02`/`M1-U03` area was repaired on this branch in commit `cee43327`.
  - the working tree is clean.
- Immediate mission: prepare for and then execute the remaining Milestone 1 runway in order:
  - `M1-U06` canonical HQ app shell
  - `M1-U07` legacy executable authority neutralization
  - `M1-U08` proof ratchet, plateau freeze, and Phase 2 handoff review

## Milestone Frame

The milestone is no longer about recovering semantic authority inside HQ Ops. That work is done enough for Phase 1.

The remaining Milestone 1 risk is now concentrated in executable composition authority:

- `apps/hq` must become the real front door
- `apps/server` host composition must stop being live authority
- the Phase 1 plateau must be frozen truthfully once the app-shell cutover is real

This means the next three issues are one dependency-locked chain, not three unrelated tickets:

1. `M1-U06` makes the canonical HQ app shell real.
2. `M1-U07` removes or quarantines old host authority only after that shell is proven.
3. `M1-U08` ratchets proofs and docs only after the plateau is actually real.

## What “Right” Means For The Remaining Runway

Milestone 1 is done only if all of these become true together:

- the canonical HQ app shell is real and authoritative
- legacy host composition is no longer authoritative, except for one explicitly recorded bridge if absolutely necessary
- the full Phase 1 proof band passes together
- parked lanes are frozen
- the durable docs describe settled Phase 1 reality only

The important anti-goal is reopening earlier slices casually. If a real blocker from `M1-U04` or `M1-U05` appears while working `M1-U06` through `M1-U08`, record it explicitly as blocker fallout. Do not silently turn the remaining Milestone 1 work into another broad cleanup pass.

## Canonical References

Read these before editing the remaining Milestone 1 slices:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md)
4. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
5. [RAWR_P1_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md)
6. [M1-U06-install-canonical-hq-app-shell.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U06-install-canonical-hq-app-shell.md)
7. [M1-U07-neutralize-legacy-composition-authority.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U07-neutralize-legacy-composition-authority.md)
8. [M1-U08-ratchet-phase-1-proofs-and-readjust.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U08-ratchet-phase-1-proofs-and-readjust.md)
9. [apps/hq/src/manifest.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/hq/src/manifest.ts)
10. [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts)
11. [apps/server/src/host-composition.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-composition.ts)
12. [apps/server/src/host-seam.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-seam.ts)
13. [apps/server/src/testing-host.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/testing-host.ts)

## Findings That Must Not Be Forgotten

- The live architectural question is now app-shell authority, not HQ Ops service shape.
- `apps/hq` already exists as a project, but the issue docs still treat the canonical shell files as the decisive Phase 1 target. Do not assume the existence of `apps/hq` means `M1-U06` is already satisfied.
- `apps/server/src/rawr.ts` still materializes runtime through `createRawrHostComposition(...)`, which is exactly the authority that `M1-U07` says must stop being live.
- `apps/server/src/testing-host.ts` is acceptable as explicit test scaffolding only if it does not stay confused with live authority during or after `M1-U07`.
- The remaining slices are allowed to reserve seams for Phase 2, but they must not smuggle in Phase 2 substrate work.

## Invariants and User Constraints

- Context is still accumulating in the correct direction. No handoff is needed yet.
- Keep the single-worktree Graphite flow intact.
- Be careful with persistent workflow/context artifacts: adjust them incrementally and preserve still-valid Milestone 1 behavior.
- Do not reopen earlier slice architecture unless a concrete blocker forces it.
- If context starts to bloat with stale HQ Ops repair detail again, stop and hand off instead of carrying that noise through `M1-U06` to `M1-U08`.
- Before any runtime/host/app-authority commit, run the managed HQ validation gate with observability required.

## Immediate Next Move

- Cut the next Graphite slice branch for `M1-U06`.
- Re-ground directly on the `M1-U06` issue doc and the current `apps/hq` / `apps/server` authority surfaces.
- Define the exact proof bar for:
  - manifest purity
  - entrypoint thinness
  - what counts as “real authority” instead of decorative wrapper behavior
- Only after that start changing code.
