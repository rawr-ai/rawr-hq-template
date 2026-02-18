# Agent C Plan (Verbatim)

## Role and ownership
- Role: Agent C (Core Infrastructure Packaging + Composition Guarantees Owner).
- Canonical edit boundary:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/02-internal-clients.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md`
  - Optional create: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md`

## Guardrails
- Preserve D-005..D-012 semantics; extend only with lock-ready language mapped to D-014.
- No full auth/db implementation design; stubs/hooks/layers/guarantees only.
- No process/runbook/testing doc edits outside packet.
- Ignore unrelated concurrent edits; do not revert collaborator changes.

## Mandatory setup checklist
1. Skill intake (information-design mandatory): `information-design`, `architecture`, `docs-architecture`, `decision-logging`, `deep-search`, `orpc`, `inngest`, `typescript`.
2. Full canonical packet corpus read:
   - `README.md`, `ARCHITECTURE.md`, `DECISIONS.md`
   - all `axes/*.md`
   - all `examples/*.md`
3. Required archive context read:
   - `LEGACY_METADATA_REMOVAL.md`
   - `LEGACY_TESTING_SYNC.md`
4. Expansion artifacts created before canonical edits:
   - `AGENT_C_PLAN_VERBATIM.md`
   - `AGENT_C_SCRATCHPAD.md`

## Mission outcomes to deliver
1. Define a deterministic layer model for shared core infrastructure (context/auth/db-ready primitives and composition seams).
2. Encode composition guarantees that reduce plugin author wiring burden without black-box ownership loss.
3. Clarify import direction and ownership boundaries across packages/plugins/host composition.
4. Add lock-ready language that maps to D-014 while stating what changes vs unchanged.

## Edit execution plan
1. Compact corpus findings and design choices in `AGENT_C_SCRATCHPAD.md`.
2. Update `axes/02-internal-clients.md` with package-layer infrastructure contracts and import-direction guarantees.
3. Update `axes/07-host-composition.md` with host composition determinants, bootstrap/wiring guarantees, and explicit unchanged locks.
4. Update `axes/08-workflow-api-boundaries.md` with boundary/runtime seam guarantees for shared infra hooks.
5. Create `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` as the focused canonical leaf for D-014 lock-ready language.
6. Re-check no-drift constraints against D-005..D-012 and summarize file-by-file rationale.
