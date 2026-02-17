# SESSION_019c587a — Agent Y Post-Research Integration Scratchpad

## Intent
Integrate post-research clarifications into packet docs while preserving the existing split posture and avoiding architectural churn.

## Change Rationale
1. Research confirmed the packet direction (split API/workflow/runtime) and exposed precision gaps, not posture reversals.
2. Clarifications were added where ambiguity could cause implementation drift: context model, middleware placement, dedupe assumptions, and route split enforcement.
3. Open questions were promoted into `DECISIONS.md` instead of silently hard-locking unresolved policy levels.
4. Priority correction from user was applied as a lock: procedure I/O schema ownership is procedure-/contract-local, `domain/*` is transport-independent only, and request metadata ownership is context-layer.

## File-by-File Integration Notes

### 1) `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Added global invariants for:
  - two context envelopes,
  - middleware control-plane separation,
  - explicit dedupe caveat expectations,
  - schema/context ownership lock alignment (procedure/contract-local I/O, context-layer metadata, domain-only concepts).
- Added local lineage references to Agent X findings and E2E_04.
- Expanded upstream anchors to include context/middleware/dedupe lifecycle sources.
- Added `E2E_04` to tutorial navigation.

### 2) `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- Added `E2E_04` to walkthrough index.
- Strengthened cross-cutting defaults with:
  - split path wording (`/api/workflows/*` vs `/api/inngest`),
  - two-envelope context model,
  - middleware control-plane split,
  - dedupe caveat guidance,
  - explicit schema/context ownership lock language.
- Added direct navigation pointer to `E2E_04` for real-world context+middleware behavior.

### 3) `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- Clarified canonical policy for two distinct envelopes:
  - oRPC boundary request context,
  - Inngest runtime function context.
- Added explicit "no universal context object" statement.
- Added route-split enforcement as context model boundary guardrail.
- Added explicit context-layer ownership for principal/request/correlation/network metadata types.
- Added envelope contract table and runtime-focused snippet.
- Added upstream anchors (`orpc context/middleware`, `inngest serve/create/middleware DI`) and E2E_04 link.

### 4) `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- Strengthened control-plane separation language.
- Added dedupe contract section clarifying:
  - explicit context-cached dedupe pattern,
  - built-in dedupe constraint boundaries.
- Added dedupe snippet and placement-matrix row.
- Added source anchors for oRPC dedupe and Inngest middleware lifecycle/serve.

### 5) `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- Strengthened split path policy with host-mount enforcement language.
- Added explicit caller prohibition on direct `/api/inngest` usage.
- Reworked trigger schema examples so procedure I/O is contract-local (not domain-owned).
- Added explicit request metadata ownership in `context.ts` snippet.
- Added host split-path snippet and status-path note in interaction sequence.
- Added source anchors (`inngest serve/events/quick-start`) and E2E_04 link.

### 6) `orpc-ingest-spec-packet/DECISIONS.md`
- Refreshed status text to include post-research findings.
- Added E2E_04 as impacted doc under D-005.
- Added locked decision `D-011` for schema/context ownership correction.
- Added open decisions:
  - `D-008` Extended traces middleware initialization-order standard.
  - `D-009` Required dedupe-marker policy level for heavy oRPC middleware.
  - `D-010` Finished-hook side-effect guardrail policy level.
- Included source anchors for each new open decision.

## Non-Changes (Intentional)
1. No change to locked split architecture posture.
2. No runtime source-code edits.
3. No edits outside the owned file set.
4. No commit in this phase.

## Completion Checklist
- [x] Required research docs reviewed first.
- [x] `E2E_04` inserted into packet/posture navigation.
- [x] Axis 04 updated for two-envelope context policy.
- [x] Axis 06 updated for control-plane split + dedupe caveats.
- [x] Axis 08 updated for split-path enforcement.
- [x] Priority correction applied for procedure I/O schema ownership and context metadata ownership.
- [x] `DECISIONS.md` updated with research open questions.
- [x] Agent Y plan + scratchpad created.
