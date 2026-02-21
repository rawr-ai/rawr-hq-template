# Phase E Acceptance Gates

## Gate Cadence
1. Quick suite on every implementation commit.
2. Full suite at end of each slice and before phase exit.

## Gate Commands

### E1
- Quick:
  - `bun run phase-e:e1:quick`
- Full:
  - `bun run phase-e:e1:full`

### E2
- Quick:
  - `bun run phase-e:e2:quick`
- Full:
  - `bun run phase-e:e2:full`

### E3
- Quick:
  - `bun run phase-e:e3:quick`
- Full:
  - `bun run phase-e:e3:full`

### E4
- Decision closure verification:
  - `bun run phase-e:gate:e4-disposition`

### Phase Exit
- `bun run phase-e:gates:exit`

## Mandatory Assertions
1. Dedupe policy assertions are structural and runtime-verified.
2. Finished-hook policy assertions are structural and runtime-verified.
3. Evidence/disposition verification survives cleanup.
4. Route-family and channel semantics remain unchanged.
