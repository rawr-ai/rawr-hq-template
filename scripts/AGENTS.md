# Scripts

## TOC
- [Scope](#scope)
- [Boundaries](#boundaries)
- [Flow](#flow)
- [Git Hooks](#git-hooks)
- [Required Repository Check](#required-repository-check)
- [Routing](#routing)
- [Validation](#validation)

## Scope
- Applies to `scripts/**`.
- Keep scripts deterministic and fast (they often run in developer loops like hooks).

## Boundaries

- Scripts orchestrate declared owner commands; they do not become a second
  implementation of domain policy.
- Local hooks provide fast feedback. Remote branch protection remains merge
  authority.
- Habitat policy belongs in `.habitat/**`; scripts may provision and invoke
  the pinned SDK but must not duplicate its evaluator.

## Flow

- Dependency installation configures the repository-owned Git hooks.
- Pre-push invokes `bun run check`, which schedules every admitted project's
  public check once through Nx.
- The repository workflow runs the same required check before protected
  branches admit a candidate SHA.

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
  `nx run-many -t check` graph over every admitted non-root project.
- Shared Nx target defaults connect every public check to lint, typecheck,
  optional owner `verify`, Habitat `check:policy`, and dependency checks.
  Individual owners add only their qualified prerequisites: CLI owns Oclif
  source/build parity, Habitat owns structural policy, and the repository
  project owns repository admission and separation. `check:policy` is reserved
  for Habitat policy rather than behavioral aliases.
- `verify` is a narrow optional extension for deterministic required checks
  that do not reduce to lint, typecheck, or Habitat policy. It is owner-local,
  has no root aggregate, and grants no release or deployment authority.
- `habitat:check` composes owner lint, typecheck, and tests with
  `check:hygiene` and `check:policy`. `check:policy` runs one selected
  green local Habitat batch. The selected batch has exact inputs and empty
  baselines; it is not an assertion that every registered Habitat rule is
  active.
- Habitat checks are cacheable only when their Nx inputs cover every
  Git-visible tree the rule inspects. Domain behavior tests and complete owner
  checks remain explicit owner commands; they are not hidden inside merge
  admission.
- Nx derives the complete target population from the project graph. The current
  bounded admission check requires exactly one `type:*` kind and a public
  `check` on every non-root project, then requires `lint` and `typecheck` on
  every code project. Only `type:content` and `type:fixture` are exempt from
  those two code-quality targets; the root command maintains no project-name
  list.
- `.habitat/**` is RAWR HQ-Template's small, positive structural authority tree.
  It constrains declared architectural kinds and relations without expanding
  into app composition or content-repository governance.
- `scripts/habitat/release.json` pins the standalone Habitat asset by source
  provenance, byte size, and SHA-256. The Civ7 release owns the binary, which is
  compiled with Bun 1.4; this repository consumes it and does not vendor its SDK
  sources.
- `scripts/habitat/provision.mjs` accepts only the manifest-selected platform
  asset and verifies it before execution.
- The `Repository Ratchet` workflow runs for ordinary pull requests, merge
  groups, and pushes to `main`. Branch protection must require its exact job
  context, `Required lint, typecheck, and topology`.
- The Civ-style project-owned `check` composition is active. Do not add a root
  Nx project target, nested scheduler, aggregate owner, or project-name batch.
  Native Habitat project admission will replace the temporary graph reader once
  the published consumer can acquire the complete project set generically.
- Nx task ownership and cache behavior follow the
  [Nx agent workflow](../docs/process/NX_AGENT_WORKFLOW.md).

## Routing

- [Repository router](../AGENTS.md)
- [Habitat scripts router](habitat/AGENTS.md)
- [Nx scripts router](nx/AGENTS.md)
- [Docs router](../docs/AGENTS.md)

## Validation

- Keep hook output short and actionable.
- Run the focused Nx target for the script owner first.
- Run `bun run check` before pushing changes to hooks, admission, or required
  repository-check behavior.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch dependency refresh driver: `scripts/dev/auto-refresh-main.sh`.
- [Security model](../docs/system/SECURITY_MODEL.md)
