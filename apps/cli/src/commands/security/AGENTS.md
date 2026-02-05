# `rawr security …`

- Deterministic security checks + reports for local-first execution (v1).
- `security check` runs `@rawr/security.securityCheck` (staged or repo scan).
- Reports land under `.rawr/security/` and are referenced by enablement gating.

## Next
- `check.ts` — run checks (staged or repo)
- `report.ts` — show latest report packet
- `posture.ts` — write a posture summary packet (human-readable)
- `../../../../packages/security/AGENTS.md` — implementation + report formats
- `../../../../docs/SECURITY_MODEL.md` — policy + gate boundary

