# @rawr/plugin-mfe-demo

## TOC
- [Scope](#scope)
- [What This Plugin Is](#what-this-plugin-is)
- [Runtime Exports](#runtime-exports)
- [Build And Test](#build-and-test)
- [Layout](#layout)

## Scope
- Applies to `plugins/web/mfe-demo/**`.

## What This Plugin Is
- Demo “micro-frontend” style plugin package.
- Intentionally uses **vanilla DOM** (no React) for a small, dependency-light example.

## Runtime Exports
- `src/server.ts`: `registerServer(app, ctx)` to attach server routes.
- `src/web.ts`: `mount(el, ctx)` to attach UI into an existing DOM element.
- Keep exports stable and side-effect free at import time (assume host controls lifecycle).

## Build And Test
- From repo root:
  - `turbo run build --filter=@rawr/plugin-mfe-demo`
  - `vitest run --project plugin-mfe-demo`
- Tests run in `jsdom` (see root `vitest.config.ts`).

## Layout
- `src/server.ts`: server integration surface
- `src/web.ts`: web integration surface
- `test/**`: Vitest tests
- `dist/**`: compiled output
