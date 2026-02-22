# Phase F Acceptance Gates

## Gate Cadence
1. Quick suite on every implementation commit.
2. Full suite at end of each runtime slice.
3. Full suite before independent review.
4. Full suite after blocking/high fixes.
5. Full suite after structural edits and docs/cleanup edits.
6. Full suite before phase exit.

## Gate Commands

### Drift Core
- `bun run phase-f:gate:drift-core`

### F1
- Quick:
  - `bun run phase-f:f1:quick`
- Full:
  - `bun run phase-f:f1:full`

### F2
- Quick:
  - `bun run phase-f:f2:quick`
- Full:
  - `bun run phase-f:f2:full`

### F3
- Quick:
  - `bun run phase-f:f3:quick`
- Full:
  - `bun run phase-f:f3:full`

### F4
- Assess:
  - `bun run phase-f:gate:f4-assess`
- Disposition:
  - `bun run phase-f:gate:f4-disposition`

### F5/F5A/F6/F7 Closure Gates
- `bun run phase-f:gate:f5-review-closure`
- `bun run phase-f:gate:f5a-structural-closure`
- `bun run phase-f:gate:f6-cleanup-manifest`
- `bun run phase-f:gate:f6-cleanup-integrity`
- `bun run phase-f:gate:f7-readiness`

### Phase Exit
- `bun run phase-f:gates:exit`

## Mandatory Assertions
1. Runtime identity invariant remains `rawr.kind + rawr.capability + manifest registration`.
2. Route families stay unchanged (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. `rawr.hq.ts` remains composition authority.
4. Phase F gate chain does not depend on non-durable planning/runtime scratch docs.
5. F4 disposition always declares explicit `triggered` or `deferred` state.
6. Trigger evidence artifact exists when F4 state is `triggered`.
7. Independent review scope includes adversarial boundary checks (`/api/inngest` caller rejection, `/rpc` external/runtime-ingress rejection, `/rpc/workflows` rejection).
8. Cleanup edits do not break closure-critical evidence/disposition validation.
