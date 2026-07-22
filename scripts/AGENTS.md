# Scripts

## TOC
- [Scope](#scope)
- [Git Hooks](#git-hooks)
- [Repository Ratchet](#repository-ratchet)
- [Conventions](#conventions)

## Scope
- Applies to `scripts/**`.
- Keep scripts deterministic and fast (they often run in developer loops like hooks).

## Git Hooks
- Shipped hooks live in `scripts/githooks/**`.
- `scripts/githooks/post-merge` and `scripts/githooks/post-checkout` run main-branch auto-refresh:
  - refresh dependencies when needed
  - never build, select, relink, or rewrite the installed controller
- `scripts/githooks/pre-push` enforces remote safety and then runs the complete
  required repository ratchet:
  - remote must be `origin`
  - origin must match this Template repository
  - every admitted Nx lint and typecheck target must pass
  - the positive Habitat lifecycle topology must pass
- Do not ship a Template-managed path guard for personal. The repositories own
  separate trees and process configuration; there is no sync or equivalence relation.
- The root `prepare` script installs `core.hooksPath=scripts/githooks` after a
  dependency install. `--no-verify` remains a Git escape hatch, so local hooks
  are feedback only; remote branch protection is merge authority.

## Repository Ratchet
- `bun run ratchet:required` composes the required `lint`, `typecheck`, and
  lifecycle behavior, positive topology, and Habitat consumer checks. The
  lifecycle service's Nx `check` target requires production typecheck, test
  typecheck, lint, tests, and its locked Habitat structure rules.
- Root lint and typecheck use Nx's complete admitted target population. A new
  project joins the gate by declaring the corresponding Nx target; the root
  commands do not maintain a hand-written project list.
- `.habitat/**` is RAWR HQ-Template's small, positive structural authority tree.
  It closes the lifecycle service/module, command-channel, and dependency axes;
  it does not expand into app composition or content-repository governance.
- `scripts/habitat/release.json` pins the standalone Habitat asset by source
  provenance, byte size, and SHA-256. The Civ7 release owns the binary, which is
  compiled with Bun 1.4; this repository consumes it and does not vendor its SDK
  sources.
- `scripts/habitat/provision.mjs` accepts only the manifest-selected platform
  asset and verifies it before execution. `scripts/habitat/check.mjs` supplies
  the Template root and local `.habitat` policies to that immutable binary.
- The repository-ratchet workflow runs for ordinary pull requests, merge
  groups, and pushes to `main`. Branch protection must require its exact
  `Repository Ratchet / Required lint, typecheck, and topology` context.
- Nx task ownership and cache behavior follow [[docs/process/NX_AGENT_WORKFLOW]].

## Conventions
- Hook output should be short and actionable (avoid noisy logs).
- Security model reference: [[docs/system/SECURITY_MODEL]].
- Controller release installer: `scripts/dev/install-global-rawr.sh`.
- Existing-release selector: `scripts/dev/activate-global-rawr.sh`.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch dependency refresh driver: `scripts/dev/auto-refresh-main.sh`.
