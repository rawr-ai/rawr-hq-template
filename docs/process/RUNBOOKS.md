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

## Required Repository Check

- Local pre-push feedback and remote CI both run `bun run check`.
- The root command starts one Nx `check` graph over every admitted non-root
  project. Shared defaults connect each plain public check to lint, typecheck,
  optional owner verification, Habitat policy, and dependency checks.
- Repository project admission and separation, Habitat policy, and CLI Oclif
  parity remain qualified owner work. Habitat's selected policy batch owns the
  required Oclif structure laws and lifecycle command-channel law.
- `habitat:check` composes Habitat-owner lint, typecheck, and tests with
  `check:hygiene` and `check:policy`. The policy target runs one
  selected green local rule batch with empty baselines. Registered rules with
  known live-corpus failures are not yet part of the required batch.
- Habitat targets are cacheable only when their Nx inputs cover every
  Git-visible tree the rule inspects. Domain behavior tests remain explicit
  owner verification. See [[NX_AGENT_WORKFLOW]].
- Habitat evaluates the RAWR-owned positive `.habitat` topology through a
  checksum-pinned standalone Civ7 release compiled with Bun 1.4. The SDK source
  is not vendored here.
- Every non-root project now owns a public check, and bounded graph admission
  rejects a new project without one. Native Habitat project admission replaces
  that temporary graph reader after the upgraded artifact is published.
- Foundational project targets use `build`, `lint`, `typecheck`, `test`, and
  `check`. Separately compiled test and tool sources use internal `check:test`
  and `check:tools` leaves; distinct installed or native behavior uses
  `acceptance:<capability>`. Shared Nx defaults own common dependencies and
  cache policy, and each resolved task has one command owner. See
  [[NX_AGENT_WORKFLOW#Target Vocabulary]].
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
