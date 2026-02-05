# `@rawr/security`

- Deterministic, local-first security checks + gating (v1): `bun audit`, `bun pm untrusted`, and lightweight secret scanning.
- Reports are written under `.rawr/security/` (`latest.json` + timestamped reports).
- `gateEnable()` is the activation boundary used by `rawr plugins enable …`.

## Next
- `src/index.ts` — `securityCheck()`, `gateEnable()`, report helpers + types
- `src/bin/security-check.ts` — tiny CLI wrapper (pre-commit UX)
- `test/` — Vitest suite
- `../../apps/cli/src/commands/security/AGENTS.md` — CLI UX
- `../../docs/SECURITY_MODEL.md` — policy + gate boundary

