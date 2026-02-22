# Phase E Runtime Execution Orchestrator Plan (Verbatim Carry-Over)

Execution follows `docs/projects/orpc-ingest-workflows-spec/PHASE_E_EXECUTION_PACKET.md`.

Ordered runtime slices:
1. E1 dedupe policy hardening
2. E2 finished-hook policy hardening
3. E3 structural evidence gates
4. E4 decision closure
5. E5 independent review + fix closure
6. E5A structural assessment
7. E6 docs + cleanup
8. E7 phase-f readiness

Invariant locks:
- runtime identity: `rawr.kind + rawr.capability + manifest registration`
- route families unchanged (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`)
- manifest authority remains `rawr.hq.ts`
- channel semantics remain command-surface only
- forward-only posture
