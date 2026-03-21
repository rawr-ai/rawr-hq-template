# Agent D Scratchpad — Repo-Local Mapping

## Current repo posture
- Nx version: `22.5.4`
- `nx.json` is minimal:
  - `namedInputs`: `default`, `production`
  - no `targetDefaults`
- Boundary lint exists in `eslint.config.mjs`, but only enforces coarse `type:*` rules
- Current rule shape:
  - `type:app` may depend on anything
  - `type:service` may not depend on `type:app` or `type:plugin`
  - `type:package` may not depend on `type:service`
  - `type:plugin` may not depend on `type:plugin`

## Why the current setup is not enough
- It is a layer fence, not a slice fence
- It cannot verify the target architecture defined in Proposal V3 because there is no slice identity encoded in tags
- Current future-service candidates are still tagged as packages, so the graph cannot yet express the intended future state

## Existing strengths outside Nx
- root phase gate scripts
- manifest smoke checks
- host composition guards
- route boundary matrix tests
- telemetry and evidence-integrity checks

## Structural blind spots to preserve in the proposal
- `apps/server/src/rawr.ts` is ignored by ESLint and must stay covered by targeted structural checks
- `lint:boundaries` currently succeeds with warnings and is not a hard-fail cleanliness gate

## Highest-value repo-specific upgrades
1. Add multi-axis tags before large moves
2. Tighten `@nx/enforce-module-boundaries` around future architecture, not just current folders
3. Retag each slice as it moves
4. Promote existing gate scripts into first-class Nx structural targets
5. Add `targetDefaults` and richer `namedInputs`
6. Use `run-many` for slice checkpoints and `affected` for CI

## Bottom line
- Today the repo's custom structural gates are stronger than Nx.
- Nx should become the graph-aware coordination layer around them.
