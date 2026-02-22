# Phase F Runtime Orchestrator Plan (Verbatim Runtime Execution Contract)

## Runtime Wave
Execute `G2 -> G6` in strict order with forward-only posture.

## Ordered Runtime Slices
1. `F1` runtime lifecycle seam hardening.
2. `F2` interface/policy hardening.
3. `F3` structural evidence + gate hardening.
4. `F4` conditional D-004 disposition closure.
5. `F5` independent review + fix closure.
6. `F5A` structural assessment.
7. `F6` docs + cleanup.
8. `F7` next-phase readiness + final handoff.

## Invariant Lock (Must Not Drift)
1. Runtime identity remains `rawr.kind + rawr.capability + manifest registration`.
2. Route families remain `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
3. `rawr.hq.ts` remains composition authority.
4. Channel A/B remain command surfaces only.

## Operational Contract
1. Branch-per-slice execution with immediate parent tracking.
2. Per-slice quick/full gates before submit.
3. `gt sync --no-restack` and `gt log --show-untracked` after submit.
4. No broad restacks or ad-hoc history rewrites.
5. Fix blocking/high findings in-run before advancing.
