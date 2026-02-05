# Apps

- Runtime surfaces: CLI (`rawr`), local server, web host shell.
- Start everything: `bun run dev` (or `bun run rawr -- dev up`).
- App code should consume shared logic via `@rawr/*` packages (don’t reach into other apps’ internals).

## Next
- `cli/AGENTS.md` — oclif CLI + journaling
- `server/AGENTS.md` — Elysia server + plugin mounting
- `web/AGENTS.md` — React+Vite host shell + micro-frontends

