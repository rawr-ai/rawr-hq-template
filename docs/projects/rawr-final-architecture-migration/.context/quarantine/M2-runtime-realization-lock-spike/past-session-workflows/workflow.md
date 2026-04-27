# Runtime Realization Spec Lock Spike

## Summary
Run a research-only spike in a new Graphite-tracked worktree to decide whether Alt-X-1, Alt-X-2, or a synthesized spec should supersede the current runtime subsystem spec, and whether M2 remains the same sequence with updated details or should be reshaped into cleaner dominos.

Current grounding:
- Latest Graphite stack tip is `codex/spike-oclif-cli-composition-20260420` at `7a6fb812`.
- Primary checkout is dirty with relevant existing spec/migration edits; treat that as current working state, not disposable noise.
- Narsil is now usable against `rawr-hq-template#5c717202`; Nx project discovery is working.
- Do not steal the checked-out branch. Create a child spike branch/worktree so primary can remain the Narsil/indexing source.

## Team and Workflow
Create branch/worktree after acceptance:
- Branch: `agent-ORCH-M2-runtime-realization-lock-spike`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-M2-runtime-realization-lock-spike`
- Parent: `codex/spike-oclif-cli-composition-20260420`
- Track with Graphite parent after creation.

Create spike docs:
- `docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/workflow.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/target-authority-reframe/forward-evaluation.md`
- Temporary scratch: `.../scratch/agent-*.scratch.md`
- Temporary reports: `.../reports/agent-*.report.md`

Spawn default agents, not explorers, for intellectual analysis:
- `Alt-X-1 evaluator`: read Alt-X-1 in full; classify stable, unstable, contingent components.
- `Alt-X-2 evaluator`: read Alt-X-2 in full using the same rubric.
- `M2/repo reality evaluator`: compare migration plan, M2 milestone/issues, current `apps/hq` runtime path, `hq-sdk`, `bootgraph`, `runtime-context`, and Phase 2 verifiers.
- `terminology/DX evaluator`: compare both specs for semantic clarity, operational engineering vocabulary, invented terms, and authoring ergonomics.
- Orchestrator: maintain workflow doc, integrate reports, resolve contradictions, and produce the final forward evaluation.

Each agent must keep a scratch doc while working, then produce a report doc with evidence pointers. After synthesis, delete scratch docs and delete non-standalone reports; keep only reports that remain useful as separate artifacts.

## Evaluation Criteria
Classify every major runtime component into four bands:
- `stable`: aligned across Alt-X-1/Alt-X-2, compatible with M2/current repo, and decoupled from future service/plugin internals.
- `minor discrepancy`: wording, naming, or sequencing difference that does not change architecture.
- `unstable`: load-bearing conflict around topology, ownership, lifetimes, public API, Effect boundary, service/plugin/app boundaries, or proof strategy.
- `contingent`: important but safely deferrable until earlier locks land.

Compare these component families:
- SDK authoring APIs: `defineApp`, `startAppRole`, `bindService`, service/plugin builders, resource/provider/profile helpers.
- Runtime realization: compiler, bootgraph, Effect provisioning kernel, process runtime, runtime access, harness adapters.
- Boundary laws: services own truth, plugins project, apps select, resources provision substrate, frameworks execute inside their boundaries.
- Active lanes: server API, server internal, async workflow/schedule/consumer, CLI/web/agent/desktop deferral.
- Migration dominos: whether M2-U00 through M2-U06 still hold, need renaming, or should be resequenced.

## Deliverables
The integration doc should answer as one cohesive forward evaluation:
- Can we start laying runtime-system dominos immediately?
- Which components are hardened enough to implement now?
- Which decisions must be locked before implementation?
- Which concerns are important but non-blocking for M2-U00/M2-U01?
- Whether Alt-X-1, Alt-X-2, or a synthesized spec should become the new runtime realization authority.
- What exact docs should be updated next: migration plan, M2 milestone/issues, guardrails, and current runtime spec references.

No production code changes are part of this spike. Public API/type changes are evaluated and documented only; implementation waits until the runtime spec lock is accepted.

## Verification
Run/read-only grounding:
- `gt ls`, `git status --short --branch`, `git worktree list --porcelain`
- `bunx nx show projects`
- targeted `bunx nx show project <name> --json`
- Narsil searches/excerpts for runtime seams and current code reality
- `bun scripts/phase-2/verify-*.mjs --allow-findings` to capture current red/diagnostic state

Before final handoff:
- `git diff --check`
- `bun run sync:check` if docs/inventory paths changed
- `git status --short --branch`
- commit retained docs on the spike branch so the worktree is clean; do not submit a PR unless explicitly requested.

## Assumptions
- The dirty primary checkout contains relevant current working state and must be incorporated into the spike baseline without overwriting it.
- Primary remains the Narsil-indexed checkout. If branch ownership must later move into the spike worktree, first preserve current dirty edits, then detach primary at the exact latest stack-tip commit.
- The current untracked `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` is treated as an intermediate/current repo artifact to compare, not automatically as the locked authority.
- Skills used: `team-design`, `spike-methodology`, `graphite`, `git-worktrees`, `narsil-mcp`.
