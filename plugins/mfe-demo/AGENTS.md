# `@rawr/plugin-mfe-demo`

- Demo micro-frontend plugin with two integration surfaces: server + web.
- Server surface exports `registerServer(app, ctx)`; web surface exports `mount(el, ctx)`.
- This is intentionally vanilla DOM (no React) to keep the example dependency-light.

## Next
- `src/server.ts` — server integration (`registerServer`)
- `src/web.ts` — web integration (`mount`)
- `test/` — jsdom tests (`vitest --project plugin-mfe-demo`)
- `../../apps/web/src/ui/pages/MountsPage.tsx` — host-side dynamic import + lifecycle
- `../AGENTS.md` — plugin conventions + enablement boundary
