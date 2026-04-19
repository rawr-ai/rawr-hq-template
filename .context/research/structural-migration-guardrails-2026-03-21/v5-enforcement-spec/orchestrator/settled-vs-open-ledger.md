# Settled vs Open Ledger

## Settled

- The architectural ontology is fixed:
  - `packages` = support matter
  - `services` = semantic capability truth
  - `plugins` = runtime projection
  - `apps` = app identity, manifest, and entrypoints
- The stable shell is fixed:
  - `app -> manifest -> role -> surface`
- Runtime realization is fixed:
  - `entrypoint -> bootgraph -> process`
- Semantic dependency direction is fixed:
  - `packages -> services -> plugins -> apps`
- `hq` is one app identity.
- `server`, `async`, `web`, `cli`, and `agent` are roles, not peer apps.
- The canonical plugin tree is fixed:
  - `plugins/<role>/<surface>/<capability>`
- Allowed role/surface pairs are fixed:
  - `server -> api|internal`
  - `async -> workflows|consumers|schedules`
  - `web -> app`
  - `cli -> commands`
  - `agent -> tools`
- Manifest authority is upstream of entrypoints and bootgraph.
- Bootgraph is a narrow downstream seam and not a second manifest or policy plane.
- V5 service promotions and recompositions are classification decisions, not open debates.
- `apps/server/src/rawr.ts` cannot remain outside the first-line policy fence.

## Open

- Exact tag spellings beyond the required dimensions:
  - `type:*`
  - `capability:*`
  - `app:*`
  - `role:*`
  - `surface:*`
  - `migration-slice:*`
- Exact `depConstraints` syntax and final policy factoring in ESLint.
- Exact generator or project-graph plugin implementation for graph-derived shell validation.
- Exact public API and internal structure of `packages/bootgraph`.
- Exact landing package for extracted Inngest auth support matter.
- The threshold for when runtime-specific multi-service composition must become a composed service.
