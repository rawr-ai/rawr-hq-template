# M2: Install the Minimal Canonical Runtime Shell

**Position in Migration:** Phase 2 of 3 in the final architecture migration.  
**Goal:** Make the canonical HQ shell boot through canonical runtime seams so the repo stops depending on the quarantined legacy execution path.  
**Status:** Planned  
**Target Date:** TBD  
**Owner:** TBD

<!-- Path roots -->
$PROJECT = docs/projects/rawr-final-architecture-migration
$MILESTONE = $PROJECT/milestones/M2-minimal-canonical-runtime-shell.md
$ISSUES = $PROJECT/issues

## Why This Milestone Exists

Phase 1 made the repo tell one coherent semantic story again. It did not make the runtime canonical.

At Phase 2 start, the shell is real but one transitional executable seam still exists:

- `apps/hq/legacy-cutover.ts`

This milestone exists to replace that seam with the real runtime path and to leave the repo with one operational runtime story:

- apps choose roles and identity
- services own semantics
- plugins project capabilities into runtime lanes
- boot/runtime packages realize execution without becoming a second semantic plane

## What Good Looks Like When This Milestone Is Done

At milestone exit, all of the following are true at the same time:

- `apps/hq/server.ts` boots through canonical app/runtime APIs.
- `apps/hq/async.ts` boots through canonical app/runtime APIs.
- `packages/bootgraph` is real and enforces dependency-first startup and ordered shutdown.
- `packages/runtime-compiler` is real for the active lane:
  - `server.api`
  - `async.workflows`
  - `async.schedules`
- the thin process runtime is real and hidden behind canonical app/runtime entrypoints.
- Elysia and Inngest harness adapters are real for the active lane.
- at least one canonical server slice and one canonical async slice run through the new runtime shell.
- `apps/hq/legacy-cutover.ts` is gone.
- no live runtime path depends on legacy host-composition seams.
- the proof band and docs describe the actual Phase 2 plateau instead of transitional runtime glue.

## Source-of-Truth Rule For This Milestone

This milestone is grounded by four documents:

1. [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md): canonical source for Phase 2 purpose, sequence, and exit gate.
2. [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md): destination architecture and invariant truth.
3. [Phase 2 entry conditions](../../migration/phase-2-entry-conditions.md): the handoff contract from the frozen Phase 1 plateau.
4. [Phase 1 closeout review](../phase-1-closeout-review.md): evidence for what Phase 1 settled and what it intentionally left to Phase 2.

For this milestone, the larger migration plan is the execution authority unless a narrower local issue doc makes the same intent more concrete without violating the plan.

## Sequencing Readjustment

The canonical Phase 2 sequence lists the runtime seam deletion near the end of the phase. The local execution posture intentionally pulls forward the minimum server-runtime path needed to delete `apps/hq/legacy-cutover.ts` in the first live slice.

That is not a re-decision. It is a disciplined readjustment driven by the explicit Phase 2 entry condition:

- the only surviving executable bridge must die first, not become the default runtime wrapper for the rest of the phase

The rule is:

- pull forward only the minimum substrate needed to replace the live bridge
- do not smuggle full-platform generalization or optional runtimes into that first cut

## Global Guardrails

Implementation agents should continuously anchor on these rules:

- do not reopen settled Phase 1 authority decisions
- delete `apps/hq/legacy-cutover.ts` before claiming the Phase 2 plateau
- `server` and `async` are mandatory; `web`, `cli`, and `agent` remain optional or reserved
- bootgraph remains narrow and process-local
- runtime compiler scope remains narrow to the active lane
- process runtime remains a hidden realization seam, not a second business plane
- only earned server and async projections move into the active lane
- archived or frozen compatibility lanes do not get to steer runtime design
- if HQ Ops runtime or verification work gets confusing, test the service-internal divergence hypothesis early
- do not let temporary wrappers or migration adapters become new authority

## Domino Order

This milestone is deliberately sequenced to make each next move safer than the previous one:

