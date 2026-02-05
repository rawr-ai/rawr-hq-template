# CLI library (`apps/cli/src/lib`)

- Shared helpers for commands: workspace root detection, plugin enumeration, subprocess wiring, factory scaffolding.
- Most command topics depend on `findWorkspaceRoot()` (workspace root = directory with `package.json` + `plugins/`).
- Keep helpers small and dependency-light (they run in CLI hot paths).

## Next
- `workspace-plugins.ts` — `findWorkspaceRoot()`, `listWorkspacePlugins()`, id resolution
- `subprocess.ts` — CLI entrypoint resolution + step runner
- `factory.ts` — scaffolding (commands / plugins / workflows) + tools export updater
- `security.ts` — lazy-load `@rawr/security` and error helpers
- `journal-context.ts` — per-run journaling context (artifacts/steps)

