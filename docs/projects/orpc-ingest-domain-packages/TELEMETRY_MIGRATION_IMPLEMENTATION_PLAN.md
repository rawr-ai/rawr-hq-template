# Telemetry Migration Implementation Plan

Role: execution plan and checklist of record for migrating servicepackages to the canonical telemetry model

```yaml
role: telemetry-migration-plan
source_of_truth:
  - TELEMETRY_DESIGN.md
  - DECISIONS.md#decision-9
temporary_execution_artifacts:
  orchestrator:
    - TELEMETRY_MIGRATION_ORCHESTRATOR_SCRATCH.md
    - TELEMETRY_MIGRATION_ORCHESTRATOR_PLAN.md
  agent_pattern:
    scratch: TELEMETRY_AGENT_<ROLE>_SCRATCH.md
    plan: TELEMETRY_AGENT_<ROLE>_PLAN.md
team:
  orchestrator: integration-and-gates
  slice_a: boundary-and-shared-observability
  slice_b: service-local-follow-through
  slice_c: tests-and-teaching-surface-cleanup
  review: slice verification and legacy-seam detection
  design_check: design drift detection against TELEMETRY_DESIGN.md
slices:
  - id: slice-0
    owner: orchestrator
    depends_on: []
  - id: slice-1
    owner: slice_a
    depends_on: [slice-0]
  - id: slice-2
    owner: slice_a
    depends_on: [slice-1]
  - id: slice-3
    owner: slice_c
    depends_on: [slice-2]
  - id: slice-4
    owner: orchestrator
    depends_on: [slice-3]
verification_bundles:
  package:
    - cd services/example-todo && bun run typecheck
  host:
    - bunx vitest run packages/core/test/telemetry.test.ts apps/server/test/telemetry-bootstrap.test.ts
```

## Jump Map

