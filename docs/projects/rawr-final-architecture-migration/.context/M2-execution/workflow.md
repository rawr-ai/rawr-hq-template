# P2 Execution Workflow

This is the flight plan for Phase 2. It exists so the phase can be executed as its own closed loop instead of turning the frozen M1 packet into an all-purpose migration notebook.

This document, [grounding.md](./grounding.md), [frame.md](./frame.md), and [context.md](./context.md) are the Phase 2 re-entry documents.

## Framing

Phase 2 is the runtime-realization phase. The job is to make the canonical shell actually boot through canonical runtime seams without recreating semantic ambiguity.

Good looks like:

- the app boots through canonical app/runtime APIs
- bootgraph is functional and narrow
- the runtime compiler is functional and focused on the active lane
- the process runtime is real but hidden
- Elysia and Inngest harness adapters are real
- at least one server slice and one async slice run canonically
- no live runtime path depends on the legacy host-composition chain

Done looks like:

- the transitional runtime seam is gone
- the canonical runtime path is live
- proof slices cover the active server and async lanes
- docs and proof band reflect the actual plateau truth
- the repo is ready for generator/foundry work without still arguing about runtime basics

## Source-of-Truth Order

Use these in this order while executing:

1. [RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md](../../resources/spec/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md)
2. [RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md](../../resources/spec/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md)
3. [RAWR_Architecture_Migration_Plan.md](../../resources/RAWR_Architecture_Migration_Plan.md)
4. [phase-2-entry-conditions.md](../../../migration/phase-2-entry-conditions.md)
5. [phase-1-closeout-review.md](../M1-execution/phase-1-closeout-review.md)
6. the active Phase 2 milestone and issue docs:
   - [M2-minimal-canonical-runtime-shell.md](../../milestones/M2-minimal-canonical-runtime-shell.md)
   - [M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md](../../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md)

## Execution Context

Execution directory:

- [P2-execution](.)

Packet layout:

- [README.md](./README.md) explains the live packet vs `handoffs/` vs `notes/`
- only `grounding.md`, `workflow.md`, `frame.md`, and `context.md` are live packet files

Worktree posture:

- execution may happen in the primary checkout or in a dedicated worktree, depending on the slice workflow
- if you rely on Nx or Narsil indexing while working from a secondary worktree, first make sure the primary checkout is advanced to the latest commit you need indexed
- keep branch-specific hot state in `context.md`, not in this workflow
- if the active worktree and primary checkout diverge, record which checkout owns implementation and which one is only there to keep indexers current

Scratch-note rule:

- keep Phase 2-specific investigations under [notes/](./notes)
- promote durable truth into the live packet or migration docs instead of leaving it buried in note files

## Hard Rails

- Do not reopen Phase 1 authority decisions.
- Delete `apps/hq/legacy-cutover.ts` before claiming the Phase 2 plateau.
- Keep `server` and `async` as the active mandatory lane.
- Keep bootgraph narrow and process-local.
- Keep runtime compiler scope narrow to the active lane.
- Keep process runtime hidden and subordinate to app, service, and plugin semantics.
- Do not let archived or frozen compatibility lanes steer Phase 2 design.
- If HQ Ops gets weird, test the service-internal divergence hypothesis early.

## Phase Loop

### 1. Re-ground Before Every Slice

- Read [grounding.md](./grounding.md)
- Read [frame.md](./frame.md)
- Read this workflow
- Read [context.md](./context.md)
- Read the active Phase 2 slice doc if one exists
- State the exact slice goal, stop-gate, and proof bar before editing anything

### 2. Confirm Repo and Stack State

- `git status --short --branch`
- `git branch --show-current`
- `gt ls`
- confirm the worktree is clean and the active branch matches the intended slice

### 3. Establish or Refresh the Local Phase Packet

If a Phase 2 milestone packet and issue stack do not yet exist in local migration docs:

- derive them from the canonical Phase 2 plan
- keep slice boundaries narrow and stop-gates explicit
- do this before code implementation, not after

If they already exist:

- refresh `context.md` to the current slice
- confirm the next slice still matches the actual repo state

### 4. Acquire Slice-Specific Context

- identify the files, runtime seams, proofs, and harnesses that matter
- use Nx for workspace truth and target discovery:
  - first hop: `bunx nx show projects`
  - then: `bunx nx show project <project> --json`
  - if Nx modules are unavailable in the checkout, record that failure explicitly and fall back to `nx.json`, `package.json`, structural runner config, and Narsil instead of inventing targets
- use Narsil for symbols, references, imports, call paths, and proof-surface discovery
- explicitly compare active code to the canonical phase rules before designing a workaround

### 5. Plan the Slice Before Editing

- define which transitional runtime authority is being removed or installed
- define what would count as dual authority for this slice
- define the minimum closed-loop verification band:
  - slice-local contract verifier under `scripts/phase-2/`
  - affected-project structural suite or equivalent Nx-wired ratchet
  - targeted typechecks and tests
  - runtime smoke or boot-path validation for touched entrypoints/harnesses
  - docs/context ratchet proving the architecture claim, not only the happy path
- record explicit decisions when the plan leaves room for multiple plausible cuts

### 6. Implement in Stable Steps

- work in behavior-stable increments
- prefer direct replacement over layered shims
- keep new runtime packages hidden unless the public authoring model explicitly requires an API
- do not let temporary compatibility paths become new authority by accident

### 7. Verify Before Committing

- land or update the slice-local verifier script and any package-script wiring it depends on
- run the slice proof band
- run affected typechecks and tests
- run runtime validation when the slice touches boot/runtime behavior:
  - startup path
  - health path
  - canonical server surface behavior
  - canonical async registration behavior
- if the slice relies on Nx structural targets, confirm the structural suite definition changed along with the code
- confirm the slice removed the intended authority instead of merely wrapping it
- confirm the verifier proves architectural intent as well as behavior

### 8. Commit at Real Boundaries

- commit only stable behavioral states
- keep commit boundaries aligned with real architectural progress
- use Graphite-first branch management

### 9. Update the Packet and Docs

- update the active slice doc and milestone packet
- update `context.md` before stepping away
- promote durable conclusions into packet docs or migration docs
- preserve one-off investigations in `notes/`

### 10. Re-ground Before the Next Slice

- confirm the slice is actually closed
- confirm no hidden cleanup was pushed forward
- reset `context.md` to the next live slice
- repeat the loop

## Immediate Next Step

The first live Phase 2 execution step is:

- cut the `M2-U00` branch and implement the minimal canonical server runtime path that deletes `apps/hq/legacy-cutover.ts`

Do not let that slice sprawl into full-platform generalization before the bridge is dead.
