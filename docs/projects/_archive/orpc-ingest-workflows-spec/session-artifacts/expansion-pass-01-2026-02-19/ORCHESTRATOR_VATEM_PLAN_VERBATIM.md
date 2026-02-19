# ORPC + Inngest Spec Expansion Pass — Fresh Agent Team (Expansion → Contraction/Integration)

## Summary
Run a fresh, multi-agent expansion pass to cover remaining specification concerns, then immediately contract and integrate into the canonical packet, without touching implementation docs/runbooks yet.

This plan is decision-complete and optimized for:
1. **Fresh team reset** (no agent reuse).
2. **High-signal expansion** across legacy metadata, testing/docs/lifecycle requirements, and core infra packaging/composition guarantees.
3. **Immediate contraction/integration** into cohesive canonical spec language.
4. **No policy drift**, with explicit decision locks and explicit future doc/runbook/testing update specs captured in the packet.

Decisions now locked from your input:
- **Output form:** two-step staging, then integration.
- **Decision posture:** add new locked decision IDs now (not narrative-only).
- **Cross-doc scope:** do **not** update process/runbook/testing docs yet; capture exact future updates inside spec packet.

Skills used: information-design

---

## 0) Team Reset + Orchestrator Boot (first actions)

### 0.1 Close existing agent threads
- Close **all** currently open agents.
- Do not reuse any prior thread context.

### 0.2 Create orchestration workspace (inside active canonical project)
Create:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/`

Create orchestrator artifacts:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/ORCHESTRATOR_VATEM_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/ORCHESTRATOR_VATEM_SCRATCHPAD.md`

### 0.3 VATEM definition (explicit in orchestrator plan)
Use this operating loop:
- **V**alidate constraints
- **A**nchor context
- **T**ask partition
- **E**xecute by ownership
- **M**erge with no-drift gates

---

## 1) Agent Team Design (fresh agents only)

## Agent A — Legacy Metadata Target-State Spec Owner
Mission:
- Specify target-state architecture **without legacy metadata runtime semantics**.
- Define future-state plugin lifecycle and composition behavior after deprecation.
- Include explicit “required downstream updates” for testing/runbooks/docs as spec requirements (not implementation plan).

Primary outputs:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_A_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_A_SCRATCHPAD.md`
- Proposed canonical deltas in owned docs (see ownership map below).

## Agent B — Testing/Docs/Lifecycle Cross-Functional Booster
Mission:
- Audit A/C outputs for testing and lifecycle adequacy.
- Beef up required documentation/runbook/testing update specs in canonical packet language.
- Ensure no hand-waving: future updates must be explicit enough to apply later.

Primary outputs:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_B_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_B_SCRATCHPAD.md`

## Agent C — Core Infrastructure Packaging + Composition Guarantees Owner
Mission:
- Specify core infrastructure layers/stubs/hooks for shared context, DB, auth-ready boundaries.
- Define composition guarantees and deterministic wiring contracts.
- Keep within current architecture locks; no premature auth/DB implementation design.

Primary outputs:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_C_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_C_SCRATCHPAD.md`

## Agent D — Information Design + Canonical Shape Steward
Mission:
- Own structural coherence of additions (hierarchy, scent, read path, authority clarity).
- Ensure additions stay in proper spec form and don’t turn into implementation plans.
- Enforce “policy vs illustration vs future-update-spec” separation.

Primary outputs:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_D_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_D_SCRATCHPAD.md`

## Agent E — Contraction/Integration Owner
Mission:
- Integrate A/B/C/D outputs into one coherent canonical packet.
- Resolve cross-agent overlaps without policy drift.
- Produce final contraction summary and contradiction log.

Primary outputs:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_E_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_E_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/CONTRACTION_INTEGRATION_REPORT.md`

---

## 2) Mandatory grounding + skills protocol (all agents)

Before any drafting/editing:
1. Introspect skills relevant to assignment.
2. Introspect and apply **information-design** explicitly.
3. Read the full canonical spec corpus:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
- all files in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/`
- all files in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/`
4. Read targeted lineage/context from archive:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_METADATA_REMOVAL.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_TESTING_SYNC.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_DECISIONS_APPENDIX.md`
5. Maintain plan verbatim + scratchpad continuously.
6. Expect compaction after grounding; keep scratchpad self-contained.

---

## 3) Ownership map (non-overlap edit boundaries)

### Agent A may edit
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
- New canonical leaf if needed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md`

### Agent B may edit
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md`
- New canonical “future updates spec” doc:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

### Agent C may edit
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/02-internal-clients.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md`
- New canonical leaf if needed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md`

### Agent D may edit
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md` (structure only, no policy mutation)
- Optional canonical navigation aid:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md`

### Agent E may edit
- Any of the above **only after** A/B/C/D complete and only for integration/conflict resolution.

