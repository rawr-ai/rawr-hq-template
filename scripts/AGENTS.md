# Scripts

## TOC
- [Scope](#scope)
- [Git Hooks](#git-hooks)
- [Conventions](#conventions)

## Scope
- Applies to `scripts/**`.
- Keep scripts deterministic and fast (they often run in developer loops like hooks).

## Git Hooks
- Shipped hooks live in `scripts/githooks/**`.
- `scripts/githooks/post-merge` and `scripts/githooks/post-checkout` run main-branch auto-refresh:
  - refresh dependencies when needed
  - never build, select, relink, or rewrite the installed controller
- `scripts/githooks/pre-push` enforces cross-repo remote safety:
  - remote must be `origin`
  - origin must match this Template repository
- Do not ship a Template-managed path guard for personal. The repositories own
  separate trees and process configuration; there is no sync or equivalence relation.
- To enable repo-local hooks:
  - `git config core.hooksPath scripts/githooks`

## Conventions
- Hook output should be short and actionable (avoid noisy logs).
- Security model reference: `docs/system/SECURITY_MODEL.md`.
- Controller release installer: `scripts/dev/install-global-rawr.sh`.
- Existing-release selector: `scripts/dev/activate-global-rawr.sh`.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch dependency refresh driver: `scripts/dev/auto-refresh-main.sh`.
