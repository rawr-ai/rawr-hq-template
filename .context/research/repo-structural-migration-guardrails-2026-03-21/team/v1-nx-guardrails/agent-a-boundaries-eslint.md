# Agent A Scratchpad — Boundaries and ESLint

## Core finding
- Nx's main JS/TS boundary mechanism is `@nx/enforce-module-boundaries`.
- It is strong enough to become the first structural fence for this migration, but only after the repo adopts more than the current single-axis `type:*` tags.

## Features that matter
- `depConstraints` with `sourceTag` or `allSourceTags`
- `onlyDependOnLibsWithTags`
- `notDependOnLibsWithTags`
- `allowedExternalImports` / `bannedExternalImports`
- `allow`
- public API enforcement
- circular dependency checks
- optional `banTransitiveDependencies`
- optional `enforceBuildableLibDependency`
- optional `checkNestedExternalImports`

## Why this matters for the migration
- Multi-dimensional tags let the workspace encode both:
  - architectural slice
  - architectural role or layer
- Because Nx combines matching constraints with logical `AND`, the same project can be forced to satisfy:
  - same-slice rules
  - layer-direction rules
  - runtime/platform restrictions

## Recommended tag model
- Keep `type:*`
- Add `scope:*` for capability slice
- Add `runtime:*` or `surface:*` for host/projection role
- Add temporary rollout tags only where helpful, e.g. `migration-slice:*`

## Key caveats
- ESLint enforcement is JS/TS only
- Untagged projects are effectively unusable in a tagged boundary regime unless explicitly allowed
- Too many tag dimensions create policy sprawl; keep the model compact
- `notDependOnLibsWithTags` will surface indirect violations and may be noisy at first
- Public API enforcement may force export cleanup earlier than expected

## Practical recommendation
- Do not wait until after the move.
- Add the minimal tag taxonomy and the first slice's constraints before moving the first slice.
- Ratchet policy slice-by-slice rather than turning on the whole future architecture at once.

## Useful docs
- https://nx.dev/docs/technologies/eslint/eslint-plugin/guides/enforce-module-boundaries
- https://nx.dev/docs/features/enforce-module-boundaries
- https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions
- https://nx.dev/docs/guides/enforce-module-boundaries/ban-dependencies-with-tags
- https://nx.dev/docs/technologies/eslint/guides/flat-config
