# Server (`@rawr/server`)

- Local Elysia HTTP server (health, repo state, plugin mounting, and serving enabled micro-frontend JS modules).
- Reads enabled plugin ids from `@rawr/state` (`.rawr/state/state.json`) and mounts enabled server plugins only.
- Serves micro-frontend modules at `GET /rawr/plugins/web/:dirName` for the web host shell’s dynamic `import()`.

## Next
- `src/index.ts` — boot: loads plugins + state, mounts routes, listens
- `src/rawr.ts` — `GET /rawr/state` and `GET /rawr/plugins/web/:dirName`
- `src/plugins.ts` — server plugin loader + mount contract (`registerServer` / `register`)
- `src/config.ts` — `RAWR_SERVER_PORT` / `RAWR_SERVER_BASE_URL`
- `../../plugins/AGENTS.md` — plugin ids + layouts
- `../../packages/state/AGENTS.md` — state persistence format