1. cut the first canonical server runtime path and delete the surviving executable bridge
2. harden bootgraph lifetime and failure semantics
3. generalize compiler and process runtime behavior for the active lane
4. install the canonical async runtime path
5. replace transitional plugin builders with canonical role and surface builders
6. migrate the proof slices onto the new runtime shell
7. ratchet proofs, delete remaining transitional seams, and freeze Plateau 2

That order is load-bearing. The first issue deliberately front-loads the bridge deletion because the boundary contract demands it.

## Issue Inventory

```yaml
issues:
  - id: M2-U00
    title: "Replace legacy cutover with the canonical server runtime path"
    status: planned
    blocked_by: []
  - id: M2-U01
    title: "Harden bootgraph lifetimes and failure semantics"
    status: planned
    blocked_by: [M2-U00]
  - id: M2-U02
    title: "Generalize the runtime compiler and process runtime"
    status: planned
    blocked_by: [M2-U01]
  - id: M2-U03
    title: "Install the canonical async runtime path"
    status: planned
    blocked_by: [M2-U02]
  - id: M2-U04
    title: "Replace transitional plugin builders with canonical role and surface builders"
    status: planned
    blocked_by: [M2-U03]
  - id: M2-U05
    title: "Migrate the Phase 2 proof slices onto the canonical runtime shell"
    status: planned
    blocked_by: [M2-U04]
  - id: M2-U06
    title: "Ratchet Phase 2 proofs, delete transitional runtime seams, and close the plateau"
    status: planned
    blocked_by: [M2-U05]
```

## Milestone Slices

| ID | Issue Doc | Blocked By | Why This Slice Exists |
| --- | --- | --- | --- |
| `M2-U00` | [Replace legacy cutover with the canonical server runtime path](../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md) | none | Replace the one surviving executable bridge with a minimal canonical server runtime path instead of letting the bridge linger through the phase. |
| `M2-U01` | [Harden bootgraph lifetimes and failure semantics](../issues/M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md) | `M2-U00` | Turn the minimal first cut into a real bootgraph with the guarantees Phase 2 actually promises. |
| `M2-U02` | [Generalize the runtime compiler and process runtime](../issues/M2-U02-generalize-runtime-compiler-and-process-runtime.md) | `M2-U01` | Expand the compiler/runtime seam from the first server cut into a reusable active-lane substrate with explicit stop and resource semantics. |
| `M2-U03` | [Install the canonical async runtime path](../issues/M2-U03-install-canonical-async-runtime-path.md) | `M2-U02` | Make `apps/hq/async.ts` real through canonical async runtime seams instead of reserving it as a shell-only entrypoint. |
| `M2-U04` | [Replace transitional plugin builders with canonical role and surface builders](../issues/M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md) | `M2-U03` | Remove transitional public builder grammar so the active authoring model matches the runtime shell that now exists. |
| `M2-U05` | [Migrate the Phase 2 proof slices onto the canonical runtime shell](../issues/M2-U05-migrate-phase-2-proof-slices.md) | `M2-U04` | Prove the new runtime shell through `example-todo`, HQ Ops, and the new async exemplar instead of relying on transitional proofs. |
| `M2-U06` | [Ratchet Phase 2 proofs, delete transitional runtime seams, and close the plateau](../issues/M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md) | `M2-U05` | Freeze Plateau 2 truthfully and remove any remaining runtime-transition seams before Phase 3 planning begins. |

## Milestone-Wide Acceptance Criteria

- [ ] `apps/hq/server.ts` and `apps/hq/async.ts` boot through canonical app/runtime APIs.
- [ ] `apps/hq/legacy-cutover.ts` is deleted.
- [ ] Bootgraph, runtime compiler, process runtime, and active-lane harness adapters are real and narrow.
- [ ] At least one canonical server slice and one canonical async slice run through the new runtime shell.
- [ ] No live runtime path depends on the legacy host-composition chain.
- [ ] Transitional public builder grammar is gone from the active lane.
- [ ] Docs and proofs describe only settled Plateau 2 reality.

## Practical Hand-Off

The next live slice is [M2-U00](../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md). Its job is to cut the first real server runtime path and delete `apps/hq/legacy-cutover.ts` instead of letting the bridge survive as Phase 2 scaffolding.
