# @rawr/security

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Security gating for repos: dependency audit (Bun), untrusted dependency scripts (Bun), and lightweight secret scanning.
- Writes reports to `.rawr/security/` (`latest.json` + timestamped reports).

## Entry points
- `src/index.ts`: `securityCheck`, `gateEnable`, `getSecurityReport` + exported `types` from `src/types.ts`.
- `src/audit.ts`: Bun audit wrapper (`runBunAudit`).
- `src/untrusted.ts`: Bun `pm untrusted` wrapper (`runBunPmUntrusted`).
- `src/secrets.ts`: `scanSecretsRepo`, `scanSecretsStaged`, `DEFAULT_SECRET_PATTERNS`.
- `src/report.ts`: `writeSecurityReport` (caps/truncates large reports).
- `src/bin/security-check.ts`: tiny CLI wrapper around `securityCheck` (pre-commit style output).

## Tests
- `test/security.test.ts` (Vitest).

## Consumers
- `apps/cli` (`@rawr/cli`).

