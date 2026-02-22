# Orchestrator Scratchpad — Example Alignment + Golden Example Conformance Pass

## Drift Lock
- Canonical authority remains: `ARCHITECTURE.md`, `DECISIONS.md`, `axes/*.md`.
- Examples must conform 100% to canonical policy.
- No runtime code changes.

## Roster
- E1: e2e-01
- E2: e2e-02
- E3: e2e-03
- E4: e2e-04 (golden quality)
- C: final consistency checker

## Execution checkpoints
1. Spawn all 5 agents fresh (default type).
2. Confirm each wrote plan + scratchpad artifacts.
3. Confirm each read full canonical corpus + skills.
4. Wait for E1-E4 outputs.
5. Trigger C final pass.
6. Run orchestrator final validation and write final report.

## Open risks to watch
- Example snippets that imply host-domain hardcoding as required policy.
- Mixed signals on example authority vs policy authority.
- Any example showing disallowed caller traffic to `/api/inngest`.
- Any example implying package-owned workflow boundaries.
