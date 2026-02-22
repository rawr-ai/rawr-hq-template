# Phase D Runtime Execution (Verbatim Lock)

Execution scope: D1 -> D2 -> D3 -> D4 (conditional) -> D5 -> D5A -> D6 -> D7.

Invariants:
1. Runtime semantics are `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family boundaries unchanged (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. `rawr.hq.ts` remains composition authority.
4. Forward-only posture, no rollback playbooks.

Gates:
- Quick per commit, full per slice closure.
- Blocking/high review findings fixed in-run and re-reviewed.
- Structural assessment mandatory after review closure.

Artifacts required:
- PHASE_D_EXECUTION_REPORT.md
- D5_REVIEW_DISPOSITION.md
- D5A_STRUCTURAL_DISPOSITION.md
- D6_CLEANUP_MANIFEST.md
- D7_PHASE_E_READINESS.md
- FINAL_PHASE_D_HANDOFF.md
- D4_TRIGGER_EVIDENCE.md
- D4_DISPOSITION.md
