# Scripts

## TOC
- [Purpose](#purpose)
- [Scope](#scope)
- [Boundaries](#boundaries)
- [Behavior](#behavior)
- [Concepts](#concepts)
- [Flow](#flow)
- [Interfaces](#interfaces)
- [Git Hooks](#git-hooks)
- [Required Repository Check](#required-repository-check)
- [Routing](#routing)
- [Validation](#validation)

## Purpose

- Automate deterministic repository operations and quality orchestration while
  leaving product and structural policy with their declared owners.

## Scope
- Applies to `scripts/**`.
- Keep scripts deterministic and fast (they often run in developer loops like hooks).

## Boundaries

- Scripts orchestrate declared owner commands; they do not become a second
  implementation of domain policy.
- Local hooks provide fast feedback. Remote branch protection remains merge
  authority.
- Habitat policy belongs in `.habitat/**`; the installed `@habitat/cli` package
  and its Nx plugin own discovery, acquisition, and evaluation. Scripts must
  not duplicate those responsibilities.

## Behavior

- Scripts translate a checked repository event or explicit operator command
  into a bounded owner command, preserve actionable failures, and avoid
  creating alternate implementations.

## Concepts

- A **script owner** is the project whose target the script serves. A **local
  feedback gate** catches problems before push; **merge authority** remains
  the protected remote workflow.

## Flow

- Dependency installation configures the repository-owned Git hooks.
- Pre-push invokes `bun run check`, which schedules every admitted project's
  public check once through Nx.
- Pull requests run `bun run ci:affected` against the exact checked-out merge
  candidate, so Nx selects the complete affected `build`, `check`, and `test`
  graph before `main` admits that candidate.
- Merge-queue candidates, when used, and pushes to `main` run the full
  `bun run ci` graph as repository-wide settlement.

## Interfaces

- Bun and Nx targets are the command interface; Git hooks and CI are event
  interfaces; Habitat and owner-local checks return the validation outcomes
  that scripts relay.

## Git Hooks
- Shipped hooks live in `scripts/githooks/**`.
- `scripts/githooks/post-merge` and `scripts/githooks/post-checkout` run main-branch auto-refresh:
  - refresh dependencies when needed
  - never install, update, or relink the global CLI
- `scripts/githooks/pre-push` enforces remote safety and then runs the complete
  required repository check:
  - remote must be `origin`
  - origin must match this Template repository
  - every admitted project check and its declared prerequisites must pass
- Do not ship a Template-managed path guard for personal. The repositories own
  separate trees and process configuration; there is no sync or equivalence relation.
- The root `prepare` script installs `core.hooksPath=scripts/githooks` after a
  dependency install. `--no-verify` remains a Git escape hatch, so local hooks
  are feedback only; remote branch protection is merge authority.

## Required Repository Check
- `bun run check` is the public required command. It invokes one
  `nx run-many -t check` scheduler graph over every admitted non-root project.
- Shared Nx target defaults connect every public check to the single
  workspace-owned `habitat:lint`, project-owned typecheck, optional owner
  `verify`, Habitat `check:policy`, and dependency checks.
  Individual owners add only their qualified prerequisites: CLI owns Oclif
  source/build parity, while Habitat owns structural, repository-script, and
  source policy. `check:policy` is reserved for Habitat policy rather than
  behavioral aliases.
- `verify` is a narrow optional extension for deterministic required checks
  that do not reduce to lint, typecheck, or Habitat policy. It is owner-local,
  has no root aggregate, and grants no release or deployment authority.
- `habitat:check` composes workspace lint and the inferred owner-local
  `check:policy` target. Habitat's Nx plugin derives rule selection, exact
  inputs, caching, and dependencies from the registry. Candidate packets under
  `.habitat/staged/**` remain reviewable without registering unfinished laws in
  the admission graph.
- Habitat checks are cacheable only when their Nx inputs cover every
  Git-visible tree the rule inspects. Domain behavior tests and complete owner
  checks remain explicit owner commands; the protected `ci` graph schedules
  the ordinary `test` targets without hiding them inside `check`.
- Nx derives the complete target population from the project graph. The root
  scheduler maintains no project-name list; project targets remain ordinary Nx
  configuration rather than a second Habitat runner implemented in JavaScript.
- `.habitat/**` is RAWR HQ-Template's small, positive structural authority
  tree. It constrains declared architectural kinds and relations, including
  the closed `scripts/` mechanics root, without expanding into app composition
  or content-repository governance.
- The root `lint` script routes directly to `habitat:lint`. That target owns
  ordinary repository-wide source lint once. It does not encode topology or
  source relationships; those remain native Habitat `structure.toml` and
  `pattern.md` laws.
- `package.json` and `bun.lock` pin the portable Habitat package release and
  integrity. Template consumes that package and does not vendor its SDK source
  or maintain another executable selector.
- The `Repository Ratchet` workflow runs for ordinary pull requests, merge
  groups, and pushes to `main`. Branch protection must require its exact job
  context, `Required lint, typecheck, and topology`. The context name is stable
  legacy identity; the workflow also admits builds and behavior tests.
- The Civ-style project-owned `check` composition is active. Do not add a root
  Nx project target, nested scheduler, aggregate owner, or project-name batch.
  Project targets are ordinary Nx configuration; the installed Habitat Nx
  plugin owns policy projection without a manual adapter.
- Nx task ownership and cache behavior follow the
  [Nx agent workflow](../docs/process/NX_AGENT_WORKFLOW.md).

## Routing

- [Repository router](../AGENTS.md)
- [Habitat scripts router](habitat/AGENTS.md)
- [Docs router](../docs/AGENTS.md)

## Validation

- Keep hook output short and actionable.
- Run the focused Nx target for the script owner first.
- Run `bun run check` before pushing changes to hooks, admission, or required
  repository-check behavior.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch dependency refresh driver: `scripts/dev/auto-refresh-main.sh`.
- [Security model](../docs/system/SECURITY_MODEL.md)
