# Agent H5 scratchpad — Hardening plan: logging/journaling redaction policy

## Notes / principles

- Journal should be “helpful by default, safe by default”:
  - store metadata and curated snippets, not raw logs.
  - keep snippets small (preview <= ~200 chars; body compact).
- Add retention and GC policy early:
  - keep last N snippets/events; vacuum sqlite when needed.
- Redaction direction:
  - do not store tokens, secrets, or full env dumps.
  - add “never store” categories to docs + future lint rules.
