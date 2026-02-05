# Agent H6 scratchpad — Hardening plan: install/enable lifecycle + provenance

## Notes / principles

- Treat `plugins enable` as a persistent activation boundary:
  - state must survive restarts and drive server/web behavior.
- Provenance requirements:
  - when enablement is forced, require `--yes` + a human reason
  - record gate output summary hashes and timestamps (append-only log)
- Lifecycle hooks:
  - `enable → build → mount` should be verifiable and journaled as atomic snippets.
