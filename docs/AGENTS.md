# Docs Navigation For Agents

## Purpose

- Keep product, system, process, and project knowledge discoverable at the
  authority and lifetime boundary that owns it.

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

## Behavior

- Documentation enters an active authority surface, stable conclusions are
  promoted out of temporal work, and superseded material leaves active
  navigation without losing provenance.

## Concepts

- **Canonical guidance** is current reusable authority; a **project record** is
  time-bound execution context; **archive** and **quarantine** retain history
  without participating in current decisions.

## Canonical Entry Points

- `docs/DOCS.md`
- `docs/PRODUCT.md`
- `docs/PROCESS.md`
- `docs/ROADMAP.md`
- `docs/system/HABITAT_ARCHITECTURE.md`
- `docs/system/HABITAT_RUNTIME_REALIZATION.md`

## Core Supporting Docs

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
- Platform: `Habitat`; the current remote/directory may retain the legacy
  `RAWR HQ-Template` locator until repository rename.
- First downstream product: `Rawr`.
- Curated agent-plugin repository: `Marketplace`; the current remote/directory
  may retain the legacy `RAWR HQ` locator until repository rename.

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

## Interfaces

- Gateway documents hand readers to product, system, process, and project
  owners through resolving relative links. Executable claims hand validation
  back to the owning Nx project and its tests.

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
