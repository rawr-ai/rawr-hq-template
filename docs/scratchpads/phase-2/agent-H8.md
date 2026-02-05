# Agent H8 scratchpad — Hardening plan: testing/CI hardening (local-first)

## Notes / principles

- Local-first testing is a security feature:
  - fast `bun run test` loops keep risk from compounding.
- CI hardening can be phased in later:
  - start with deterministic local gates and add GitHub Actions once stable.
- Add specific negative tests where it matters:
  - web module serving returns 404 when plugin is disabled
  - env exposure checks remain in `apps/web/test/env-exposure.test.ts`
