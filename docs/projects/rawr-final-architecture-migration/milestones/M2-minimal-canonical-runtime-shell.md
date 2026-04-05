# M2: Install the Minimal Canonical Runtime Shell

**Position in Migration:** Phase 2 of 3 in the final architecture migration.
**Goal:** Make the canonical HQ shell boot through canonical runtime seams so the repo stops depending on the quarantined legacy execution path.
**Status:** Planned (regrounded against updated runtime substrate spec)
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
- the runtime subsystem (`packages/runtime/*`) realizes execution through an Effect-backed kernel without becoming a second semantic plane

## Canonical Reference Documents

This milestone is grounded by six documents:

1. [Migration plan](../resources/RAWR_Architecture_Migration_Plan.md): canonical source for Phase 2 purpose, sequence, and exit gate.
2. [Integrated architecture and runtime spec](../resources/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md): destination architecture, runtime subsystem stance, and invariant truth.
3. [Effect runtime subsystem spec](../resources/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md): detailed specification for the Effect-backed runtime kernel, package topology, runtime-owned services, config/schema/error/observability models, and bootgraph lowering.
4. [Phase 2 entry conditions](../../migration/phase-2-entry-conditions.md): the handoff contract from the frozen Phase 1 plateau.
5. [Phase 1 closeout review](../phase-1-closeout-review.md): evidence for what Phase 1 settled and what it intentionally left to Phase 2.
6. [Original architecture spec](../resources/RAWR_Canonical_Architecture_Spec_V2.md): historical reference (superseded by the integrated spec for runtime subsystem details).

For this milestone, the migration plan is the execution authority. The two new specs are the design authority for the runtime subsystem. Narrower local issue docs may make intent more concrete without violating either.

## What Good Looks Like When This Milestone Is Done

At milestone exit, all of the following are true at the same time:

- `apps/hq/server.ts` boots through canonical app/runtime APIs.
- `apps/hq/async.ts` boots through canonical app/runtime APIs.
- `packages/runtime/bootgraph` is real, with Effect-backed lowering, dependency-first startup, rollback, and ordered shutdown.
- `packages/runtime/compiler` is real for the active lane (`server.api`, `async.workflows`, `async.schedules`).
- `packages/runtime/substrate` is real: one root `ManagedRuntime` per process, runtime-owned Effect services (RuntimeConfig, ProcessIdentity, RuntimeTelemetry, DbPool, Clock, WorkspaceRoot, BoundaryCache), process-runtime (ProcessView, RoleView, SurfaceAssembler), and tagged runtime errors.
- Elysia and Inngest harness adapters are real for the active lane under `packages/runtime/harnesses/`.
- At least one canonical server slice and one canonical async slice run through the new runtime shell.
- `apps/hq/legacy-cutover.ts` is gone.
- `packages/runtime-context` is absorbed into `packages/runtime/substrate`.
- No live runtime path depends on legacy host-composition seams.
- Raw Effect types (`Layer`, `Context.Tag`, `ManagedRuntime`, `Effect.Service`) are not exposed in any public authoring API.
- The proof band and docs describe the actual Phase 2 plateau instead of transitional runtime glue.

## Phase 2 Package Topology

```text
packages/
  runtime/                      runtime subsystem family
    bootgraph/                  PUBLIC - RAWR-shaped lifecycle shell
    compiler/                   HIDDEN - manifest -> compiled process plan
    substrate/                  HIDDEN - Effect-backed kernel
      src/
        effect/                 Effect service definitions, layer construction
        services/               Runtime-owned services
        config/                 Config loading, validation, redaction
        schema/                 Runtime-owned Effect schemas
        errors/                 Tagged runtime errors
        observability/          Logger/tracer/metrics roots
        process-runtime/        ProcessView, RoleView, surface assembly
    harnesses/
      elysia/                   Server harness adapter
      inngest/                  Async harness adapter
    topology/                   Topology export shapes (if earned in P2)

  hq-sdk/                       PUBLIC - authoring APIs
    ... defineService, defineApp, startAppRole, define*Plugin, bindService ...
```

