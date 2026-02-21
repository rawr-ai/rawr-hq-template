# Phase C Runtime Execution Plan (Verbatim)

Execution order:
1. C1 -> C2 -> C3 -> C4 (conditional) -> C5 -> C5A -> C6 -> C7
2. Per-slice branch submission via Graphite (`gt submit --ai`).
3. Forward-only posture; fix in place.
4. C5 and C5A mandatory before C6/C7.
5. C4 disposition artifact required before C5 starts.

Locked invariants:
1. Runtime semantics derive from rawr.kind + rawr.capability + manifest registration.
2. Route families unchanged (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. Manifest-first authority and D-013 hard deletion unchanged.
4. D-016 seam-now posture unchanged; no singleton-global assumptions.
