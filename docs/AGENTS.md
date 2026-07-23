# Docs Navigation For Agents

## Scope

Applies to `docs/**`.

## Boundaries

- Canonical and evergreen guidance belongs in the gateway, product, system,
  and process surfaces defined by `docs/DOCS.md`.
- Time-bound initiative records belong under `docs/projects/**`.
- Archived and quarantined material is provenance only; it cannot override
  active product, system, or process guidance.
- Documentation records system authority but does not create executable
  ownership by itself.

## Canonical Entry Points

- `docs/DOCS.md`
- `docs/PRODUCT.md`
- `docs/PROCESS.md`
- `docs/ROADMAP.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/`

## Core Supporting Docs

- `docs/system/SECURITY_MODEL.md`
- `docs/process/NX_AGENT_WORKFLOW.md`
- `docs/process/GRAPHITE.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/MAINTENANCE_CADENCE.md`
- `docs/process/HQ_USAGE.md`
- `docs/process/HQ_OPERATIONS.md`

## Naming Invariant

Use these names consistently:
- Template repo: `RAWR HQ-Template`
- Personal repo: `RAWR HQ`

## Directory Map

- `docs/product/`: product semantics and value framing.
- `docs/system/`: architecture and technical contracts.
- `docs/process/`: operating workflows and playbooks.
- `docs/projects/`: time-bound initiatives.
- `docs/plans/`: retained planning workstream docs (prefer `docs/projects/` for new execution plans).
- `docs/spikes/`: retained spike investigations (promote stable guidance to `docs/system/` or `docs/process/`).
- `docs/_archive/`: historical docs not part of active guidance.
- `quarantine/` directories: preserved docs removed from active authority; do not use as current guidance.
- `quarantine/AGENTS.md`: transient quarantine ledgers marked with `<!-- quarantine-ledger: true -->`.

## Flow

- New guidance enters the directory that owns its lifetime and authority.
- Stable conclusions from project work are promoted into canonical product,
  system, or process documents.
- Superseded material moves to archive or quarantine without remaining on an
  active routing path.

## Routing

- [Repository router](../AGENTS.md) for repo-wide boundaries and execution
  routes.
- [Documentation architecture](DOCS.md) for canonical placement and naming.
- [Process gateway](PROCESS.md) for operating workflows.
- [Product gateway](PRODUCT.md) for product semantics and value framing.

## Conventions

- Nx is the first hop for workspace/project navigation; this docs tree should reinforce that rather than duplicate Nx skill content.
- Keep canonical truth in gateway docs and linked system/process docs.
- Do not route active guidance through archived documents.
- Do not route active guidance through quarantined documents; route through quarantine ledgers when mining is required.
- Treat parked concepts as doc-only until explicitly un-parked.

## Validation

- Confirm every added or changed relative link resolves from its containing
  document.
- Verify active gateway and router paths do not traverse archived or
  quarantined guidance.
- Run the owning code project's Nx checks when documentation changes an
  executable contract.
