<proposed_plan>
# Nx-Backed Structural Migration Guardrails Proposal

**Summary**
- Create `.context/research/structural-migration-guardrails-2026-03-21/` with `orchestrator/`, `team/v1-nx-guardrails/`, and `proposals/`, matching the repo’s existing research layout.
- Write scratchpads for the orchestrator and four research lanes: boundaries/ESLint, graph/extensibility, task orchestration, and repo-local mapping.
- Produce `proposals/STRUCTURAL-MIGRATION-GUARDRAILS-PROPOSAL.md` as the deliverable.
- Proposal thesis: apply a thin Nx control layer up front, then ratchet it slice-by-slice. Keep tests and existing structural gates as the behavioral oracle; use Nx for graph truth, selection, and repeatable enforcement.
- Use only official `nx.dev` docs plus repo-local inspection as sources.

**Key Changes / Interfaces**
- Introduce multi-axis Nx tags in the proposal, not just `type:*`: `scope:*` for architectural slice, `runtime:*` or `surface:*` for projection/host role, optional `migration-slice:*` for rollout cohorts, and retain `type:*`.
- Upgrade [eslint.config.mjs](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/eslint.config.mjs) conceptually to use `@nx/enforce-module-boundaries` as the first enforcement layer with `sourceTag`, `allSourceTags`, `onlyDependOnLibsWithTags`, and `notDependOnLibsWithTags`; tighten `type:app` from `*` to explicit allowances.
- Standardize structural verification as first-class Nx targets, e.g. `structural` or `verify:structure`, wrapping existing repo gates instead of replacing them; centralize behavior with `targetDefaults` and `namedInputs` in [nx.json](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/nx.json).
- Recommend `nx run-many` for planned slice checkpoints and `nx affected` for PR/CI enforcement; add `nx sync:check` when structural artifacts become graph-derived.
- Document an optional advanced lane: custom project-graph plugin for manifest/bootgraph edges, then optional `@nx/conformance` and `@nx/owners` if Enterprise is in bounds.
- Call out blind spots that need explicit coverage if they stay outside lint boundaries, especially [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts).

**Proposal Document Content**
- Executive recommendation with a clear OSS-first answer and a separate optional Enterprise appendix.
- Current-state audit of this repo: coarse `type:*` tags, empty `targetDefaults`, current boundary rule, existing phase gates, and why those gates remain necessary.
- Recommended control stack by layer: boundary lint, dependency checks, custom structural tests/scripts, Nx orchestration/caching, optional graph extensibility/conformance.
- Up-front vs after analysis: recommend up-front minimal controls before the first slice, then tighten per-slice immediately after each retag and move.
- Slice workflow: tag the slice, encode the boundary rule, expose or wrap slice gate targets, run `nx run-many` on the cohort, then enforce via `nx affected` in CI before moving on.
- Concrete examples: sample tag taxonomy, sample `depConstraints`, sample `targetDefaults` and `namedInputs`, sample `run-many` / `affected` / `sync:check` commands, and sample project-graph / sync-generator use for manifest-derived checks.
- Decision log: OSS baseline vs Enterprise enhancements, and an explicit note that “bootgraph verification” is not a named built-in Nx feature but is achievable through documented extension points.

**Test Plan**
- Verify direct boundary violations fail lint for a newly tagged slice.
- Verify indirect forbidden dependencies are caught via `notDependOnLibsWithTags`.
- Verify `run-many` can execute a declared slice cohort and `affected` limits PR validation to the blast radius.
- Verify `targetDefaults` and `namedInputs` rerun structural gates when relevant config or manifest inputs change, and do not rerun on irrelevant churn.
- Verify `nx sync:check` fails when a generated structural artifact is stale.
- Verify existing custom gates still cover composition and runtime concerns that Nx boundary rules cannot see.

**Assumptions**
- Default recommendation is OSS-first: `@nx/enforce-module-boundaries`, tags, `targetDefaults`, `namedInputs`, `run-many`, `affected`, and sync generators. `@nx/conformance` and `@nx/owners` are documented as optional Enterprise upgrades, not required for the baseline answer.
- The proposal will not recommend replacing the repo’s existing phase gates with pure Nx features; Nx will orchestrate and narrow them.
- No repo mutations happen until you say `implement`; once you do, I will create the scratchpads and proposal in the directory structure above using this plan as the implementation blueprint.
</proposed_plan>
