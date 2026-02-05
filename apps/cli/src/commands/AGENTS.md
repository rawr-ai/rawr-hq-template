# CLI commands (`apps/cli/src/commands`)

- Command ids map to paths:
  - `src/commands/<topic>/<name>.ts` → `rawr <topic> <name>`
  - `src/commands/<name>.ts` → `rawr <name>` (top-level commands like `doctor`, `reflect`)
- Prefer `RawrCommand` + `outputResult()` for stable UX, especially when `--json` is used.
- Topics are grouped by subsystem (journal, plugins, security, routine, workflow, factory, dev).

## Next
- `dev/AGENTS.md` — `rawr dev up` (start dev stack)
- `factory/AGENTS.md` — generators for new commands/plugins/workflows
- `journal/AGENTS.md` — journal query UX (`tail`, `search`, `show`)
- `plugins/AGENTS.md` — plugin list/enable/disable/status
- `routine/AGENTS.md` — dev hygiene loop (`check`, `snapshot`, `start`)
- `security/AGENTS.md` — security commands (`check`, `report`, `posture`)
- `tools/AGENTS.md` — `tools export` (command catalog)
- `workflow/AGENTS.md` — higher-level workflows (`harden`, `forge-command`, `demo-mfe`)
- `doctor.ts` — repo wiring sanity check
- `reflect.ts` — journal-driven suggestions (CLI-facing “assistant”)

