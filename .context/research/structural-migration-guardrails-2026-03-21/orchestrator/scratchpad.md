# Orchestrator Scratchpad — Structural Migration Guardrails

**Date**: 2026-03-21  
**Objective**: Determine how to make a large structural refactor slice-by-slice verifiable, with Nx used where it adds real leverage instead of duplicating the repo's existing architectural gates.

## Working thesis
- Tests and lint rules are necessary but not sufficient.
- Nx should provide graph-aware selection, tag-backed boundary policy, repeatable target orchestration, and optionally graph-derived structural checks.
- The repo's existing custom gates remain the oracle for composition, route, manifest, and runtime invariants that import-based linting cannot see.

## Team
- Agent A: Boundary and ESLint lane
- Agent B: Graph, sync, plugin, and conformance lane
- Agent C: Task orchestration, caching, and CI lane
- Agent D: Repo-local Nx posture and gap analysis

## Repo facts that matter
- Current branch: `context-directory-reorg`
- Trunk: `main`
- Current Nx posture is shallow:
  - Only coarse `type:*` tags
  - `@nx/enforce-module-boundaries` present in `eslint.config.mjs`
  - `nx.json` has minimal `namedInputs` and no `targetDefaults`
- Current structural protection is stronger outside Nx:
  - root gate scripts and tests
  - manifest smoke checks
  - host composition guard
  - route boundary matrix
  - telemetry / evidence integrity gates
- `apps/server/src/rawr.ts` is ignored by ESLint and therefore remains a structural blind spot unless covered elsewhere

## Decision anchors
1. Recommend an OSS-first baseline
2. Separate optional Enterprise enhancements cleanly
3. Apply thin controls up front, not a full repo-wide policy explosion
4. Make each slice verifiable before proceeding
5. Treat bootgraph verification as an extension-point problem, not a built-in Nx feature claim

## Research conclusions to preserve
- `@nx/enforce-module-boundaries` is the primary JS/TS import-boundary mechanism
- Multi-dimensional tags plus `allSourceTags` are the key to slice-aware policy
- `notDependOnLibsWithTags` is valuable because it checks the dependency tree, not just the direct import
- `@nx/dependency-checks` adds package dependency integrity and should be part of the control model where build targets exist
- `targetDefaults`, `namedInputs`, `run-many`, `affected`, and `nx sync:check` are the core orchestration layer
- Project-graph plugins + sync generators are the official OSS route for manifest-derived or bootgraph-derived structural checks
- `@nx/conformance` and `@nx/owners` are strong but optional Enterprise additions

## Deliverable shape
- One proposal doc with:
  - recommendation
  - current-state audit
  - control stack
  - up-front vs after decision
  - slice workflow
  - concrete config examples
  - repo-specific first moves
  - OSS vs Enterprise split
  - sources
