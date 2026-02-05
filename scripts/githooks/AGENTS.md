# Git hooks (`scripts/githooks`)

- Repo-shipped Git hooks (opt-in via `git config core.hooksPath scripts/githooks`).
- Hooks should be fast and have short, actionable output (developer loop).

## Next
- `pre-commit` — runs `rawr security check --staged` (fallback: `packages/security` bin)
- `../../docs/SECURITY_MODEL.md` — what the hook is enforcing