- [Status](#status)
- [Execution Checklist](#execution-checklist)
- [Team Design / Execution Model](#team-design--execution-model)
- [Migration Goal](#migration-goal)
- [Slice Plan](#slice-plan)
- [Test And Verification Strategy](#test-and-verification-strategy)
- [Migration Notes](#migration-notes)
- [Exit Criteria](#exit-criteria)
- [Cleanup Protocol](#cleanup-protocol)

## Status

This document is the implementation-plan companion to `TELEMETRY_DESIGN.md`.

It translates the canonical telemetry design into:

- execution team structure
- migration slices
- acceptance criteria
- verification strategy
- phase gates
- migration sequencing notes

It does not redefine the target architecture. That remains in
`TELEMETRY_DESIGN.md`.

## Execution Checklist

- [x] Slice 0 complete and gate passed
- [x] Slice 1 complete and gate passed
- [x] Slice 2 complete and gate passed
- [x] Slice 3 complete and gate passed
- [x] Slice 4 complete and gate passed
- [x] Review pass complete
- [x] Design-check pass complete
- [x] Temporary execution docs deleted
- [x] Final verification rerun after cleanup
- [x] Repo clean at handoff

## Team Design / Execution Model

Use a small coordinated team, not a single agent and not a large swarm.

| Role | Owns | Primary write scope |
|---|---|---|
| `orchestrator` | migration packet, slice sequencing, phase gates, clean integration | cross-slice integration and final doc/verification state |
| `slice_a` | boundary typing cleanup and shared observability seam migration | `services/example-todo/src/orpc/baseline/*`, `services/example-todo/src/orpc/service/*`, `services/example-todo/src/orpc/middleware/observability/*`, `services/example-todo/src/service/middleware/observability.ts`, `services/example-todo/src/client.ts` |
| `slice_b` | service-local follow-through after the seam moves | `services/example-todo/src/service/impl.ts`, service-local doc/comments tied to telemetry semantics |
| `slice_c` | tests and teaching-surface cleanup | `services/example-todo/test/*`, related doc/examples that still teach the old seam |
| `review` | implementation-plan compliance review, hidden legacy seam detection, verification evidence review | no primary write scope; may propose follow-up fixes against any slice output |
| `design_check` | canonical telemetry-model conformance review against `TELEMETRY_DESIGN.md` | no primary write scope; may request corrections where code drifts from design |

The orchestrator does not own every code edit. It owns plan fidelity and
integration.

### Coordination rules

- One slice agent works per write scope at a time.
- The orchestrator owns the order of slices and merges outcomes.
- No slice may proceed past its phase gate without explicit verification.
- If a slice reveals a design contradiction with `TELEMETRY_DESIGN.md`, stop
  and update docs before continuing.

### Agent scratchpad and miniature-plan contract

Every execution agent, including review and design-check agents, must create
both:

- one scratchpad doc
- one miniature working-plan doc

Required naming pattern:

- `TELEMETRY_AGENT_<ROLE>_SCRATCH.md`
- `TELEMETRY_AGENT_<ROLE>_PLAN.md`

Allowed `<ROLE>` values:

- `SLICE_A`
- `SLICE_B`
- `SLICE_C`
- `REVIEW`
- `DESIGN_CHECK`

Required behavior:

- create both docs immediately after spawn
- write a same-turn heartbeat/check-in to the scratchpad immediately
- keep both docs updated during work
- delete both docs at the end after verification and review are complete

The orchestrator must also maintain both:

- `TELEMETRY_MIGRATION_ORCHESTRATOR_SCRATCH.md`
- `TELEMETRY_MIGRATION_ORCHESTRATOR_PLAN.md`

These are temporary execution artifacts and must be deleted before final
completion.

### Gate protocol

Every gate in this plan is hard, not advisory.

The orchestrator is the sign-off authority for all gates.

A gate passes only if all of the following are true:

- every acceptance-criteria bullet for that slice is satisfied
- every verification command or static audit listed for that slice has been run
- every verification item has the expected result
- required manual code-state assertions have been explicitly checked

Required sign-off evidence:

- command list used
- pass/fail result for each command
- static audit result for each grep check
- written confirmation for each manual code-state assertion

### Planned handoff order

Execute in this order unless a documented blocker forces resequencing:

1. Slice 0
2. Slice 1
3. Slice 2
4. Slice 3
5. Slice 4

Handoffs are sequential because each later slice depends on the earlier seam
being made honest first.

- Slice Agent A owns Slice 1 and Slice 2, including the shared observability
  seam migration.
- Slice Agent B begins service-local cleanup only after Slice 2 passes its
  gate.
- Slice Agent C starts only after the new seam is live enough that tests can be
  rewritten without preserving the old model.

### Slice dependency map

```text
Slice 0 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4
```

- `slice_a` owns Slice 1 and Slice 2
- `slice_b` participates after Slice 2
- `slice_c` starts after Slice 2 and must finish before Slice 4 closes

## Migration Goal

At the end of this migration:

- telemetry is no longer part of the servicepackage dependency model
- host/runtime bootstrap is the only canonical telemetry infrastructure seam
- servicepackage observability consumes the active span from OpenTelemetry
  runtime context
- package tests and docs no longer teach package-local telemetry creation as
  the architectural seam

## Slice Plan

### Slice 0 — Baseline prep and no-drift guard

- [x] Slice 0 execution complete
- [x] Slice 0 gate passed

Goal:

- make the migration boundaries explicit before code changes begin

Work:

- verify the design packet is authoritative:
  - `TELEMETRY_DESIGN.md`
  - `DECISIONS.md`
  - `guidance.md`
- identify all code/doc surfaces that still encode the old telemetry seam
- confirm slice ownership and write scopes

Acceptance criteria:

- [x] the migration packet is current and non-contradictory
- [x] the orchestrator has a concrete conflict inventory
- [x] slice ownership is explicit

Verification:

- the following docs exist:
  - `./TELEMETRY_DESIGN.md`
  - `./TELEMETRY_MIGRATION_IMPLEMENTATION_PLAN.md`
  - `./DECISIONS.md`
  - `./guidance.md`
- run from repo root:
  - `rg -n "host-owned OpenTelemetry bootstrap|active span from OpenTelemetry context|not modeled as a servicepackage dependency" ./TELEMETRY_DESIGN.md ./DECISIONS.md ./guidance.md`
- the `rg` command above must return matches in:
  - `TELEMETRY_DESIGN.md`
  - `DECISIONS.md`
  - `guidance.md`
- the conflict inventory in this plan names all currently known telemetry seam
  conflict surfaces:
  - `services/example-todo/src/orpc/baseline/types.ts`
  - `services/example-todo/src/orpc/boundary/servicepackage.ts`
  - `services/example-todo/src/orpc/service/define.ts`
  - `services/example-todo/src/orpc/middleware/observability/*`
  - `services/example-todo/test/helpers.ts`
  - `services/example-todo/test/context-typing.ts`
  - `services/example-todo/test/observability.test.ts`
- team ownership at the top of this plan maps each later slice to exactly one
  primary slice agent

Gate:

- [x] Slice 0 gate sign-off recorded
- do not start code edits until the conflict surfaces are named and the target
  design is stable enough to execute
- do not parallelize code slices before this gate is passed

### Slice 1 — Remove telemetry from the package dependency model

- [x] Slice 1 execution complete
- [x] Slice 1 gate passed

Goal:

- break the false architectural model that telemetry is part of servicepackage deps

Work:

- remove `telemetry` from baseline dependency contracts
- remove package-boundary typing that implies telemetry belongs in client deps
- remove service-builder assumptions that observability requires telemetry in
  the dependency bag

Primary targets:

- `services/example-todo/src/orpc/baseline/types.ts`
- `services/example-todo/src/orpc/boundary/servicepackage.ts`
- `services/example-todo/src/orpc/service/define.ts`
- `services/example-todo/src/client.ts`

Acceptance criteria:

- [x] package client construction no longer requires telemetry in `deps`
- [x] baseline/service typing no longer treats telemetry as part of `BaseDeps`
- [x] no new compatibility alias preserves telemetry-through-deps as a supported seam

Verification:

- run from `services/example-todo`:
  - `bun run typecheck`
- static audit commands must satisfy all of the following:
  - `rg -n "telemetry: Telemetry" services/example-todo/src/orpc/baseline/types.ts services/example-todo/src/orpc/service/define.ts` returns no matches
  - `rg -n "deps: BaseDeps" services/example-todo/src/orpc/boundary/servicepackage.ts` returns no matches
  - `rg -n "telemetry: createOpenTelemetryAdapter\\(|telemetry:\\s*createOpenTelemetryAdapter" services/example-todo/src/client.ts services/example-todo/test/helpers.ts` returns no matches in `src/client.ts`
- code-state assertions:
  - `services/example-todo/src/orpc/baseline/types.ts` no longer declares `telemetry` on `BaseDeps`
  - `services/example-todo/src/orpc/boundary/servicepackage.ts` no longer requires `deps: BaseDeps` as the servicepackage-boundary contract
  - `services/example-todo/src/client.ts` / `CreateClientOptions["deps"]` no longer imply telemetry belongs in client construction input
  - `services/example-todo/test/context-typing.ts` contains a negative typing assertion proving telemetry is not part of `CreateClientOptions["deps"]`

Gate:

- [x] Slice 1 gate sign-off recorded
- do not migrate tests yet if code still supports both seams at once
- do not start service-local observability cleanup until servicepackage boundary
  typing no longer admits telemetry-through-deps as the canonical model

### Slice 2 — Migrate observability middleware to active-span access

- [x] Slice 2 execution complete
- [x] Slice 2 gate passed

Goal:

- move servicepackage observability to the canonical runtime seam

Work:

- rewrite baseline and additive observability paths to read the active span
  from OpenTelemetry runtime context
- keep servicepackage observability semantics intact:
  - attributes
  - events
  - log enrichment
- preserve graceful degradation when no active span exists

Primary targets:

- `services/example-todo/src/orpc/middleware/observability/*`
- `services/example-todo/src/service/middleware/observability.ts`
- related comments in `services/example-todo/src/service/impl.ts`

Acceptance criteria:

- [x] no observability path reads `context.deps.telemetry`
- [x] servicepackage observability still enriches the active span correctly
- [x] required service observability middleware no longer relies on telemetry in the dependency-driven context shape
- [x] behavior degrades safely when no active span exists

Verification:

- run from `services/example-todo`:
  - `bun run typecheck`
  - `bunx vitest run test/observability.test.ts test/todo-service.test.ts test/procedure-errors.test.ts test/procedure-meta.test.ts`
- static audit commands must satisfy all of the following:
  - `rg -n "context\\.deps\\.telemetry" services/example-todo/src/orpc/middleware/observability services/example-todo/src/service/middleware/observability.ts services/example-todo/src/service/impl.ts` returns no matches
  - `rg -n "deps\\.telemetry|has_telemetry" services/example-todo/test/observability.test.ts services/example-todo/test/context-typing.ts` returns no matches
- code-state assertions:
  - baseline observability in `services/example-todo/src/orpc/middleware/observability/handler.ts` reads the active span from OpenTelemetry runtime context, not from `context.deps.telemetry`
  - additive observability in `services/example-todo/src/orpc/middleware/observability/index.ts` no longer constrains middleware context with `deps.telemetry`
  - required service observability in `services/example-todo/src/service/middleware/observability.ts` still enriches spans with service semantics and no longer depends on a telemetry-bearing dependency context
  - `services/example-todo/test/observability.test.ts` verifies both:
    - enrichment of an active span
    - safe behavior when no active span exists

Gate:

- [x] Slice 2 gate sign-off recorded
- do not remove legacy tests/helpers until observability passes cleanly on the
  new seam

### Slice 3 — Remove package-local telemetry teaching surfaces

- [x] Slice 3 execution complete
- [x] Slice 3 gate passed

Goal:

- eliminate the misleading local telemetry seam from tests and servicepackage docs

Work:

- stop creating telemetry in package test helpers as if that were the
  architectural boundary
- remove or demote servicepackage-local telemetry seam artifacts that still look
  canonical
- align test setup with host bootstrap + active-span context

Primary targets:

- `services/example-todo/test/helpers.ts`
- `services/example-todo/test/observability.test.ts`
- `services/example-todo/test/context-typing.ts`
- `services/example-todo/test/host-adapters.test.ts`
- package-local telemetry comments/docs

Acceptance criteria:

- [x] tests no longer teach package-local telemetry creation as the main seam
- [x] no package helper suggests callers should inject telemetry through deps
- [x] servicepackage-local telemetry seam files are removed from the servicepackage boundary, proto SDK, and tests

Verification:

- run from `services/example-todo`:
  - `bun run typecheck`
  - `bunx vitest run test/observability.test.ts test/provider-middleware.test.ts test/todo-service.test.ts test/procedure-errors.test.ts test/procedure-meta.test.ts`
- static audit commands must satisfy all of the following:
  - `rg -n "context\\.deps\\.telemetry" services/example-todo/src services/example-todo/test` returns no matches
  - `rg -n "createOpenTelemetryAdapter\\(" services/example-todo/test/helpers.ts services/example-todo/test/observability.test.ts services/example-todo/test/provider-middleware.test.ts` returns no matches
  - `rg -n "has_telemetry|telemetry: createOpenTelemetryAdapter|deps:\\s*\\{[^}]*telemetry" services/example-todo/test/context-typing.ts services/example-todo/test/helpers.ts services/example-todo/test/observability.test.ts services/example-todo/test/provider-middleware.test.ts` returns no matches
  - `rg -n "export type \\{ Telemetry|export \\{.*telemetry|ports/telemetry|host-adapters/telemetry" services/example-todo/src/orpc-sdk.ts services/example-todo/src/client.ts services/example-todo/src/orpc/boundary services/example-todo/src/orpc/baseline services/example-todo/src/orpc/service` returns no matches
- code-state assertions:
  - `services/example-todo/test/helpers.ts` does not create or inject telemetry as part of package dependency composition
  - `services/example-todo/test/context-typing.ts` no longer teaches telemetry-through-deps
  - `services/example-todo/test/observability.test.ts` no longer seeds telemetry through `deps`
  - no servicepackage-local telemetry seam files remain in the servicepackage boundary, proto SDK, or tests

Gate:

- [x] Slice 3 gate sign-off recorded
- do not close the migration until examples/tests/docs stop teaching the old
  seam

### Slice 4 — Final cleanup and canonicalization

- [x] Slice 4 execution complete
- [x] Slice 4 gate passed

Goal:

- ensure the canonical telemetry model is the only clear model left

Work:

- clean residual wording across the package
- update the active docs packet if any migration assumptions changed during
  execution
- confirm no hidden backwards dependency or circular import was introduced

Acceptance criteria:

- [x] code, tests, and docs agree on the same telemetry model
- [x] no “almost works” legacy telemetry seam remains as a plausible pattern
- [x] the migration packet is ready to hand off for future package adoption

Verification:

- run from repo root:
  - `bunx vitest run packages/core/test/telemetry.test.ts apps/server/test/telemetry-bootstrap.test.ts`
- run from `services/example-todo`:
  - `bun run typecheck`
  - `bunx vitest run test/observability.test.ts test/provider-middleware.test.ts test/todo-service.test.ts test/procedure-errors.test.ts test/procedure-meta.test.ts`
- static audit commands must satisfy all of the following:
  - `rg -n "context\\.deps\\.telemetry|deps:\\s*\\{[^}]*telemetry|BaseDeps.*telemetry|telemetry:\\s*Telemetry" services/example-todo/src services/example-todo/test` returns no matches
  - `rg -n "createOpenTelemetryAdapter\\(|host-adapters/telemetry/opentelemetry|ports/telemetry" services/example-todo/src services/example-todo/test` returns no matches
  - `rg -n "telemetry is not modeled as a servicepackage dependency|host-owned OpenTelemetry bootstrap|active span from OpenTelemetry context|TELEMETRY_MIGRATION_IMPLEMENTATION_PLAN.md" ./TELEMETRY_DESIGN.md ./DECISIONS.md ./guidance.md` returns matches in all three docs
- code-state assertions:
  - the canonical telemetry model is represented only by host bootstrap + active-span consumption
  - no servicepackage boundary or servicepackage authoring surface implies telemetry belongs in service deps
  - `services/example-todo/src/client.ts` no longer implies telemetry in `CreateClientOptions["deps"]`
  - `services/example-todo/src/orpc/service/define.ts` no longer constrains observability builders around `deps.telemetry`
  - `services/example-todo/src/orpc/middleware/observability/*` reads active span from runtime context
  - `services/example-todo/src/service/middleware/observability.ts` still contributes service semantics without reintroducing dependency injection
  - no servicepackage-local telemetry seam artifacts remain in `services/example-todo/src` or `services/example-todo/test`

Gate:

- [x] Slice 4 gate sign-off recorded

## Test And Verification Strategy

Keep testing architecture-focused and migration-proportional.

### Must-pass checks

- package typecheck
- host bootstrap tests
- package observability tests

### Verify directly

- telemetry bootstrap still installs once
- bootstrap ordering still happens before app/plugin/runtime wiring
- observability enriches an active span when present
- observability does not fail when no active span exists
- telemetry is no longer required in client `deps`

### Review and design-check passes

- [x] review agent pass complete
- [x] design-check agent pass complete

The `review` role must verify:

- slice outputs satisfy acceptance criteria exactly
- verification evidence is complete
- hidden legacy telemetry seams are not left behind

The `design_check` role must verify:

- resulting code still matches `TELEMETRY_DESIGN.md`
- no local shortcut reintroduces telemetry as a servicepackage dependency seam
- no implementation drift weakens the host-bootstrap ownership model

### Do not turn this into

- deep exporter correctness testing
- collector end-to-end testing in package suites
- a broad telemetry feature project

## Migration Notes

### Conflict surfaces

- `services/example-todo/src/orpc/baseline/types.ts`
- `services/example-todo/src/orpc/boundary/servicepackage.ts`
- `services/example-todo/src/orpc/service/define.ts`
- `services/example-todo/src/orpc/middleware/observability/*`
- `services/example-todo/src/orpc/ports/telemetry.ts`
- `services/example-todo/src/orpc/host-adapters/telemetry/opentelemetry.ts`
- `services/example-todo/src/orpc-sdk.ts`
- `services/example-todo/test/helpers.ts`
- `services/example-todo/test/host-adapters.test.ts`
- `services/example-todo/test/context-typing.ts`
- `services/example-todo/test/observability.test.ts`

### Hidden risks / black ice

- leaving a mixed model where some code reads active-span context and some code
  still expects injected telemetry deps
- leaving boundary typing that silently keeps telemetry in client deps
- leaving package-local telemetry artifacts that future implementers copy
- updating code without updating the tests that teach the wrong seam

### Sequencing constraints

- boundary typing and observability access path must change in the same
  migration wave
- tests/helpers must be updated before declaring the old seam gone
- docs must be updated with the code, not afterward

## Exit Criteria

This migration is complete when all of the following are true:

- telemetry is not part of servicepackage dependency composition
- host bootstrap remains the single source of truth for telemetry
  infrastructure
- servicepackage observability uses the active span from runtime context
- package tests and examples no longer teach telemetry-through-deps
- the docs packet describes only the canonical telemetry model plus explicit
  migration history where needed

## Cleanup Protocol

Before final completion:

- [x] all `TELEMETRY_AGENT_*_SCRATCH.md` docs are deleted
- [x] all `TELEMETRY_AGENT_*_PLAN.md` docs are deleted
- [x] `TELEMETRY_MIGRATION_ORCHESTRATOR_SCRATCH.md` is deleted
- [x] `TELEMETRY_MIGRATION_ORCHESTRATOR_PLAN.md` is deleted
- [x] only durable docs remain in the packet
- [x] worktree is clean
- [x] final verification is rerun after cleanup if tracked docs were deleted late

Exception:

- active durable design/spec docs are not scratch docs and must not be deleted