The canonical stance is:

```text
RAWR owns semantic meaning.
Effect owns execution mechanics.
Boundary frameworks keep their jobs.
```

## Runtime-Owned Service Graph for the Active Lane

These runtime-owned services land incrementally across the dominos:

**M2-U00 (first server path):**
- RuntimeConfig — validated runtime config root
- ProcessIdentity — app id, role set, instance identifiers
- RuntimeTelemetry — logger root, analytics
- DbPool — database pool (currently in-memory adapter)
- Clock — time source (currently mock)
- WorkspaceRoot — workspace/repo root identity
- BoundaryCache — memoized service binding

**M2-U01 (bootgraph hardening):**
- Tagged runtime errors (BootModuleStartError, BootModuleConflictError, etc.)
- Rollback/shutdown via Effect scope finalization

**M2-U02 (compiler + process-runtime):**
- ProcessView — stable RAWR-shaped process view for plugins/harnesses
- RoleView — stable RAWR-shaped role view
- SurfaceAssembler — builds mounted surface runtime from bound role resources
- TopologyRegistry (if earned)

**M2-U03 (async path):**
- AsyncActivation — activation handle into the durable async plane

## Sequencing Posture

The canonical Phase 2 sequence lists the runtime seam deletion near the end of the phase. The local execution posture intentionally pulls forward the minimum server-runtime path needed to delete `apps/hq/legacy-cutover.ts` in the first live slice.

That is not a re-decision. It is a disciplined readjustment driven by the explicit Phase 2 entry condition:

- the only surviving executable bridge must die first, not become the default runtime wrapper for the rest of the phase

The rule is:

- pull forward only the minimum substrate needed to replace the live bridge
- do not smuggle full-platform generalization or optional runtimes into that first cut
- build `packages/runtime/substrate` from the first slice, not as a later generalization

## Global Guardrails

Implementation agents should continuously anchor on these rules:

- do not reopen settled Phase 1 authority decisions
- delete `apps/hq/legacy-cutover.ts` before claiming the Phase 2 plateau
- `server` and `async` are mandatory; `web`, `cli`, and `agent` remain optional or reserved
- bootgraph remains narrow and process-local
- runtime compiler scope remains narrow to the active lane
- the runtime substrate remains a hidden realization seam, not a second business plane
- only earned server and async projections move into the active lane
- archived or frozen compatibility lanes do not get to steer runtime design
- if HQ Ops runtime or verification work gets confusing, test the service-internal divergence hypothesis early
- do not let temporary wrappers or migration adapters become new authority
- raw Effect vocabulary stays quarantined inside `packages/runtime/*`; ordinary service, plugin, or app authors do not write raw `Layer`, `Context.Tag`, `ManagedRuntime`, or `Effect.Service`
- do not build a second lifecycle engine beneath bootgraph; Effect owns execution, bootgraph owns planning
- do not surface a public generic DI-container vocabulary as a peer architecture

## Domino Order

This milestone is deliberately sequenced to make each next move safer than the previous one:

1. cut the first canonical server runtime path and delete the surviving executable bridge, introducing `packages/runtime/substrate` and `packages/runtime/bootgraph` with minimum viable kernel
2. harden bootgraph with Effect lowering model, dependency ordering, rollback, tagged errors
3. generalize runtime compiler and build process-runtime inside substrate (ProcessView, RoleView, SurfaceAssembler)
4. install the canonical async runtime path with Inngest harness
5. replace transitional plugin builders with canonical role and surface builders in `packages/hq-sdk`
6. migrate the proof slices onto the new runtime shell
7. ratchet proofs, delete remaining transitional seams, and freeze Plateau 2

That order is load-bearing. The first issue deliberately front-loads the bridge deletion because the boundary contract demands it. Effect enters the repo in that first slice.

