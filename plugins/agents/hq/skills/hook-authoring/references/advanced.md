# Advanced Hook Patterns

## Multi-stage gating

Prefer splitting expensive enforcement into stages:

- `PreToolUse`: lightweight guardrails and obvious-deny checks
- `Stop`: heavier validation (tests/build) before declaring done

## State and settings

If you need configuration:

- store per-project config in `.claude/<plugin>.local.md` (YAML frontmatter)
- treat it as user-owned local state and do not assume it is committed

## Performance rules

- Keep hot-path hooks fast and deterministic.
- Avoid heavy filesystem traversal.
- Avoid network calls in hooks.

## Portability rules

- Use runtime env vars when available (`CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_ENV_FILE`).
- Avoid absolute paths in hook configs and scripts.

