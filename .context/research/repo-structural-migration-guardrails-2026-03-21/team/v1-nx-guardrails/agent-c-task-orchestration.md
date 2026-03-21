# Agent C Scratchpad — Task Orchestration and CI

## Core finding
- The highest-value Nx contribution to this migration is orchestration consistency:
  - `targetDefaults`
  - `namedInputs`
  - `run-many`
  - `affected`
  - `nx sync:check`
  - cache control

## Important repo fit
- This repo already exposes phase-gate scripts as Nx targets on the root project.
- The missing layer is standardization, not invention.

## Recommended control model
1. Define slice verification as a first-class target surface:
   - `lint`
   - `test`
   - `build` or `typecheck` where relevant
   - `structural` or `verify:structure`
2. Use `targetDefaults` to make these targets behave consistently across the repo.
3. Use `namedInputs` so cache invalidation matches real structural dependencies.
4. Use `run-many` for planned migration cohorts.
5. Use `affected` for PR and CI enforcement.
6. Use `nx sync:check` once any structural artifact becomes graph-derived.

## Important nuances
- Executor-keyed `targetDefaults` are safer than target-name defaults when the same target name maps to different commands or executors
- Cache only deterministic targets
- Use `--skip-nx-cache` for occasional fresh proof runs on risky slices
- Set `NX_BASE` to the latest successful `main` commit for CI, not just a naive merge-base

## Practical recommendation
- Formalize the existing gate scripts behind shared Nx defaults and consistent command patterns.
- Do not create a second parallel validation system.

## Useful docs
- https://nx.dev/docs/reference/nx-json
- https://nx.dev/docs/reference/project-configuration
- https://nx.dev/docs/reference/inputs
- https://nx.dev/docs/features/run-tasks
- https://nx.dev/docs/features/ci-features/affected
- https://nx.dev/docs/features/cache-task-results
- https://nx.dev/docs/technologies/eslint/eslint-plugin/guides/dependency-checks