---

## 4) Required prompt payloads per agent (decision-complete)

Each agent prompt must include:
1. Objective and owned files only.
2. “No policy drift” lock:
- Preserve D-005..D-012 semantics unless explicitly adding new locked decisions.
3. Mandatory grounding checklist.
4. Mandatory skills introspection checklist.
5. Required artifacts (plan verbatim + scratchpad).
6. Acceptance gates per role.
7. Compaction instruction after grounding.

### Agent C prompt must include this reference seed (near-verbatim)
Include the user-provided packaging proposal block almost verbatim as:
- “Reference seed: non-binding. Use for idea pressure-testing only. Do not treat as mandated design.”
- Preserve constraints: no full auth/db flow design yet; specify stubs/hooks and composition guarantees.

---

## 5) Expansion outputs expected (before contraction)

## A: Legacy metadata target-state spec
Must produce:
- Explicit deprecation target-state policy for metadata semantics (what remains normative vs removed from runtime semantics).
- Future-state lifecycle model for plugin authors.
- What changes vs unchanged.
- Explicit required testing/runbook/doc updates captured as spec requirements (not actual doc edits).

## B: Testing/docs/lifecycle adequacy layer
Must produce:
- Canonical checklist/matrix of required future process-doc/runbook/testing updates.
- Traceability from each new/updated decision to required downstream docs.
- No implementation commands, only required target-state documentation semantics.

## C: Core infrastructure packaging/composition guarantees
Must produce:
- Layer model and boundaries for shared context/auth/db-ready infrastructure stubs/hooks.
- Composition determinants/guarantees for plugin/package wiring.
- Import-direction and ownership guarantees aligned with existing packet locks.

## D: Information design stabilization
Must produce:
- Clarity improvements ensuring policy authority remains obvious.
- Strong information scent for new additions.
- Explicit labeling of normative policy vs reference examples vs future-update-specs.

---

## 6) Contraction/Integration sequence (Agent E + Orchestrator)

1. Build integration matrix:
- source change
- target canonical file
- policy impact
- drift risk
- merge decision

2. Resolve conflicts in this order:
- Decision register integrity
- Architecture invariants
- Axis consistency
- Example coherence
- Navigation/read-path clarity

3. Publish integrated result:
- Updated canonical packet docs.
- Contraction report:
  - what merged
  - what rejected
  - unresolved items (if any) with rationale.

4. Orchestrator final sweep:
- Verify no overlap edits escaped ownership boundaries.
- Verify future doc/runbook/testing changes are fully specified in packet (without editing process docs yet).
- Verify readiness for next implementation-planning phase.

---

## 7) New decision IDs and policy additions (locked for this pass)

Add new locked entries in `DECISIONS.md`:
- **D-013**: Legacy metadata runtime deprecation target-state lock.
- **D-014**: Core infrastructure packaging + composition guarantees lock.
- **D-015**: Required downstream docs/testing/runbook update-spec contract (spec-level obligations, implementation deferred).

Rule:
- IDs continue monotonically and are canonical in one place only.

---

## 8) Important changes/additions to public APIs/interfaces/types

No runtime API/code changes in this pass.

Documentation-policy interface additions:
1. Canonical legacy metadata target-state policy (normative).
2. Canonical infrastructure layering/composition guarantee contract (normative).
3. Canonical future documentation/runbook/testing update-spec contract (normative obligations; execution deferred).
4. Optional new axis docs (`axes/10`, `axes/11`) if needed for separation and clarity.

---

## 9) Test cases and scenarios (for this documentation pass)

1. **No-drift test**
- D-005..D-012 meaning unchanged unless explicitly extended by D-013..D-015.

2. **Authority clarity test**
- Reader can identify canonical policy source for each new concern in under 30 seconds.

3. **Legacy metadata policy completeness test**
- Clear statements for:
  - removed runtime semantics
  - retained canonical metadata
  - lifecycle impact

4. **Composition guarantee test**
- New plugin/package author can infer required wiring guarantees and boundaries without external context.

5. **Future-updates-spec test**
- Packet includes explicit required updates for process/runbook/testing docs, without editing those docs now.

6. **Integration coherence test**
- New sections are consistent across `ARCHITECTURE.md`, `DECISIONS.md`, relevant axis docs, and E2E references.

7. **Information design test**
- New additions pass skim/scent checks and clearly separate policy vs reference vs future-update-spec material.

---

## 10) Assumptions and defaults

1. Active canonical project remains:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec`

2. Archive remains reference-only:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec`

3. This pass is docs/spec only, no runtime code mutations.

4. Agents start fresh; no prior agent context is reused.

5. Process/runbook/testing docs are not edited now; required updates are captured explicitly inside canonical packet docs.

6. Orchestrator handles final contraction/integration after expansion outputs land.
