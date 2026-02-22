# Agent D Plan (Verbatim)

## Role and ownership
- Role: Agent D (Information Design + Canonical Shape Steward).
- Canonical edit boundary:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md` (structure/clarity only; no policy meaning changes)
  - Optional create: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md`

## Guardrails
- Information-design stabilization only; no policy redesign.
- Preserve D-005..D-015 semantics exactly as currently expressed.
- Keep separation explicit:
  - normative policy,
  - reference examples,
  - implementation-adjacent update specs.
- Ignore unrelated edits and do not revert collaborator changes.

## Mandatory setup checklist
1. Skill intake logged in scratchpad:
   - `information-design` (mandatory)
   - `docs-architecture`
   - `architecture`
   - `deep-search`
2. Full packet read completed:
   - `README.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`, all `axes/*.md`, all `examples/*.md`.
3. Cross-agent alignment read completed:
   - `AGENT_A_SCRATCHPAD.md`, `AGENT_B_SCRATCHPAD.md`, `AGENT_C_SCRATCHPAD.md`, `AGENT_T_SCRATCHPAD.md`.
4. Expansion-pass artifacts created before canonical edits:
   - `AGENT_D_PLAN_VERBATIM.md`
   - `AGENT_D_SCRATCHPAD.md`

## Mission outcomes
1. Improve packet read path and information scent for expansion additions.
2. Make “where to read for what” explicit for D-013, D-014, and D-015 concerns.
3. Keep architecture text coherent and scan-friendly without reducing policy detail.

## Execution plan
1. Record no-drift anchors and intent map in `AGENT_D_SCRATCHPAD.md`.
2. Restructure `README.md` first-screen routing so canonical authority and concern-based navigation are explicit.
3. Restructure `ARCHITECTURE.md` front matter/navigation sections for clearer canonical routing and discoverability of axes 10/11/12 + implementation-adjacent spec.
4. Optionally create `CANONICAL_EXPANSION_NAV.md` if needed for packet-level discoverability.
5. Validate no-drift by checking that policy wording remains unchanged in meaning, and that canonical source-of-truth docs are obvious in first-screen views.
