---
id: M1-U01
title: "[M1] Archive false futures and freeze the marketplace compatibility lane"
state: done
priority: 1
estimate: 4
project: rawr-final-architecture-migration
milestone: M1
assignees: [codex]
labels: [migration, phase-1]
parent: null
children: []
blocked_by: [M1-U00]
blocked: [M1-U02]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Archive `coordination` and `support-example`, then freeze the current HQ marketplace plugin lane in place so it stops acting like an unresolved topology decision during Phase 1.

## Deliverables
- Remove live `coordination` surfaces from build, test, runtime, and inventory participation.
- Remove live `support-example` surfaces from build, test, runtime, manifest/host registration, and test inventory participation.
- Preserve durable archive evidence for both removed lanes, including the useful support-example fixtures and lessons.
- Keep `plugins/agents/hq` in place as the frozen Cloud Code/Codex compatibility lane for Phase 1 and explicitly defer its redesign.

## Acceptance Criteria
- [x] `coordination` is absent from live build, test, runtime, and inventory surfaces.
- [x] `support-example` is absent from live build, test, runtime, manifest/host registration, and live test inventory.
- [x] The preserved support-example evidence includes lifecycle fixtures, a representative trigger payload, and translation of the best tests into later async acceptance language.
- [x] `plugins/agents/hq` remains in place as the only allowed Phase 1 marketplace-plugin compatibility lane, and no new `plugins/agents/*` roots or topology churn were introduced.
- [x] `rawr plugins sync @rawr/plugin-hq --dry-run` still resolves under the preserved compatibility path.
- [x] Static scans prove there are no live imports or registrations pointing at archived coordination/support-example surfaces.

## Testing / Verification
- `bun run sync:check`
- `bun run phase-1:gates:baseline`
- `bun run phase-c:c2:quick`
- `bun run phase-d:d2:full`
- `bun run phase-e:e2:full`
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run`
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run --force`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `rg -n 'coordination|support-example' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test -d plugins/agents/hq`
- `bunx nx test @rawr/plugin-mfe-demo`
- `bunx nx test @rawr/hq`
- `bunx nx test @rawr/server`
- `bun run rawr hq up --observability required --open none`
- `bun run rawr hq status --json`

## Dependencies / Notes
- Blocked by: [M1-U00](./M1-U00-guardrails-and-phase-1-ledger.md).
- Blocks: [M1-U02](./M1-U02-reserve-hq-ops-seam.md).
- Milestone: [M1: Collapse Authority onto the Canonical HQ Lane](../milestones/M1-authority-collapse.md).
- This slice is subtraction with evidence retention; the archive artifacts are the only sanctioned memory of the removed lanes after this cut lands.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
### Why This Slice Exists
False futures must leave the live lane before canonical seams are installed, or they will keep exerting pressure as plausible authorities during the rest of Phase 1.

### Scope Boundaries
In scope:
- Archive and remove live `coordination` surfaces.
- Archive and remove live `support-example` surfaces.
- Preserve useful evidence from those archived lanes.
- Freeze the current Cloud Code/Codex marketplace plugin lane in place.
- Update workspace and inventory surfaces so archived lanes stop participating in live build, typecheck, test, and runtime paths.

Out of scope:
- Normalizing `coordination`.
- Keeping `support-example` alive as live Phase 1 architecture.
- Re-homing or redesigning the marketplace-plugin lane.
- Creating the later async replacement slice.

### Implementation Guidance
This slice is about subtraction with evidence retention. The archive artifacts matter because they are the only sanctioned memory of the removed lanes after the live roots are cut. The marketplace-plugin lane is intentionally not normalized here: preserving current sync/install behavior is the Phase 1 requirement, and the future home/design is deferred to the next-stage readjustment.

## Implementation Decisions

- **Archive proof semantics require absence plus evidence, not preserved roots**
  - The Phase 1 archive checks now require three things together: the archived roots stay classified as archived in the ledger, the deleted roots remain absent from the live tree, and the archive lesson docs exist with the preserved wiring/fixture lessons. This keeps the archive lane from surviving as a false-future proof dependency.
- **Marketplace-lane verification uses conflict-tolerant dry-run for local installs**
  - `rawr plugins sync @rawr/plugin-hq --dry-run` still resolves the preserved `plugins/agents/hq` source lane, but plain dry-run exits non-zero when downstream Codex/Claude targets already contain local conflicts. For verification, `--dry-run --force` is the non-mutating way to prove the source lane still resolves cleanly without treating local install drift as an architecture regression.
- **HQ stack validation is part of the slice proof band**
  - U01 now requires a managed-runtime bring-up before commit. `rawr hq up --observability required --open none`, `rawr hq status --json`, direct health probes, and `.rawr/hq/runtime.log` confirmed the local stack is healthy after the archive cut. Startup still emits an environment-side `hq:status not found` error from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`, but the managed runtime in this workspace reaches a healthy running state.
- **Downstream proof bands must ratchet against archive absence, not archived workflow semantics**
  - The Phase C/D/E verifier stack now treats U01 as a hard architectural cut. `verify-telemetry-contract`, `verify-d2-finished-hook-contract`, `verify-e2-finished-hook-policy`, the route-boundary harness matrix, and completion-mode manifest smoke all ratchet against the live post-U01 seams plus explicit archive absence instead of deleted `coordination` / `support-example` workflow artifacts.

### Files
- `services/coordination`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- `services/support-example`
- `plugins/workflows/support-example`
- `plugins/agents/hq`
- `docs/archive/coordination/lessons.md`
- `docs/archive/support-example/lessons.md`

### Paper Trail
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)
- Slice branch: `agent-FARGO-M1-U01-archive-false-futures`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
