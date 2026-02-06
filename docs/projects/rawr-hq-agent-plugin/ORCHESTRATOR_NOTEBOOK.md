# ORCHESTRATOR_NOTEBOOK

## Objective

Create canonical `rawr-hq` agent plugin artifacts that onboard and guide end-to-end HQ plugin creation, using template repo as authoritative source.

## Axes covered

1. HQ orientation and philosophy.
2. PM/discovery flow for plugin creation.
3. Implementation and package-structure contracts.
4. Publishing/wiring/distribution matrix.
5. Operational usage and day-2 practices.

## Core findings

- Repo routing is non-negotiable and documented in `AGENTS_SPLIT.md`.
- Channel split is non-negotiable:
  - Channel A: `rawr plugins ...`
  - Channel B: `rawr hq plugins ...`
- Channel B enablement is explicit activation boundary with persisted state.
- Path E migration runbook already defines script-to-plugin conversion shape.

## Integration decisions

- One orientation skill.
- One plugin-creation skill supporting both channels and both origins.
- Progressive-disclosure design with references and one reusable asset template.

## Open risks tracked

- Drift between template and downstream personal usage docs.
- Future sync automation plugin design still pending.
