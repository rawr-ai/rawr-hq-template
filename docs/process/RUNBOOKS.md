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
- Personal owns agent-plugin source, provenance, policy/evaluation inputs, and
  governed release, acceptance, and channel records. Reviewed `current-main`
  selects the exact Git and release-input identity for the canonical channel.
- The Template lifecycle verifies that selection, derives the closed release set
  in memory, and delegates provider `status`, `test`, and `sync` to native
  commands. Test callers own the explicit disposable root and provider homes;
  the service owns only its scoped projection child.
- Creation, packaging, vendor updates, and destination export remain qualified
  adjacent capabilities. They do not select a channel or create build,
  promotion, retirement, undo, or persistent local lifecycle authority.
- Private `rawr` application development uses repository-local Nx targets and
  `bun run rawr -- ...`. Habitat `0.4.1` publication and registry-installed
  smoke are complete; the private application is not a release-group member or
  installed operational surface.

Do not mix command families. App, web, and runtime composition are not lifecycle
fallbacks.

## Required Repository Check

- Local pre-push feedback runs `bun run check`. Protected remote CI runs
  `bun run ci`, one Nx invocation over the complete `build`, `check`, and
  `test` graph.
- The root command starts one Nx `check` scheduler graph over every admitted non-root
  project. Shared defaults connect each plain public check to one
  workspace-owned `habitat:lint`, project-owned typecheck, optional owner
  verification, Habitat policy, and dependency checks.
- Repository separation, Habitat topology and source law, and CLI Oclif parity
  remain qualified owner work. Habitat's inferred owner targets own the
  required Oclif structure laws and lifecycle command-channel law.
- `habitat:check` composes workspace lint and the inferred `check:policy`
  target. The package-owned Nx plugin discovers the registry, exact inputs, and
  owner graph.
- Habitat targets are cacheable only when their Nx inputs cover every
  Git-visible tree the rule inspects. Domain behavior tests remain explicit
  owner `test` targets and enter protected admission through the root `ci`
  graph. See [[NX_AGENT_WORKFLOW]].
- Habitat evaluates the RAWR-owned positive `.habitat` topology through the
  exact Template-owned `@habitat-ai/cli` npm release. Workspace source remains
  the producer, never an Nx-bootstrap fallback.
- Every current non-root project owns a public check. The installed Habitat Nx
  plugin projects registered laws into that graph; Template keeps no
  script-backed adapter or hand-maintained selector.
- Foundational project targets use `build`, `typecheck`, `test`, and `check`;
  ordinary lint has one workspace owner. Separately compiled test and tool
  sources use internal `check:test`
  and `check:tools` leaves; distinct installed or native behavior uses
  `acceptance:<capability>`. Shared Nx defaults own common dependencies and
  cache policy, and each resolved task has one command owner. See
  [[NX_AGENT_WORKFLOW#Target Vocabulary]].
- The `Repository Ratchet` workflow publishes the job context
  `Required lint, typecheck, and topology` for pull requests, merge groups, and
  pushes to `main`. That stable legacy context name is branch-protection
  identity; the admitted graph also includes builds and behavior tests.
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
