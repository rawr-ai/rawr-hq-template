# Agent H2 scratchpad — Hardening plan: secrets & env exposure

## Notes / principles

- Prevent accidental env exposure into the browser:
  - keep Bun `env=false` to avoid `.env` auto-loading surprises in Vite.
  - explicitly audit any env vars consumed by `apps/web`.
- Secrets scanning should be staged-first by default:
  - fast feedback loop; full repo scans on demand.
- Output hygiene:
  - commands should avoid dumping full env or config blobs to stdout.
  - journal should store metadata + curated snippets only (no raw stdout/stderr capture by default).
