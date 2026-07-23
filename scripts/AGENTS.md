# Scripts

## TOC
- [Scope](#scope)
- [Boundaries](#boundaries)
- [Flow](#flow)
- [Git Hooks](#git-hooks)
- [Repository Ratchet](#repository-ratchet)
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
- Pre-push invokes the required repository ratchet, which delegates admitted
  work to Nx, Biome, and the provisioned Habitat SDK.
- The repository workflow runs the same required ratchet before protected
  branches admit a candidate SHA.

## Git Hooks
- Shipped hooks live in `scripts/githooks/**`.
- `scripts/githooks/post-merge` and `scripts/githooks/post-checkout` run main-branch auto-refresh:
  - refresh dependencies when needed
  - never install, update, or relink the global CLI
- `scripts/githooks/pre-push` enforces remote safety and then runs the complete
  required repository ratchet:
  - remote must be `origin`
  - origin must match this Template repository
  - every non-root project must declare exactly one `type:*` kind
  - every code project must own lint and typecheck targets unless its one kind
    classifies it as content or a fixture
  - the Nx admission refusal tests must pass
  - every affected admitted Nx lint and typecheck target must pass
  - repository-wide Biome formatting, lint, and import organization must pass
  - the Habitat consumer's manifest and provisioning tests must pass
  - repository separation must pass
  - the positive Habitat lifecycle topology must pass against the live tree
- Do not ship a Template-managed path guard for personal. The repositories own
  separate trees and process configuration; there is no sync or equivalence relation.
- The root `prepare` script installs `core.hooksPath=scripts/githooks` after a
  dependency install. `--no-verify` remains a Git escape hatch, so local hooks
  are feedback only; remote branch protection is merge authority.

## Repository Ratchet
- `bun run ratchet:required` validates the Nx project population, runs the Nx
  admission refusal tests, runs affected `lint` and `typecheck`, runs the full
  repository Biome check, verifies the Habitat consumer, enforces repository
  separation, and evaluates the lifecycle service's Habitat `structure-check`.
  Habitat checks are cacheable only when their Nx inputs cover every
  Git-visible tree the rule inspects. Domain behavior tests and complete owner
  checks remain explicit owner commands; they are not hidden inside merge
  admission.
- Nx derives the affected target population from the project graph. A positive
  graph law requires exactly one `type:*` kind on every non-root project, then
  requires `lint` and `typecheck` on every code project. Only `type:content` and
  `type:fixture` are exempt from those targets; the root command maintains no
  project-name list.
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
- Run `bun run ratchet:required` before pushing changes to hooks, admission, or
  repository ratchet behavior.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch dependency refresh driver: `scripts/dev/auto-refresh-main.sh`.
- [Security model](../docs/system/SECURITY_MODEL.md)
