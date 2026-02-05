# Web host shell (`@rawr/web`)

- Minimal React 19 + Vite host shell for RAWR HQ (client-side routing + micro-frontend mounting demo).
- Expects server routes: `GET /rawr/state` and `GET /rawr/plugins/web/:dirName` (proxied in dev via Vite).
- Micro-frontends must export `mount(el, ctx)` (contract is `@rawr/ui-sdk`).

## Next
- `vite.config.ts` — dev proxy to the server (`/rawr/*`)
- `src/ui/pages/MountsPage.tsx` — dynamic `import()` + mount lifecycle
- `src/ui/App.tsx` — shell layout + routes
- `../../packages/ui-sdk/AGENTS.md` — mount contract types
- `../../apps/server/AGENTS.md` — server endpoints this app consumes

