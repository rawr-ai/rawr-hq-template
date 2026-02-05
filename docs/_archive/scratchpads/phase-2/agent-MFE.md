# Agent MFE scratchpad — Micro-frontend demo plugin

## Ownership
- `plugins/mfe-demo/**`
- `apps/server/**` web module serving endpoint
- `apps/web/**` Mounts page dynamic import + mounting

## Notes / decisions

- Demo plugin lives at `plugins/mfe-demo` (`@rawr/plugin-mfe-demo`):
  - `src/server.ts` registers `/mfe-demo/health`
  - `src/web.ts` exports `mount(el, ctx)` using vanilla DOM for robustness
- Server exposes:
  - `GET /rawr/plugins/web/:dirName` → enabled-only JS module serving (no-store)
  - `GET /rawr/state` → enabled plugin list
- Web Mounts page:
  - fetches `/rawr/state`
  - dynamically imports `/rawr/plugins/web/<dirName>`
  - calls `mount(container, ctx)` per enabled plugin
- Dev proxy is configured in `apps/web/vite.config.ts` for `/rawr → http://localhost:3000`.
