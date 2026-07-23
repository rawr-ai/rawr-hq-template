# RAWR HQ-Template Router

## Scope

- Applies repo-wide when a deeper `AGENTS.md` is not present.

## Nx First Hop

- Nx is first-class in this repo. Use the official Nx skills and the Nx CLI before ad hoc file exploration.
- Start workspace/navigation questions with:
  - `bunx nx show projects`
  - `bunx nx show project <project-name> --json`
  - `bunx nx graph`
- If your downstream agent environment has the official Nx skills installed globally, use them as companion guidance with the Nx CLI.
- Use Nx for workspace/project truth, this AGENTS lattice for routing/ownership truth, and Narsil for source/symbol/reference truth.
- Do not add or rely on repo-local `.mcp.json` or repo `CLAUDE.md` here.

## Boundaries

- `RAWR HQ-Template` owns the executable Oclif CLI, official commands, provider
  adapters, generic lifecycle services, schemas/tooling implementations, and
  generic validators.
- Personal `RAWR HQ` owns curated agent-plugin content, vendor provenance,
  declarative policy/evaluation inputs, and its own governed release/channel records.
- The repositories are independent. Do not merge, cherry-pick, transplant, mirror, or
  preserve Template executable paths in personal.
- Cross-repository use is limited to explicit versioned data interfaces and
  ordinary package artifacts. A Personal repository path is a Git content
  locator, never CLI installation identity, executable ancestry, or code-sharing
  authority.
- Use [the repository destination guide](AGENTS_SPLIT.md) first for
  Template-vs-personal destination decisions.

## Command Surface Policy

- External CLI plugin channel: `rawr plugins ...`
- Curated agent-plugin lifecycle channel: `rawr agent plugins ...`
- App, web, and runtime composition are outside these lifecycle command
  surfaces and must not become a fallback owner for either one.
- Do not mix these command surfaces in guidance or examples.

## Flow

- Use Nx to locate the owning project, then follow the nearest `AGENTS.md`
  inward before reading implementation details.
- Oclif routes commands into their owning packages and services; concrete
  filesystem and provider effects stay behind their declared resources.
- Template tooling may read Personal through explicit data interfaces, but no
  executable implementation or repository authority crosses that boundary.
- Repository changes move through Graphite and the required repository check
  before branch protection admits them to `main`.

## Graphite Requirement

- Graphite is required in this repo.
- Trunk must remain `main` (`gt trunk`).
- Follow [the Graphite branch and stack workflow](docs/process/GRAPHITE.md).
- `bun install` configures the repository-owned hooks. Before a push, the local
  hook runs `bun run check`. The root command schedules every admitted
  non-root project's public `check` once through Nx. Shared defaults connect
  those checks to foundational quality, optional owner verification, Habitat
  policy, and dependency checks. The repository, Habitat, and CLI each retain
  their qualified work. Oclif structure laws and the lifecycle command-channel
  law run inside Habitat's selected policy batch.
- `verify` is the optional owner-local extension for deterministic checks that
  do not reduce to lint, typecheck, or Habitat policy. It is not release,
  deployment, or acceptance authority and has no root aggregate.
- `habitat:check` composes the Habitat owner's lint, typecheck, and tests with
  `check:hygiene` and `check:policy`. The policy target currently runs one
  selected green local rule batch; it does not claim that every Habitat rule is
  active.
- The ordinary `pull_request`, `merge_group`, and `push`-to-`main` workflow
  named `Repository Ratchet` publishes the job context
  `Required lint, typecheck, and topology` for the candidate SHA. Remote branch
  protection requiring that exact job context is merge authority; the local
  pre-push pass is fast feedback, not merge authority.

## Routing

- [Repository destination guide](AGENTS_SPLIT.md) for "where should this
  change land?" (Template vs personal).
- [Apps router](apps/AGENTS.md) for runtime surfaces (`cli`, `hq`, `server`,
  `web`).
- [Packages router](packages/AGENTS.md) for shared libraries and dependency
  direction.
- [Plugins router](plugins/AGENTS.md) for plugin package contracts and
  enablement.
- [Scripts router](scripts/AGENTS.md) for hook and script conventions.
- [Docs router](docs/AGENTS.md) for canonical documentation entrypoints.
- [Nx agent workflow](docs/process/NX_AGENT_WORKFLOW.md) for the integrated Nx
  CLI, Nx skills, and Narsil posture.

## Process Runbooks

- CLI/plugin path index (start here):
  [Runbooks](docs/process/RUNBOOKS.md).
- Nx-first agent workflow:
  [Nx agent workflow](docs/process/NX_AGENT_WORKFLOW.md).
- Graphite stack drain loop:
  [Stack drain loop](docs/process/runbooks/STACK_DRAIN_LOOP.md).
- Repository separation and artifact-interface workflow:
  [Cross-repository workflows](docs/process/CROSS_REPO_WORKFLOWS.md).
- Graphite-first branch and stack operations:
  [Graphite workflow](docs/process/GRAPHITE.md).
- Ongoing doc and process health cadence:
  [Maintenance cadence](docs/process/MAINTENANCE_CADENCE.md).
- Operational usage conventions:
  [HQ usage](docs/process/HQ_USAGE.md) and
  [HQ operations](docs/process/HQ_OPERATIONS.md).
- Documentation architecture contract: [Docs architecture](docs/DOCS.md).
- Quarantined docs live under `quarantine/` directories and are provenance only.

## Validation

- Use `bunx nx show project <project-name> --json` to confirm project truth
  before selecting checks.
- Run the owning project's focused lint, typecheck, test, or build targets.
- Before pushing, run `bun run check`; remote branch protection is the final
  merge authority.
- The Civ-style all-project `check` graph is active. Do not add a root Nx
  project target, nested scheduler, aggregate owner, or project-name batch.
