# Agent H4 scratchpad — Hardening plan: execution boundaries (fs/network/exec)

## Notes / principles

- Reality check: local plugins run with the same OS privileges as the CLI/server process.
- Until sandboxing exists, compensate with:
  - explicit gates on enable/install/exec
  - clear dry-run previews for mutation
  - provenance logs for “who did what”
- Bound execution surfaces:
  - prefer spawning known binaries (`bun`, `node`) with explicit argv
  - avoid shell strings; avoid implicit PATH surprises where feasible.
