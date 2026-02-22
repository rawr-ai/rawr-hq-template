# AGENT 3 Plan Verbatim — Phase F Verification and Gates Design

## Mission
1. Design Phase F verification and gate architecture.
2. Define quick/full/exit cadence and mandatory assertions.
3. Define durable evidence/disposition strategy so cleanup cannot break closure verification.
4. Carry forward anti-drift and adversarial checks lessons from prior phases.

## Constraints
1. Read-only analysis only; no file mutations.
2. Align with existing `phase-*:gate:*`, `<slice>:quick`, `<slice>:full`, `phase-*:gates:exit` command surface.
3. Preserve locked invariants and forward-only posture.
4. Keep Graphite-first operational contract.

## Deliverables
1. `AGENT_3_PLAN_VERBATIM.md`
2. `AGENT_3_SCRATCHPAD.md`
3. `AGENT_3_FINAL_PHASE_F_VERIFICATION_AND_GATES.md`
