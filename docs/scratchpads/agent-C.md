# Scratchpad — Agent C (Security)

## Scope

- `packages/security/**`
- `scripts/githooks/**`
- `docs/SECURITY_MODEL.md`

## MVP behavior

- `securityCheck({ mode })` runs:
  - `bun audit --json`
  - `bun pm untrusted`
  - secret scan (staged or full repo)
- Writes `.rawr/security/latest.json` + timestamped report
- `gateEnable({ pluginId, riskTolerance, mode })` blocks above tolerance

## Notes

- Kept secret patterns intentionally small and high-signal to avoid noise.
- LLM judge remains parked per `docs/spikes/SPIKE_LLM_RISK_JUDGE.md`.

