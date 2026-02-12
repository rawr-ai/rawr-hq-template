---
name: plugin-maintenance
description: |
  This skill should be used when the user asks about "plugin maintenance", "update plugin scripts", "scan compactions", "session extractor flags", "sync_to_codex", "why isn't this script in codex", "add a new cli arg to a script", or needs guidance on creating, modifying, or debugging local HQ plugin scripts and safely syncing script changes from Claude plugins to Codex mirrors.
---

# Plugin Maintenance (Claude -> Codex)

This skill is a safety/workflow guide for evolving the `meta` plugin’s scripts while keeping Claude’s plugin tree as canonical and Codex as a synced mirror.

## Core invariants

- Author in `~/.claude/plugins/local/plugins/meta/` (canonical).
- Treat `${CODEX_HOME:-~/.codex-rawr}/` as the primary active target (fork in this workspace).
- Treat `${CODEX_MIRROR_HOME:-~/.codex}/` as the optional upstream mirror target.
- `CODEX_FORK_HOME` is a legacy/alias variable for explicit fork targeting and is typically the same as `CODEX_HOME` here.
- Avoid cross-script imports in Codex mirrors: scripts sync to names like `meta--*.py` (hyphens), which are not import-friendly. Prefer self-contained scripts.

## Quick workflow (safe default)

1) Locate the canonical script:
- `~/.claude/plugins/local/plugins/meta/scripts/extract_session.py`
- `~/.claude/plugins/local/plugins/meta/scripts/scan_compactions.py`
- `~/.claude/plugins/local/plugins/meta/scripts/extract_content.py`

2) Make the smallest change that solves the problem.

3) Validate locally:
- `python3 -m py_compile ~/.claude/plugins/local/plugins/meta/scripts/<script>.py`
- Run a tiny smoke test command for the code path you changed.

4) Sync to Codex mirrors (writes to mirrors):
- `CODEX_HOME=${CODEX_HOME:-~/.codex-rawr} python3 ~/.claude/plugins/local/plugins/meta/scripts/sync_to_codex.py --mirror-home ${CODEX_MIRROR_HOME:-~/.codex}`

5) Verify the mirror result:
- `python3 ${CODEX_HOME:-~/.codex-rawr}/scripts/meta--<script>.py --help`
- `python3 ${CODEX_MIRROR_HOME:-~/.codex}/scripts/meta--<script>.py --help`
- Re-run the smoke test via the mirrored entrypoint.

## When adding new CLI behavior

- Prefer flags over implicit behavior changes.
- Update the relevant usage docs in:
  - `~/.claude/plugins/local/plugins/meta/commands/introspect.md`
  - `~/.claude/plugins/local/plugins/meta/skills/introspect/references/workflow.md`

## Session-tooling conventions (recommended)

- `meta--extract_session.py`: session listing + transcript extraction + content search.
- `meta--scan_compactions.py`: compaction-only facts (non-dialog events) and compaction-specific listings.
