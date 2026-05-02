---
name: plugin-maintenance
description: |
  This skill should be used when the user asks about "plugin maintenance", "update plugin scripts", "scan compactions", "session extractor flags", "why isn't this script in codex", "add a new cli arg to a script", or needs guidance on creating, modifying, or debugging local HQ plugin scripts and safely syncing script changes through RAWR plugin sync.
---

# Plugin Maintenance

This skill is a safety/workflow guide for evolving RAWR plugin scripts while keeping the repo as canonical and provider homes as generated outputs.

## Core invariants

- Author in the RAWR HQ source workspace.
- Treat `${CODEX_HOME:-~/.codex-rawr}/` as the active Codex runtime home.
- Treat mirror homes as explicit sync destinations only when passed through `--codex-home`, `RAWR_AGENT_SYNC_CODEX_HOMES`, or sync config.
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

4) Sync generated provider outputs:
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync all --json`

5) Verify the generated result:
- `python3 ${CODEX_HOME:-~/.codex-rawr}/scripts/meta--<script>.py --help`
- Re-run the smoke test via the mirrored entrypoint.

## When adding new CLI behavior

- Prefer flags over implicit behavior changes.
- Update the relevant usage docs in:
  - `~/.claude/plugins/local/plugins/meta/commands/introspect.md`
  - `~/.claude/plugins/local/plugins/meta/skills/introspect/references/workflow.md`

## Session-tooling conventions (recommended)

- `meta--extract_session.py`: session listing + transcript extraction + content search.
- `meta--scan_compactions.py`: compaction-only facts (non-dialog events) and compaction-specific listings.
