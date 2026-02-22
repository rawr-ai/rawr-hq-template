# Phase B Planning Runbook (Draft)

## Goal
Produce a decision-complete, implementer-ready Phase B execution packet using the same execution discipline that closed Phase A.

## Inputs
1. `PHASE_EXECUTION_WORKFLOW.md`
2. `PHASE_A_EXECUTION_REPORT.md`
3. `A9_PHASE_B_READINESS.md`
4. Canonical packet (`README.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `axes/*`)

## Proposed Planning Team
1. Agent B1: migration architecture + slice ordering
2. Agent B2: interface and file-level delta map
3. Agent B3: verification/gate contract design
4. Agent B4: independent packet review and readiness disposition

## Mandatory Planning Outputs
1. `PHASE_B_EXECUTION_PACKET.md`
2. `PHASE_B_IMPLEMENTATION_SPEC.md`
3. `PHASE_B_ACCEPTANCE_GATES.md`
4. `PHASE_B_WORKBREAKDOWN.yaml`
5. `PHASE_B_REVIEW_DISPOSITION.md`

## Planning Loop
1. Grounding pass on Phase A outcomes and open assumptions.
2. Draft Phase B slices with explicit dependencies and owner map.
3. Define gate contract and negative assertions for new boundaries.
4. Independent review pass; close blocking planning ambiguities.
5. Publish final Phase B packet and readiness to execute.

## Starting Slice Candidates (from A9)
1. `B0` `/rpc` auth-source hardening
2. `B1` workflow trigger-router isolation
3. `B2` manifest/host seam hardening
4. `B3` verification structural hardening

## Drift Guards
1. No legacy metadata runtime semantics reintroduced.
2. No collapsed route-family semantics.
3. No duplication of package-owned shared authority.
4. No unresolved blocking/high findings at planning close.

## Exit for Planning Run
1. Phase B packet is executable without major unresolved design decisions.
2. Slice order, owner, gates, and touched paths are explicit.
3. Phase B can begin immediately on approval.
