# Habitat Platform Router

## Purpose

- Orient work in the Habitat platform repository and keep platform machinery,
  the downstream Rawr app, and Marketplace content with their exact owners.

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

- Habitat owns the platform SDK, foundational Oclif CLI, runtime, adapters,
  generic services/resources, schemas, tooling, blueprints, and validators.
- Rawr is the first downstream app built on Habitat. Its domain services,
  plugins, topics, profiles, and composition live in its independent product
  repository and consume released Habitat interfaces.
- Marketplace (legacy repository locator `RAWR HQ`) owns curated agent-plugin content, vendor provenance,
  declarative policy/evaluation inputs, and its own governed release/channel records.
- Habitat, Rawr, and Marketplace are independent repositories. No executable
  implementation or repository ownership crosses their boundaries.
- Cross-repository use is limited to explicit versioned data interfaces and
  ordinary package artifacts. A Marketplace repository path is a Git content
  locator, never CLI installation identity or executable ancestry.
- Use [the repository destination guide](AGENTS_SPLIT.md) first for
  Habitat-vs-Rawr-vs-Marketplace destination decisions.

## Behavior

- Repository work starts by resolving the owning Nx project and nearest
  product boundary, then follows that boundary's public contract rather than
  treating directory proximity as authority.
- Command, service, plugin, and resource changes preserve the distinct
  operator channels and the explicit handoffs between policy and mechanics.

## Concepts

- **Habitat** is the reusable platform and substrate. **Rawr** is a downstream
  product app. **Marketplace** is a separate curated-content repository
  connected only through declared data and package interfaces.
- An **owning project** is the Nx project responsible for a capability and its
  checks. A **command channel** is an operator-facing namespace with one
  lifecycle owner.

## Command Surface Policy

- Current external CLI plugin channel: `habitat plugins ...`
- Curated agent-plugin lifecycle belongs to `habitat agent plugins
  check|package|status|sync|test|vendors update`, projected by the app-selected
  private `@habitat-ai/plugin-agent-plugins` topic through its one managed service.
- Generic development operations belong to `habitat dev repo sync-upstream`,
  `habitat dev stack doctor|drain`, and `habitat dev worktree cleanup`, projected
  by the selected private dev topic. Stack drain requests a native Graphite merge;
  actual completion and the one native cleanup sweep remain operator-owned.
- No Rawr alias or premature Habitat route is admitted.
- Product composition, web hosts, and runtime mounting consume these lifecycle
  commands and cannot own either channel.
- Do not mix these command surfaces in guidance or examples.

## Flow

- Use Nx to locate the owning project, then follow the nearest `AGENTS.md`
  inward before reading implementation details.
- Oclif routes commands into their owning packages and services; concrete
  filesystem and provider effects stay behind their declared resources.
- Habitat or Rawr tooling may read Marketplace through explicit data interfaces, but no
  executable implementation or repository authority crosses that boundary.
- Repository changes move through Graphite and the required repository check
  before branch protection admits them to `main`.

## Interfaces

- Nx supplies workspace and target truth; the AGENTS lattice supplies product
  ownership and navigation; package exports and service contracts supply
  executable boundaries.
- Versioned data records and ordinary package artifacts are the only admitted
  cross-repository interfaces. Graphite and the repository check form the
  change-admission interface.

## Graphite Requirement

- Graphite is required in this repo.
- Trunk must remain `main` (`gt trunk`).
- Follow [the Graphite branch and stack workflow](docs/process/GRAPHITE.md).
- `bun install` configures the repository-owned hooks. Before a push, the local
  hook runs `bun run check`. The root command schedules every admitted
  non-root project's public `check` once through one Nx scheduler graph. Shared defaults connect
  those checks to one workspace-owned `habitat:lint`, project-owned typecheck,
  optional owner verification, Habitat policy, and dependency checks. The
  repository, Habitat, and CLI each retain their qualified work. The installed
  `@habitat-ai/cli` Nx plugin discovers registered laws and infers cacheable rule
  targets plus owner-local `check:policy` composition. No root script maintains
  a second rule list.
- `verify` is the optional owner-local extension for deterministic checks that
  do not reduce to lint, typecheck, or Habitat policy. It is not release,
  deployment, or acceptance authority and has no root aggregate.
- `habitat:check` composes workspace lint and the inferred Habitat policy
  target. Codex Stop delegates to `habitat hook agent-stop`, which selects the
  registered hook rules through the same selected policy package and repository
  selection records; it does
  not schedule lint or the complete repository graph.
- The ordinary `pull_request`, `merge_group`, and `push`-to-`main` workflow
  named `Repository Ratchet` publishes the job context
  `Required lint, typecheck, and topology` for the candidate SHA. Remote branch
  protection requiring that exact job context is merge authority; the local
  pre-push pass is fast feedback, not merge authority.

## Routing

- [Repository destination guide](AGENTS_SPLIT.md) for "where should this
  change land?" (Habitat vs Rawr vs Marketplace).
- [Apps router](apps/AGENTS.md) for the foundational Habitat CLI package source.
- [Packages router](packages/AGENTS.md) for shared libraries and dependency
  direction.
- [Services router](services/AGENTS.md) for sealed domain capability suites,
  module ownership, and context flow.
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
- Documentation architecture contract: [Docs architecture](docs/DOCS.md).
- Quarantined docs live under `quarantine/` directories and are provenance only.

## Validation

- Use `bunx nx show project <project-name> --json` to confirm project truth
  before selecting checks.
- Run workspace lint plus the owning project's focused typecheck, test, or
  build targets.
- Before pushing, run `bun run check`; remote branch protection is the final
  merge authority.
- The Civ-style all-project `check` graph is active. Do not add a root Nx
  project target, nested scheduler, aggregate owner, or project-name batch.
- `bun run lint` routes to the one workspace lint owner. ESLint is not a
  structural authority; topology belongs in `structure.toml` and source law in
  Habitat `pattern.md` packets.
