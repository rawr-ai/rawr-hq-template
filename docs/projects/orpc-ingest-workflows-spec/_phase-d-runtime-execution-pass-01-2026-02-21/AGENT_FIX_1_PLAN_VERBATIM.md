# Agent Fix 1 Plan (Verbatim)

1. Verify current branch/worktree state and isolate the D4 verifier files targeted by AGENT_5 findings.
2. Implement HIGH fix: enforce remediation-cycle evidence (fail -> remediation commit touching D3 paths -> rerun fail) for D3 recurrence in `scripts/phase-d/verify-d4-disposition.mjs`.
3. Implement MEDIUM fix: enforce heavy-chain depth measurement (`>= 3`) in `scripts/phase-d/verify-d4-dedupe-trigger.mjs` and include measured depth evidence in result artifacts.
4. Implement MEDIUM fix: remove volatile `generatedAt` churn from D4 tracked JSON scan artifacts by making output deterministic.
5. Run required validation commands:
   - `bun run phase-d:d4:assess`
   - `bun run phase-d:gate:d4-disposition`
6. Rerun impacted D3/D4 checks as needed and record outcomes.
7. Update required scratchpad and final fix report artifacts with timestamped evidence.
8. Commit all fix-cycle changes on `codex/phase-d-d5-review-fix-closure` and return commit hash, exact commands run, and clean status.