## Issue Inventory

```yaml
issues:
  - id: M2-U00
    title: "Replace legacy cutover with the canonical server runtime path"
    status: planned
    blocked_by: []
  - id: M2-U01
    title: "Harden bootgraph with Effect lowering and failure semantics"
    status: planned
    blocked_by: [M2-U00]
  - id: M2-U02
    title: "Generalize runtime compiler and build process-runtime inside substrate"
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
| `M2-U00` | [Replace legacy cutover with the canonical server runtime path](../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md) | none | Replace the one surviving executable bridge with a minimal canonical server runtime path, introducing `packages/runtime/substrate` and `packages/runtime/bootgraph` with the minimum viable Effect-backed kernel. This is the moment Effect enters the repo. |
| `M2-U01` | [Harden bootgraph with Effect lowering and failure semantics](../issues/M2-U01-harden-bootgraph-lifetimes-and-failure-semantics.md) | `M2-U00` | Turn the minimal first cut into a real bootgraph with Effect-backed lowering, dependency ordering, rollback via scope finalization, tagged runtime errors, and the guarantees Phase 2 actually promises. |
| `M2-U02` | [Generalize runtime compiler and build process-runtime inside substrate](../issues/M2-U02-generalize-runtime-compiler-and-process-runtime.md) | `M2-U01` | Create `packages/runtime/compiler` and build process-runtime inside `packages/runtime/substrate` with ProcessView, RoleView, SurfaceAssembler, and started-process handle with `stop()`. |
| `M2-U03` | [Install the canonical async runtime path](../issues/M2-U03-install-canonical-async-runtime-path.md) | `M2-U02` | Make `apps/hq/async.ts` real through canonical async runtime seams, adding `packages/runtime/harnesses/inngest` and the AsyncActivation runtime service. |
| `M2-U04` | [Replace transitional plugin builders with canonical role and surface builders](../issues/M2-U04-replace-transitional-plugin-builders-with-canonical-builders.md) | `M2-U03` | Remove transitional public builder grammar so the active authoring model in `packages/hq-sdk` matches the runtime shell that now exists. |
| `M2-U05` | [Migrate the Phase 2 proof slices onto the canonical runtime shell](../issues/M2-U05-migrate-phase-2-proof-slices.md) | `M2-U04` | Prove the new runtime shell through `example-todo`, HQ Ops, and the new async exemplar instead of relying on transitional proofs. |
| `M2-U06` | [Ratchet Phase 2 proofs, delete transitional runtime seams, and close the plateau](../issues/M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md) | `M2-U05` | Freeze Plateau 2 truthfully and remove any remaining runtime-transition seams before Phase 3 planning begins. |

## Milestone-Wide Acceptance Criteria

- [ ] `apps/hq/server.ts` and `apps/hq/async.ts` boot through canonical app/runtime APIs.
- [ ] `apps/hq/legacy-cutover.ts` is deleted.
- [ ] `packages/runtime/bootgraph`, `packages/runtime/compiler`, `packages/runtime/substrate`, and active-lane harness adapters are real and narrow.
- [ ] `packages/runtime/substrate` contains an Effect-backed kernel with runtime-owned services and one root `ManagedRuntime` per process.
- [ ] At least one canonical server slice and one canonical async slice run through the new runtime shell.
- [ ] No live runtime path depends on the legacy host-composition chain.
- [ ] Transitional public builder grammar is gone from the active lane.
- [ ] Raw Effect types are not exposed in any public authoring API.
- [ ] Docs and proofs describe only settled Plateau 2 reality.

## Practical Hand-Off

The next live slice is [M2-U00](../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md). Its job is to cut the first real server runtime path and delete `apps/hq/legacy-cutover.ts`, introducing `packages/runtime/substrate` and `packages/runtime/bootgraph` with the minimum viable Effect-backed kernel.
