# Runbooks Index

This index is the canonical entrypoint for active process runbooks.

Use this when you need exact commands for:
- operating the managed local HQ runtime,
- running a bounded workstream as a coordination object,
- containing migration-doc drift with path-obvious quarantine,
- draining Graphite stacks,
- validating explicit data/artifact interfaces across independent repositories.

Plugin/CLI lifecycle, telemetry proof, and ORPC/OpenAPI publication runbooks that predate or cross the final architecture migration have been moved to `docs/process/runbooks/quarantine/`.

## Quick Chooser

| Goal | Runbook |
| --- | --- |
| Run a bounded workstream as a coordination object | [[docs/process/WORKSTREAMS]] |
| Operate the managed local HQ runtime | [[docs/process/runbooks/HQ_RUNTIME_OPERATIONS]] |
| Contain migration-doc drift with quarantine-first topology | [[docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW]] |
| Drain Graphite stacks safely (publish/merge/prune loop) | [[docs/process/runbooks/STACK_DRAIN_LOOP]] |
| Validate Template/personal separation and artifact bindings | [[docs/process/CROSS_REPO_WORKFLOWS]] |
| Canonical repo-boundary + transient retry + final acceptance policy | [[docs/process/HQ_OPERATIONS]] |

## Command Surface Invariant

- External Oclif extensions: `rawr plugins ...`
- Curated agent-plugin lifecycle: `rawr agent plugins ...`
- Agent-plugin authoring ends at source and review. Build, test, export, provider
  convergence, retirement, and undo are separate explicit lifecycle operations.
- CLI development uses repository-local Nx targets and `bun run rawr -- ...`.
  Ordinary package installation becomes the operational path after the fixed Nx
  Release group lands; that release path is explicitly pending.

Do not mix command families. App, web, and runtime composition are not lifecycle
fallbacks.

## Required Repository Ratchet

- Local pre-push feedback and remote CI both run `bun run ratchet:required`.
- An Nx-owned project-graph check first proves that every non-root project has
  exactly one `type:*` kind and every code project owns lint and typecheck
  targets. Its refusal tests run through their own Nx owner, then Nx selects
  every affected admitted target.
- The full repository Biome check, Habitat consumer integrity tests,
  repository-separation guard, and lifecycle service's live, non-cacheable
  Habitat `structure-check` complete the required result. Domain behavior tests
  remain explicit owner verification. See [[NX_AGENT_WORKFLOW]].
- Habitat evaluates the RAWR-owned positive `.habitat` topology through a
  checksum-pinned standalone Civ7 release compiled with Bun 1.4. The SDK source
  is not vendored here.
- The `Repository Ratchet` workflow publishes the job context
  `Required lint, typecheck, and topology` for pull requests, merge groups, and
  pushes to `main`.
- Protected `main` must require that exact context. Remote branch protection,
  not the bypassable local hook, is merge authority.

Scratch-first policy for mutating multi-phase commands:
- Required docs: `docs/projects/*/PLAN_SCRATCH.md` and `docs/projects/*/WORKING_PAD.md`
- Mode controls:
  - `RAWR_SCRATCH_POLICY_MODE=off|warn|block`
  - `git config rawr.scratchPolicyMode <off|warn|block>`
  - `RAWR_SKIP_SCRATCH_POLICY=1` (one-off bypass)

## Related Process Docs

- [[docs/process/WORKSTREAMS]] (Template-owned generic coordination pack)
- [[docs/process/PLUGIN_AUTONOMY_READINESS_SCORECARD]] (autonomy readiness and
  drift scorecard)
- [[docs/process/CROSS_REPO_WORKFLOWS]] (repository separation and artifact
  interfaces)
- [[docs/process/GRAPHITE]] (branch/stack workflow)

## Quarantined Runbooks

Quarantined runbooks live under `docs/process/runbooks/quarantine/`. They are preserved intact for later rewrite/mining, but are not current instructions.

Transient quarantine ledgers use `AGENTS.md` files with the marker `<!-- quarantine-ledger: true -->`.
