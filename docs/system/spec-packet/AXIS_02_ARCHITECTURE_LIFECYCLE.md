# Axis 02: Architecture and Lifecycle

## Why this axis matters
Architecture succeeds or fails in lifecycle behavior, not in diagrams. This axis defines where ownership lives, what changes require composition edits, and how the model avoids drift as the repo grows.

## Core Architecture Position
1. `packages/*` are shared capability sources.
2. `plugins/*` are runtime adapters by surface.
3. `rawr.hq.ts` is the only cross-surface composition authority.
4. `apps/*` are host fixtures.

## Risks, Rationale, and Implications

### R1: Manifest drift risk
Risk:
- teams continue composing inside host fixtures.

Rationale for control:
- dual composition destroys predictability and reviewability.

Implication if unmanaged:
- AI agents and humans must discover wiring across multiple locations.

Control:
- docs + policy + CI enforce manifest-only cross-surface composition.

### R2: Undefined lifecycle for new surfaces (`api`, `workflows`, `mcp`)
Risk:
- surfaces exist structurally but lack operator workflow contracts.

Rationale for control:
- lifecycle parity is required for production adoption.

Implication if unmanaged:
- uneven quality gates and inconsistent enable/disable behavior.

Control:
- include these surfaces in plugin e2e runbook and manifest runbook.

### R3: Ownership ambiguity (template vs personal)
Risk:
- operational runtime plugins land upstream by accident.

Rationale for control:
- template repo should remain baseline and reusable.

Implication if unmanaged:
- upstream noise and brittle downstream syncs.

Control:
- explicit ownership rules in `AGENTS_SPLIT.md` and process docs.

### R4: Soft boundaries without tooling
Risk:
- architectural rules rely only on prose.

Rationale for control:
- boundaries must be machine-checked.

Implication if unmanaged:
- silent coupling and future refactor pain.

Control:
- import-boundary lint + metadata validation + manifest smoke checks.

## Lifecycle Contract (Decision Complete)
1. Author capability contracts and shared logic in package layer.
2. Author runtime adapters in one or more surface plugin roots.
3. Register adapters in `rawr.hq.ts`.
4. Mount via host fixtures.
5. Run policy and runtime checks before release.

## Required Documentation/Runbook Impacts
1. `docs/SYSTEM.md`: manifest-first architecture map.
2. `docs/system/PLUGINS.md`: new roots + metadata + boundary semantics.
3. `docs/process/PLUGIN_E2E_WORKFLOW.md`: package->plugin->manifest flow.
4. `docs/process/runbooks/RAWR_HQ_MANIFEST_COMPOSITION.md`: exact composition mechanics.
5. `docs/process/HQ_OPERATIONS.md`: new surface ownership/ops semantics.
6. `AGENTS_SPLIT.md`: ownership rules for new roots.

## Remaining Tensions and Resolution Policy
1. Discovery model (manual vs auto): manual first, revisit after stabilization.
2. Runtime refresh model (restart vs hot): startup composition first, hot optional later.
3. Helper abstractions: only after repeated pattern evidence.

All unresolved items are tracked in `docs/system/spec-packet/DECISIONS.md`.
