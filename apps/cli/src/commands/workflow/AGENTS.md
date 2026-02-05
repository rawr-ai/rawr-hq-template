# `rawr workflow …`

- Higher-level “do the thing” commands that compose lower-level primitives.
- Should be dry-run friendly and journal their outcome (workflow snippet) when possible.
- Prefer calling existing commands or shared library functions over duplicating logic.

## Next
- `harden.ts` — snapshot + security + posture workflow
- `forge-command.ts` — generate a new command via the factory
- `demo-mfe.ts` — enable/build/verify micro-frontend demo plugin
- `../factory/AGENTS.md` — scaffolding primitives
- `../plugins/AGENTS.md` — enablement boundary

