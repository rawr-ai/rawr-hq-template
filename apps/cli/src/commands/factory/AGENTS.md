# `rawr factory …`

- Scaffolding for durable CLI surface area (generates new commands/plugins/workflows).
- Default behavior is “create-only” (won’t overwrite existing files); supports `--dry-run`.
- Generated artifacts should include at least a minimal Vitest check (where applicable).

## Next
- `command/new.ts` — `rawr factory command new <topic> <name>`
- `workflow/new.ts` — `rawr factory workflow new <name>`
- `plugin/new.ts` — `rawr factory plugin new <dirName>`
- `../../lib/factory.ts` — renderers + write planner (source of truth)

