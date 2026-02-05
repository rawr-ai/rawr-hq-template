# Agent H7 scratchpad — Hardening plan: server/web surface hardening

## Notes / principles

- “Enabled-only” is the core invariant:
  - server mounts enabled server plugins only
  - server serves enabled web modules only
- Keep serving endpoints conservative:
  - strict `dirName` allowlist (kebab-case)
  - path traversal safe
  - `cache-control: no-store`
- Consider security headers later (plan-only for v0), and keep endpoints small and inspectable.
