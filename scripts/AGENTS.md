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
  - ensure Bun-global `rawr` symlink is correct
  - run a CLI smoke check (`rawr --version`)
- To enable repo-local hooks:
  - `git config core.hooksPath scripts/githooks`

## Conventions
- Hook output should be short and actionable (avoid noisy logs).
- Security model reference: `docs/SECURITY_MODEL.md`.
- Global CLI installer: `scripts/dev/install-global-rawr.sh`.
- Main-branch auto-refresh driver: `scripts/dev/auto-refresh-main.sh`.
