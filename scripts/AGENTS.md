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
- `scripts/githooks/pre-commit` runs staged-only security checks:
  - primary: `rawr security check --staged`
  - fallback: `packages/security` bin if `rawr` isn’t available
- `scripts/githooks/post-merge` and `scripts/githooks/post-checkout` run main-branch auto-refresh:
  - refresh dependencies when needed
  - refresh Bun-global `rawr` symlink only when this checkout is the active owner
  - run a CLI smoke check (`rawr --version`)
- `scripts/githooks/pre-push` enforces cross-repo remote safety:
  - remote must be `origin`
  - origin must match template repo expectation (`rawr-hq-template`)
- To enable repo-local hooks:
  - `git config core.hooksPath scripts/githooks`

## Conventions
- Hook output should be short and actionable (avoid noisy logs).
- Security model reference: `docs/SECURITY_MODEL.md`.
- Global CLI installer: `scripts/dev/install-global-rawr.sh`.
- Global CLI owner activation: `scripts/dev/activate-global-rawr.sh`.
- Remote verifier: `scripts/dev/check-remotes.sh`.
- Main-branch auto-refresh driver: `scripts/dev/auto-refresh-main.sh`.
