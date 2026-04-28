# Target-Authority Runtime Realization Reframe Plan

## Summary
Run a docs-only refinement pass on the committed spike branch to correct the prior conservative bias: treat Alt-X-1/Alt-X-2 as target architecture inputs, treat current repo reality as migration substrate, and produce a new sibling evaluation doc that locks the forward posture around target topology, terminology, component maps, and explicit transition/off-ramp rules.

The execution branch remains `agent-ORCH-M2-runtime-realization-lock-spike` unless it is occupied or dirty at execution time; if a new branch is needed, create a child Graphite branch named `agent-ORCH-M2-runtime-realization-target-reframe`.

## Team Structure
Use default agents, not explorers, with the same skills and grounding posture as before: `team-design`, `spike-methodology`, `graphite`, `git-worktrees`, `narsil-mcp`, Nx, and Narsil.

- Orchestrator: owns the final synthesis, plan doc, cleanup, verification, and commit.
- Target-authority evaluator: re-reads Alt-X-1/Alt-X-2 and identifies where target architecture intentionally supersedes repo reality.
- Migration-domino evaluator: revises M2 sequencing under the “bounded container” frame, with no silent “later” bucket.
- Terminology/DX evaluator: sharpens semantic vs operational terms by layer; no split-the-difference names unless layers genuinely differ.
- Component-map architect: produces the modular runtime realization map, including designed components, delegated/native components, negative-space components, known unknowns, and cross-cutting diagrams.

Each agent writes scratch while working, then a report. Scratch is deleted after integration. Keep reports only if they remain useful provenance.

## Key Changes
Execution should create a new sibling doc under the existing spike context directory, tentatively:

`docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integration-runtime-realization-target-authority-reframe.md`

Before any agent work, write the accepted plan verbatim to a sibling workflow doc for this pass.

The new integration doc should revise the prior conclusions as follows:

- Current repo reality is not architectural authority except where it matches target semantics and boundary laws preserved by the specs.
- The runtime package/topology decision is no longer “current M2 vs spec.” The target direction is a segmented platform package zone, likely `packages/core/runtime` and `packages/core/sdk`, plus top-level developer-authored `resources/`.
- `packages/runtime/*`, `@rawr/hq-sdk`, and legacy runtime-context shapes are transition facts, not target defaults.
- Any shim, compatibility layer, or temporary wrapper must have an explicit milestone-scoped expiration and cleanup point.
- `startApp`, `startAppRole`, `useService`, `bindService`, `RuntimeAccess`, `RuntimeCatalog`, resources, providers, profiles, caches, telemetry, and service dependencies must be evaluated by layer, not averaged into compromise names.
- Runtime deep details such as caching, telemetry, config, diagnostics, scope/lifetime ownership, error boundaries, and provider selection must be either designed now or recorded as named deferred components with integration hooks and a specific later milestone threshold.

The component map should include at minimum:

- Whole-system diagram: authoring roots, SDK, compiler, bootgraph, Effect kernel, process runtime, harnesses, apps, services, plugins, resources, providers, profiles, diagnostics.
- Layer diagrams: public authoring, lowering/adapters, runtime internals, native frameworks, observability/control-plane.
- Cross-cutting maps: caching, telemetry, config/secrets, diagnostics/catalog, service binding, resource lifecycle, async durability.
- Negative-space ledger: components not yet designed but clearly load-bearing, with owner, reason, integration point, and latest acceptable lock point.

## Execution Steps
1. Inspect current branch/worktree/Graphite status and confirm the spike branch is clean.
2. Persist this plan verbatim in the spike context before spawning agents.
3. Spawn the five default agents with explicit frame statements, objective, inputs, and output contracts.
4. Orchestrator reads all reports, resolves contradictions, and writes the new sibling integration doc.
5. Delete scratch files; keep only useful standalone reports and the new integration doc.
6. Run verification, then commit retained docs on the Graphite branch. Do not submit a PR.

## Verification
Run:

- `gt ls`
- `git status --short --branch`
- `git worktree list --porcelain`
- `bunx nx show projects`
- targeted `bunx nx show project ... --json` where needed
- Narsil searches for runtime seams and current source reality
- `git diff --check`
- `bun run sync:check` if docs/inventory paths changed
- final `git status --short --branch`

No production code changes are part of this pass.

## Assumptions
- The prior spike commit `c2050811` is the starting point.
- The output is a new sibling doc, not an overwrite of the previous forward evaluation.
- Top-level `resources/` is settled as target-authoring topology.
- Platform-owned packages stay under `packages/`, likely segmented under `packages/core/*`.
- The plan will be executed after leaving Plan Mode; no repo-tracked files are mutated during this planning turn.

Skills used: team-design
