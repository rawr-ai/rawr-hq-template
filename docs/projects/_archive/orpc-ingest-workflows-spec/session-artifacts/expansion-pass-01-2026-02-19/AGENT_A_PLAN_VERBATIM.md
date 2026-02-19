# Agent A Plan (Verbatim)

## Role and ownership
- Role: Agent A (Legacy Metadata Target-State Spec Owner).
- Canonical edit boundary:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
  - Optional create: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md`

## Guardrails
- Preserve D-005..D-012 semantics unless explicitly extending with a new lock.
- Treat this as target-state architecture policy, not implementation planning.
- Do not edit process/runbook/testing docs outside this spec packet.
- Ignore unrelated edits from collaborators; do not revert anything outside this scope.

## Mandatory setup checklist
1. Skill intake noted in scratchpad (information-design mandatory + architecture/docs-architecture/decision-logging/deep-search/orpc/inngest).
2. Full canonical packet corpus read:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - all `axes/*.md`
   - all `examples/*.md`
3. Archive additive-extraction context read:
   - `LEGACY_METADATA_REMOVAL.md`
   - `LEGACY_TESTING_SYNC.md`
   - `LEGACY_DECISIONS_APPENDIX.md`
4. Create expansion-pass artifacts before canonical conclusions:
   - `AGENT_A_PLAN_VERBATIM.md`
   - `AGENT_A_SCRATCHPAD.md`

## Mission outcomes to deliver
1. Specify target-state legacy metadata policy:
   - removed runtime semantics,
   - retained canonical metadata,
   - lifecycle/test/process impact.
2. Add and lock `D-013` in `DECISIONS.md`.
3. Encode downstream docs/runbook/testing updates as policy obligations inside this packet (without editing those external docs).
4. Keep change language explicit about what changes vs what remains unchanged.

## Edit execution plan
1. Draft grounded findings in `AGENT_A_SCRATCHPAD.md` from packet + archive evidence.
2. Update `DECISIONS.md` with new locked `D-013` (no mutation of D-005..D-012 intent).
3. Update `ARCHITECTURE.md` with D-013 target-state lock language, retained metadata model, and downstream obligation section.
4. Create optional axis doc `axes/10-legacy-metadata-and-lifecycle-simplification.md` to hold focused policy and obligations.
5. Verify diff scope and provide concise completion summary with exact files and rationale.
