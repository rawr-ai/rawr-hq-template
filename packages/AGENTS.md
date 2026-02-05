# Packages

- Shared libraries consumed by `apps/*` and `plugins/*` (`@rawr/*` workspace deps).
- Public API should flow through `src/index.ts` + `package.json#exports` (keep them aligned).
- Keep dependency direction clean: `packages/*` must not depend on `apps/*`.

## Next
- `core/AGENTS.md` — `RawrCommand` + CLI output contract
- `journal/AGENTS.md` — `.rawr/journal` + sqlite search index
- `security/AGENTS.md` — deterministic security checks + enablement gate
- `state/AGENTS.md` — `.rawr/state/state.json` persistence
- `ui-sdk/AGENTS.md` — micro-frontend mount contract
- `test-utils/AGENTS.md` — helpers for integration tests

