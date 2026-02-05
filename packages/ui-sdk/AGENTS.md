# `@rawr/ui-sdk`

- Minimal micro-frontend mounting contract: plugins export `mount(el, ctx)`; host shell owns lifecycle.
- Keep this package tree-shakeable and side-effect free (it’s imported by web host + plugins).

## Next
- `src/index.ts` — contract types + `defineMicroFrontend()`
- `test/` — Vitest suite
- `../../apps/web/AGENTS.md` — primary consumer
- `../../plugins/mfe-demo/AGENTS.md` — example producer

