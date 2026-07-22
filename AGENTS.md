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

## Repo Role Boundary

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
- Use [[AGENTS_SPLIT|the repository destination guide]] first for
  Template-vs-personal destination decisions.

## Command Surface Policy

- External CLI plugin channel: `rawr plugins ...`
- Curated agent-plugin lifecycle channel: `rawr agent plugins ...`
- App, web, and runtime composition are outside these lifecycle command
  surfaces and must not become a fallback owner for either one.
- Do not mix these command surfaces in guidance or examples.

## Graphite Requirement

- Graphite is required in this repo.
- Trunk must remain `main` (`gt trunk`).
- Follow [[docs/process/GRAPHITE|the Graphite branch and stack workflow]].
- `bun install` configures the repository-owned hooks. Before a push, the local
  hook runs the required repository ratchet: every admitted Nx lint and
  typecheck target plus the positive Habitat lifecycle topology check.
- The ordinary `pull_request`, `merge_group`, and `push`-to-`main` workflow
  publishes `Repository Ratchet / Required lint, typecheck, and topology` for
  the candidate SHA. Remote branch protection requiring that check is merge
  authority; the local pre-push pass is fast feedback, not proof.

## Routing

- [[AGENTS_SPLIT]] for "where should this change land?" (Template vs personal).
- [[apps/AGENTS]] for runtime surfaces (`cli`, `server`, `web`).
- [[packages/AGENTS]] for shared libraries and dependency direction.
- [[plugins/AGENTS]] for plugin package contracts and enablement.
- [[scripts/AGENTS]] for hook/script conventions.
- [[docs/AGENTS]] for canonical documentation entrypoints.
- [[docs/process/NX_AGENT_WORKFLOW]] for the integrated Nx CLI / Nx skills /
  Narsil posture, plus the deferred note on a future hosted Nx integration.

## Process Runbooks

- CLI/plugin path index (start here): [[docs/process/RUNBOOKS]].
- Nx-first agent workflow: [[docs/process/NX_AGENT_WORKFLOW]].
- Graphite stack drain loop: [[docs/process/runbooks/STACK_DRAIN_LOOP]].
- Repository separation and artifact-interface workflow:
  [[docs/process/CROSS_REPO_WORKFLOWS]].
- Graphite-first branch/stack operations: [[docs/process/GRAPHITE]].
- Ongoing doc/process health cadence: [[docs/process/MAINTENANCE_CADENCE]].
- Operational usage conventions: [[docs/process/HQ_USAGE]] and
  [[docs/process/HQ_OPERATIONS]].
- Documentation architecture contract: [[docs/DOCS]].
- Quarantined docs live under `quarantine/` directories and are provenance only.
